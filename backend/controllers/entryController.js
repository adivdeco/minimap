const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Plan = require('../models/Plan');
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

// --- CONFIGURATION ---
const MAX_DAILY_CHECKINS = 3;

// --- HELPER: Get Today's Usage Stats (With Session) ---
async function getDailyStats(userId, libraryId, session) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await Attendance.findOne({
        userId,
        libraryId,
        date: today
    }).session(session);

    if (!record) {
        return { minutesUsed: 0, sessionsCount: 0 };
    }

    return {
        minutesUsed: record.totalDurationToday || 0,
        sessionsCount: record.sessionCount || 0
    };
}

// --- HELPER: Resolve Plan Details ---
async function resolvePlan(planId, library) {
    let plan = await Plan.findById(planId);
    if (!plan && library.plans && library.plans.length > 0) {
        plan = library.plans.id(planId);
    }
    return plan;
}

// --- HELPER: Centralized catch handler for AppError ---
function handleAppError(err, res, fallbackMsg = 'Server Error') {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, msg: err.message });
    }
    res.status(500).json({ success: false, msg: fallbackMsg });
}

// ==========================================
// 1. CORE LOGIC: ASSIGN SEAT (Unified)
// ==========================================
/**
 * Assigns a seat to a user — either a specific reserved seat or a random available one.
 * @param {Object}  library        - Library document
 * @param {ObjectId} userId        - User being seated
 * @param {Object}  subscription   - Active subscription doc
 * @param {Object}  dailyStats     - { minutesUsed, sessionsCount }
 * @param {Object}  session        - Mongoose transaction session
 * @param {Object}  [reservedSeatDoc=null] - If provided, assigns this reserved seat instead of a random one
 */
async function assignSeat(library, userId, subscription, dailyStats, session, reservedSeatDoc = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get Plan Limits
    const planDoc = await resolvePlan(subscription.planId, library);
    let hoursPerDay = (planDoc && planDoc.hoursPerDay) ? planDoc.hoursPerDay : 5;

    // 2. Calculate Remaining Time
    const maxMinutes = hoursPerDay * 60;
    const usedMinutes = dailyStats.minutesUsed;
    let remainingMinutes = maxMinutes - usedMinutes;

    if (remainingMinutes <= 0) {
        throw new AppError(
            `Daily Quota Exceeded! You used ${Math.floor(usedMinutes / 60)}h ${usedMinutes % 60}m of your ${hoursPerDay}h limit.`,
            403, 'LIMIT'
        );
    }

    const expectedEndTime = new Date(Date.now() + remainingMinutes * 60000);

    // 3. Acquire Seat — reserved path vs random path
    let seat;
    if (reservedSeatDoc) {
        // Lock the specific reserved seat
        seat = await Seat.findOneAndUpdate(
            { _id: reservedSeatDoc._id, status: 'Reserved' },
            {
                status: 'Occupied',
                currentOccupant: userId,
                occupiedSince: new Date(),
                expectedEndTime: expectedEndTime
            },
            { new: true, session }
        );
        if (!seat) {
            throw new AppError('Could not claim reserved seat. It might no longer be reserved.', 409, 'RACE');
        }
    } else {
        // Find a random available seat
        const randomSeatResult = await Seat.aggregate([
            { $match: { libraryId: library._id, status: 'Available' } },
            { $sample: { size: 1 } }
        ]).session(session);

        if (!randomSeatResult || randomSeatResult.length === 0) {
            throw new AppError('Library is full! No seats available.', 400, 'FULL');
        }

        // Lock it atomically
        seat = await Seat.findOneAndUpdate(
            { _id: randomSeatResult[0]._id, status: 'Available' },
            {
                status: 'Occupied',
                currentOccupant: userId,
                occupiedSince: new Date(),
                expectedEndTime: expectedEndTime
            },
            { new: true, session }
        );
        if (!seat) {
            throw new AppError('Seat was taken just before you confirmed. Please try again.', 409, 'RACE');
        }
    }

    // 4. Update Attendance Bucket
    const attendanceDoc = await Attendance.findOneAndUpdate(
        { userId, libraryId: library._id, date: today },
        {
            $push: {
                sessions: {
                    seatNumber: seat.seatNumber,
                    checkInTime: new Date(),
                    checkOutTime: null,
                    durationMinutes: 0
                }
            },
            $inc: { sessionCount: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
    );

    // 5. Update User Context
    await User.findByIdAndUpdate(userId, {
        $set: {
            'studentDetails.assignedSeat': {
                seatId: seat._id,
                seatNumber: seat.seatNumber,
                checkInTime: new Date(),
                expectedEndTime: expectedEndTime
            },
            'studentDetails.currentSubscription': {
                subscriptionId: subscription._id,
                libraryId: library._id,
                planId: subscription.planId,
                startDate: subscription.startDate,
                expiryDate: subscription.expiryDate,
                status: 'active'
            },
            $addToSet: { attendanceHistory: attendanceDoc._id }
        }
    }, { session });

    // 6. Side Effect: Invalidate Cache
    authMiddleware.invalidateUserCache(userId);

    // 7. Return Success Data
    const rHours = Math.floor(remainingMinutes / 60);
    const rMins = Math.floor(remainingMinutes % 60);
    const isReserved = !!reservedSeatDoc;

    return {
        seat: seat.seatNumber,
        checkinsRemaining: MAX_DAILY_CHECKINS - (dailyStats.sessionsCount + 1),
        maxDailyCheckins: MAX_DAILY_CHECKINS,
        remainingTime: { hours: rHours, minutes: rMins },
        msg: isReserved
            ? `Checked In to your Reserved Seat: ${seat.seatNumber}`
            : `Checked In! Assigned Seat: ${seat.seatNumber}`
    };
}

// ==========================================
// 2. CONTROLLER: CHECK-IN
// ==========================================
exports.checkIn = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { qrCodeString } = req.body;
        const userId = req.user._id;

        // 1. Identify Library
        const library = await Library.findOne({ 'accessConfig.qrCodeData': qrCodeString }).session(session);
        if (!library) throw new AppError('Invalid QR Code', 404, 'NOT_FOUND');

        // 2. Prevent Double Entry
        const existingSeat = await Seat.findOne({ currentOccupant: userId }).session(session);
        if (existingSeat) throw new AppError(`You are already seated at ${existingSeat.seatNumber}.`, 400, 'BAD_REQUEST');

        // 3. Security Check: Daily Limits
        const dailyStats = await getDailyStats(userId, library._id, session);
        if (dailyStats.sessionsCount >= MAX_DAILY_CHECKINS) {
            throw new AppError(`Daily entry limit reached (${MAX_DAILY_CHECKINS} times/day).`, 403, 'LIMIT');
        }

        // 4. Check Subscription
        let activeSub = await Subscription.findOne({
            userId,
            libraryId: library._id,
            status: 'active',
            expiryDate: { $gt: new Date() }
        }).session(session);

        // --- CHECK GRACE PERIOD ---
        if (!activeSub) {
            const graceSub = await Subscription.findOne({
                userId,
                libraryId: library._id,
                gracePeriodAllowed: true
            }).sort({ createdAt: -1 }).session(session);

            if (graceSub) {
                const now = new Date();
                const graceStart = graceSub.graceStartDate || now; // fallback
                const graceEnd = new Date(graceStart.getTime() + graceSub.graceDaysAllowed * 24 * 60 * 60 * 1000);

                if (now <= graceEnd) {
                    activeSub = graceSub; // Treat grace period sub as active for check-in
                }
            }
        }

        // --- SCENARIO A: VALID SUBSCRIPTION ---
        if (activeSub) {
            // First, see if they have a reserved seat right now
            const today = new Date();
            const todayMidnight = new Date(today);
            todayMidnight.setHours(0, 0, 0, 0);

            const currentTimeStr = today.toTimeString().substring(0, 5); // "HH:MM"

            const userReservedSeat = await Seat.findOne({
                libraryId: library._id,
                status: 'Reserved',
                reservedBy: userId
            }).session(session);

            let isReservedForNow = false;

            if (userReservedSeat) {
                if (userReservedSeat.reservationType === 'FullDay') {
                    // FullDay now means permanent until cancelled
                    isReservedForNow = true;
                } else if (userReservedSeat.reservationType === 'TimeSlot') {
                    // TimeSlot is now a permanently recurring daily reservation
                    for (const slot of userReservedSeat.reservedTimeSlots) {
                        if (currentTimeStr >= slot.startTime && currentTimeStr <= slot.endTime) {
                            isReservedForNow = true;
                            break;
                        }
                    }
                }
            }

            let resultData;
            if (isReservedForNow) {
                resultData = await assignSeat(library, userId, activeSub, dailyStats, session, userReservedSeat);
            } else {
                resultData = await assignSeat(library, userId, activeSub, dailyStats, session);
            }

            await session.commitTransaction();
            return res.json({ success: true, ...resultData });
        }

        // --- SCENARIO B: NO SUBSCRIPTION (READ-ONLY Logic) ---
        // We abort transaction here because we are just showing plans, not writing data
        await session.abortTransaction();

        const history = await Subscription.exists({ userId, libraryId: library._id }); // No session needed now

        if (history) {
            return res.status(200).json({
                success: false,
                action: 'SHOW_PLANS',
                libraryId: library._id,
                plans: library.plans,
                msg: "Your subscription has expired. Please renew to enter."
            });
        }

        const trialPlan = library.plans.find(p => p.trialDays > 0);
        if (trialPlan) {
            return res.status(200).json({
                success: false,
                action: 'OFFER_TRIAL',
                libraryId: library._id,
                planId: trialPlan._id,
                trialDays: trialPlan.trialDays,
                msg: `Welcome! You are eligible for a ${trialPlan.trialDays}-Day Free Trial.`
            });
        }

        return res.status(200).json({
            success: false,
            action: 'SHOW_PLANS',
            libraryId: library._id,
            plans: library.plans,
            msg: "Welcome! Please choose a plan to start."
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("CheckIn Transaction Failed:", err.message);
        handleAppError(err, res, 'Server Error during Check-in');
    } finally {
        session.endSession();
    }
};

// ==========================================
// 3. CONTROLLER: ACTIVATE TRIAL
// ==========================================
exports.activateTrial = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { libraryId, planId } = req.body;
        const userId = req.user._id;

        const history = await Subscription.exists({ userId, libraryId }).session(session);
        if (history) throw new AppError('Trial already used.', 400, 'BAD_REQUEST');

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        const plan = await resolvePlan(planId, library);
        if (!plan || !plan.trialDays || plan.trialDays <= 0) throw new AppError('Invalid Trial Plan', 400, 'BAD_REQUEST');

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.trialDays);

        // Create Subscription
        const [newSub] = await Subscription.create([{
            userId,
            libraryId,
            planId: plan._id,
            planName: `Free Trial - ${plan.name || plan.title}`,
            pricePaid: 0,
            startDate: new Date(),
            expiryDate: expiryDate,
            status: 'active'
        }], { session: session });

        // Check In (Stats are 0 for new user)
        const resultData = await assignSeat(library, userId, newSub, { minutesUsed: 0, sessionsCount: 0 }, session);

        await session.commitTransaction();
        res.json({ success: true, ...resultData });

    } catch (err) {
        await session.abortTransaction();
        console.error("Activate Trial Error:", err.message);
        handleAppError(err, res, 'Failed to activate trial');
    } finally {
        session.endSession();
    }
};

// ==========================================
// 4. CONTROLLER: CHECK-OUT (Transactional)
// ==========================================
exports.checkOut = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        // 1. Get current seat
        const seat = await Seat.findOne({ currentOccupant: userId }).session(session);
        if (!seat) throw new AppError('You are not currently checked in.', 400, 'BAD_REQUEST');

        const checkOutTime = new Date();

        // 2. Calculate Duration
        let durationMinutes = 0;
        if (seat.occupiedSince) {
            durationMinutes = Math.round((checkOutTime - seat.occupiedSince) / 60000);
        }
        if (durationMinutes < 1) durationMinutes = 1;

        // 3. Release Seat
        let newStatus = 'Available';
        if (seat.reservedBy && seat.reservationType) {
            newStatus = 'Reserved';
        }

        await Seat.findByIdAndUpdate(seat._id, {
            status: newStatus,
            currentOccupant: null,
            occupiedSince: null,
            expectedEndTime: null
        }, { session });

        // 4. Update Attendance
        const bucketDate = new Date(seat.occupiedSince || new Date());
        bucketDate.setHours(0, 0, 0, 0);

        await Attendance.findOneAndUpdate(
            {
                userId,
                libraryId: seat.libraryId,
                date: bucketDate,
                "sessions.checkOutTime": null
            },
            {
                $set: {
                    "sessions.$.checkOutTime": checkOutTime,
                    "sessions.$.durationMinutes": durationMinutes
                },
                $inc: { totalDurationToday: durationMinutes }
            },
            { session }
        );

        // 5. Clear User Context
        await User.findByIdAndUpdate(userId, {
            'studentDetails.assignedSeat': null
        }, { session });

        authMiddleware.invalidateUserCache(userId);

        // 6. Get Updated Stats for Response (Within Session)
        const dailyStats = await getDailyStats(userId, seat.libraryId, session);

        // Get subscription for limits
        const activeSub = await Subscription.findOne({
            userId,
            libraryId: seat.libraryId,
            status: 'active'
        }).session(session);

        let hoursPerDay = 5;
        if (activeSub) {
            const planDoc = await resolvePlan(activeSub.planId, { _id: seat.libraryId });
            if (planDoc && planDoc.hoursPerDay) hoursPerDay = planDoc.hoursPerDay;
        }

        const remainingMinutes = Math.max(0, (hoursPerDay * 60) - dailyStats.minutesUsed);

        await session.commitTransaction();

        res.json({
            success: true,
            msg: `Checked out successfully. Session: ${durationMinutes} mins.`,
            checkinsRemaining: MAX_DAILY_CHECKINS - dailyStats.sessionsCount,
            maxDailyCheckins: MAX_DAILY_CHECKINS,
            remainingTime: {
                hours: Math.floor(remainingMinutes / 60),
                minutes: Math.floor(remainingMinutes % 60)
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("CheckOut Error:", err);
        handleAppError(err, res, 'Server Error during checkout');
    } finally {
        session.endSession();
    }
};

// ==========================================
// 5. OFFLINE PAYMENT (Transactional)
// ==========================================
exports.activateSubscriptionOffline = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { userId, libraryId, planId, pricePaid, startDate, endDate } = req.body;
        const adminId = req.user._id;
        const adminRole = req.user.role;

        if (!userId || !libraryId || !planId) throw new AppError('Missing required fields', 400, 'BAD_REQUEST');

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        const isAdmin = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' && library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

        const user = await User.findById(userId).session(session);
        if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

        const plan = await resolvePlan(planId, library);
        if (!plan) throw new AppError('Plan not found', 404, 'NOT_FOUND');

        const existingActiveSub = await Subscription.findOne({
            userId,
            libraryId,
            status: 'active',
            expiryDate: { $gt: new Date() }
        }).session(session);

        if (existingActiveSub) throw new AppError('User already has an active subscription', 400, 'BAD_REQUEST');

        // --- GRACE PERIOD DEDUCTION ---
        const graceSub = await Subscription.findOne({
            userId,
            libraryId,
            gracePeriodAllowed: true
        }).sort({ createdAt: -1 }).session(session);

        let graceDaysToDeduct = 0;
        if (graceSub && !graceSub.graceDaysUsed) {
            const now = new Date();
            const graceStart = graceSub.graceStartDate || now;
            const msUsed = now.getTime() - graceStart.getTime();
            let daysUsed = Math.ceil(msUsed / (1000 * 60 * 60 * 24));

            if (daysUsed > graceSub.graceDaysAllowed) daysUsed = graceSub.graceDaysAllowed;
            if (daysUsed < 0) daysUsed = 0;

            graceDaysToDeduct = daysUsed;

            // Mark grace period as accounted for
            graceSub.graceDaysUsed = daysUsed;
            graceSub.gracePeriodAllowed = false;
            await graceSub.save({ session });
        }

        const subStartDate = startDate ? new Date(startDate) : new Date();
        let expiryDate;
        
        if (endDate) {
            expiryDate = new Date(endDate);
        } else {
            expiryDate = new Date(subStartDate);
            let finalDuration = plan.durationInDays - graceDaysToDeduct;
            if (finalDuration < 1) finalDuration = 1; // Allow minimum 1 day if grace period ate up the whole plan
            expiryDate.setDate(expiryDate.getDate() + finalDuration);
        }

        const [newSub] = await Subscription.create([{
            userId,
            libraryId,
            planId: plan._id,
            planName: plan.name || plan.title,
            pricePaid: pricePaid || plan.price || 0,
            startDate: subStartDate,
            expiryDate: expiryDate,
            status: 'active',
            paymentId: `OFFLINE-${Date.now()}`
        }], { session });

        await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'studentDetails.currentSubscription': {
                        subscriptionId: newSub._id,
                        libraryId: library._id,
                        planId: plan._id,
                        startDate: subStartDate,
                        expiryDate: expiryDate,
                        status: 'active'
                    }
                }
            },
            { new: true, session }
        );

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            msg: "Subscription activated successfully (Offline Payment)",
            subscription: newSub
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("Offline Sub Error:", err);
        handleAppError(err, res, 'Failed to activate subscription');
    } finally {
        session.endSession();
    }
};

// ==========================================
// 6. CANCEL/DELETE SUBSCRIPTION (Admin)
// ==========================================
exports.deleteSubscription = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { libraryId, subscriptionId } = req.params;
        const adminId = req.user._id;
        const adminRole = req.user.role;

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        const isAdmin = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' && library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

        const subscription = await Subscription.findById(subscriptionId).session(session);
        if (!subscription) throw new AppError('Subscription not found', 404, 'NOT_FOUND');
        if (subscription.libraryId.toString() !== libraryId.toString()) {
            throw new AppError('Subscription does not belong to this library', 400, 'BAD_REQUEST');
        }

        const userId = subscription.userId;

        // Delete the subscription
        await Subscription.findByIdAndDelete(subscriptionId).session(session);

        // Update user if they are currently active with this subscription
        const user = await User.findById(userId).session(session);
        if (user && user.studentDetails?.currentSubscription?.subscriptionId?.toString() === subscriptionId.toString()) {
            user.studentDetails.currentSubscription = null;
            await user.save({ session });
        }

        // We do not cancel the seat here since this is just subscription payment removal.
        // It will expire/check-out normally or the admin can evict them manually if needed.

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            msg: "Subscription canceled successfully"
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("Delete Sub Error:", err);
        handleAppError(err, res, 'Failed to cancel subscription');
    } finally {
        session.endSession();
    }
};

// ==========================================
// 7. AUTO-RELEASE CRON JOB
// ==========================================
// Keeping this outside transaction for now to avoid locking the entire DB collection
// Individual seat releases could be transactionalized if strictness is needed.
const releaseExpiredSeats = async () => {
    try {
        const now = new Date();
        const expiredSeats = await Seat.find({
            status: 'Occupied',
            expectedEndTime: { $lt: now }
        });

        if (expiredSeats.length === 0) return { releasedCount: 0 };

        let releasedCount = 0;

        const seatOps = [];
        const attendanceOps = [];
        const userOps = [];

        for (const seat of expiredSeats) {
            try {
                if (!seat.currentOccupant) {
                    seatOps.push({
                        updateOne: {
                            filter: { _id: seat._id },
                            update: {
                                $set: {
                                    status: 'Available',
                                    occupiedSince: null,
                                    expectedEndTime: null
                                }
                            }
                        }
                    });
                    releasedCount++;
                    continue;
                }

                const userId = seat.currentOccupant;
                const checkOutTime = now;

                let durationMinutes = 0;
                if (seat.occupiedSince) {
                    durationMinutes = Math.round((checkOutTime - seat.occupiedSince) / 60000);
                }

                const bucketDate = new Date(seat.occupiedSince || now);
                bucketDate.setHours(0, 0, 0, 0);

                // Queue Attendance Update
                attendanceOps.push({
                    updateOne: {
                        filter: {
                            userId: userId,
                            libraryId: seat.libraryId,
                            date: bucketDate,
                            "sessions.checkOutTime": null
                        },
                        update: {
                            $set: {
                                "sessions.$.checkOutTime": checkOutTime,
                                "sessions.$.durationMinutes": durationMinutes
                            },
                            $inc: { totalDurationToday: durationMinutes }
                        }
                    }
                });

                // Queue User Unassignment
                userOps.push({
                    updateOne: {
                        filter: { _id: userId },
                        update: {
                            $set: { 'studentDetails.assignedSeat': null }
                        }
                    }
                });

                // Invalidate Cache (Side effect, safe to do in memory)
                authMiddleware.invalidateUserCache(userId);

                // Determine Seat Status
                let nextStatus = 'Available';
                if (seat.reservedBy && seat.reservationType) {
                    nextStatus = 'Reserved'; // Restore reservation
                }

                // Queue Seat Update
                seatOps.push({
                    updateOne: {
                        filter: { _id: seat._id },
                        update: {
                            $set: {
                                status: nextStatus,
                                currentOccupant: null,
                                occupiedSince: null,
                                expectedEndTime: null
                            }
                        }
                    }
                });

                releasedCount++;
            } catch (innerErr) {
                console.error(`Failed to prepare release for seat ${seat.seatNumber}:`, innerErr);
            }
        }

        // Execute Bulk Operations (Extremely fast, reduces locking)
        if (attendanceOps.length > 0) {
            await Attendance.bulkWrite(attendanceOps);
        }
        if (userOps.length > 0) {
            await User.bulkWrite(userOps);
        }
        if (seatOps.length > 0) {
            await Seat.bulkWrite(seatOps);
        }

        return { releasedCount, message: `Released ${releasedCount} expired seats` };

    } catch (err) {
        console.error("Auto Release Logic Error:", err);
        throw err;
    }
};

exports.releaseExpiredSeats = releaseExpiredSeats;
exports.autoReleaseSeats = async (req, res) => {
    try {
        const result = await releaseExpiredSeats();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ message: "Auto release failed" });
    }
};

exports.getAttendanceHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Fetch total count of user's attendance records to detect missing migration
        const totalAttendanceCount = await Attendance.countDocuments({ userId });

        // 2. Try Optimized Fetch
        const user = await User.findById(userId)
            .populate({
                path: 'attendanceHistory',
                select: 'date totalDurationToday sessionCount sessions -_id',
                options: { sort: { date: -1 } }
            })
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, msg: "User not found" });
        }

        // 3. Check if Optimized Data Contains EVERYTHING
        if (user.attendanceHistory && user.attendanceHistory.length === totalAttendanceCount && totalAttendanceCount > 0) {
            return res.json({ success: true, history: user.attendanceHistory });
        }

        // 4. Fallback: Missing data detected. Fetch full history directly from collection.
        const history = await Attendance.find(
            { userId },
            { date: 1, totalDurationToday: 1, sessionCount: 1, sessions: 1 }
        ).sort({ date: -1 });

        // 5. Self-Healing: Sync ALL records to User Record (overwrite to ensure completeness & order)
        if (history.length > 0) {
            const attendanceIds = history.map(h => h._id);
            await User.findByIdAndUpdate(userId, {
                $set: { attendanceHistory: attendanceIds }
            });
        }

        res.json({ success: true, history });

    } catch (err) {
        console.error("Get History Error:", err);
        res.status(500).json({ success: false, msg: "Failed to fetch history" });
    }
};

// ==========================================
// 7. CONTROLLER: GRANT GRACE PERIOD
// ==========================================
exports.grantGracePeriod = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { libraryId, subscriptionId } = req.params;
        const { graceDays } = req.body;
        const adminId = req.user._id;
        const adminRole = req.user.role;

        if (!graceDays || graceDays <= 0) {
            throw new AppError('Invalid grace days', 400, 'BAD_REQUEST');
        }

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        const isAdmin = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' && library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) throw new AppError('Unauthorized to grant grace period', 403, 'FORBIDDEN');

        const subscription = await Subscription.findById(subscriptionId).session(session);
        if (!subscription) throw new AppError('Subscription not found', 404, 'NOT_FOUND');

        if (subscription.libraryId.toString() !== libraryId.toString()) {
            throw new AppError('Subscription does not belong to this library', 400, 'BAD_REQUEST');
        }

        if (subscription.expiryDate > new Date()) {
            throw new AppError('Cannot grant grace period to an active subscription', 400, 'BAD_REQUEST');
        }

        subscription.gracePeriodAllowed = true;
        subscription.graceDaysAllowed = Number(graceDays);
        if (!subscription.graceStartDate) {
            subscription.graceStartDate = new Date();
        }
        // Only reset used days if this is a fresh grace period grant
        if (!subscription.graceDaysUsed) {
            subscription.graceDaysUsed = 0;
        }
        subscription.status = 'expired';

        await subscription.save({ session });

        await User.findByIdAndUpdate(
            subscription.userId,
            {
                $set: {
                    'studentDetails.currentSubscription': {
                        subscriptionId: subscription._id,
                        libraryId: library._id,
                        planId: subscription.planId,
                        startDate: subscription.startDate,
                        expiryDate: subscription.expiryDate,
                        status: 'expired'
                    }
                }
            },
            { session }
        );

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            msg: `Successfully granted ${graceDays} days of grace period.`,
            subscription
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("Grant Grace Period Error:", err);
        handleAppError(err, res, 'Failed to grant grace period');
    } finally {
        session.endSession();
    }
};