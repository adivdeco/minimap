const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Plan = require('../models/Plan');
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// --- CONFIGURATION ---
const MAX_DAILY_CHECKINS = 3;

// --- HELPER: Get Today's Usage Stats ---
async function getDailyStats(userId, libraryId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await Attendance.findOne({
        userId,
        libraryId,
        date: today
    });

    if (!record) {
        return { minutesUsed: 0, sessionsCount: 0 };
    }

    return {
        minutesUsed: record.totalDurationToday || 0,
        sessionsCount: record.sessionCount || 0
    };
}

// --- HELPER: Resolve Plan Details (Handles Embedded vs Standalone) ---
async function resolvePlan(planId, library) {
    // 1. Try finding in standalone Plan collection
    let plan = await Plan.findById(planId);

    // 2. If not found, look in Library's embedded plans
    if (!plan && library.plans && library.plans.length > 0) {
        plan = library.plans.id(planId);
    }

    return plan;
}

// ==========================================
// 1. CHECK-IN CONTROLLER
// ==========================================
exports.checkIn = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { qrCodeString } = req.body;
        const userId = req.finduser._id;

        // 1. Identify Library (Read operation - can be outside transaction or inside)
        const library = await Library.findOne({ 'accessConfig.qrCodeData': qrCodeString }).session(session);
        if (!library) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, msg: "Invalid QR Code" });
        }

        // 2. Prevent Double Entry (User already sitting?)
        const existingSeat = await Seat.findOne({ currentOccupant: userId }).session(session);
        if (existingSeat) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                msg: `You are already seated at ${existingSeat.seatNumber}. Please checkout first.`
            });
        }

        // 3. Security Check: Daily Limits
        const dailyStats = await getDailyStats(userId, library._id); // Helper reads Attendance, should ideally pass session too if we want full isolation, but read-only is OK for checking stats usually.
        // NOTE: getDailyStats doesn't take session. It's a read.
        // If strict consistency is required, we should pass session to getDailyStats too.
        // For now, let's leave getDailyStats as is or update it.
        // To be safe, let's update getDailyStats to accept session or just use it without session (Read Committed is default).

        if (dailyStats.sessionsCount >= MAX_DAILY_CHECKINS) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                msg: `Daily entry limit reached (${MAX_DAILY_CHECKINS} times/day). See you tomorrow!`
            });
        }

        // 4. Check for ACTIVE Subscription
        // We look for a Subscription document that is active and not expired
        const activeSub = await Subscription.findOne({
            userId,
            libraryId: library._id,
            status: 'active',
            expiryDate: { $gt: new Date() }
        }).session(session);

        // --- SCENARIO A: USER HAS VALID SUBSCRIPTION ---
        if (activeSub) {
            // Pass the full activeSub object so we can link IDs correctly
            const result = await assignSeat(library, userId, activeSub, res, dailyStats, session);
            if (result.success) {
                await session.commitTransaction();
                return res.json(result.data);
            } else {
                await session.abortTransaction();
                // Response already sent by assignSeat on error
                return;
            }
        }

        // --- SCENARIO B: NO ACTIVE SUBSCRIPTION (CHECK FOR TRIAL ELIGIBILITY) ---

        // Check if they ever had a subscription (even expired/cancelled)
        const history = await Subscription.exists({ userId, libraryId: library._id }).session(session);

        // If they have history, they are NOT eligible for a trial -> Show Plans
        if (history) {
            await session.abortTransaction();
            return res.status(200).json({
                success: false,
                action: 'SHOW_PLANS',
                libraryId: library._id,
                plans: library.plans, // Send real plans
                msg: "Your subscription has expired. Please renew to enter."
            });
        }

        // If no history, find a Trial Plan in this library
        // We look in embedded plans first as trials are usually specific to library config
        const trialPlan = library.plans.find(p => p.trialDays > 0);

        if (trialPlan) {
            await session.abortTransaction(); // No writes needed here
            return res.status(200).json({
                success: false,
                action: 'OFFER_TRIAL', // Frontend should show "Start Free Trial" button
                libraryId: library._id,
                planId: trialPlan._id,
                trialDays: trialPlan.trialDays,
                msg: `Welcome! You are eligible for a ${trialPlan.trialDays}-Day Free Trial.`
            });
        }

        // No history, but no trial plan exists
        await session.abortTransaction();
        return res.status(200).json({
            success: false,
            action: 'SHOW_PLANS',
            libraryId: library._id,
            plans: library.plans, // Send real plans
            msg: "Welcome! Please choose a plan to start."
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("CheckIn Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, msg: "Server Error during Check-in" });
        }
    } finally {
        session.endSession();
    }
};

// ==========================================
// 2. ASSIGN SEAT LOGIC (Centralized)
// ==========================================
/**
 * @returns {Promise<{success: boolean, response: object}>} Returns an object forcing the caller to handle the response formatting
 */
async function assignSeat(library, userId, subscription, res, dailyStats = { minutesUsed: 0 }, session) {
    // NOTE: We do NOT send `res` response here anymore. We return data.
    // BUT we need to match the signature or update calls.
    // To make it easy, we will return a structure that the caller can use to send `res`.
    // Actually, passing `res` and returning the response object is weird.
    // Let's change the return type to be { error?: {code, msg}, data?: {...} }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get Plan Details (Hours per day limit)
    const planDoc = await resolvePlan(subscription.planId, library);

    // Default to 5 hours if plan not found or limit not set
    let hoursPerDay = (planDoc && planDoc.hoursPerDay) ? planDoc.hoursPerDay : 5;

    // 2. Calculate Remaining Time
    const maxMinutes = hoursPerDay * 60;
    const usedMinutes = dailyStats.minutesUsed;
    let remainingMinutes = maxMinutes - usedMinutes;

    if (remainingMinutes <= 0) {
        // Return error structure
        res.status(403).json({
            success: false,
            msg: `Daily Quota Exceeded! You used ${Math.floor(usedMinutes / 60)}h ${usedMinutes % 60}m of your ${hoursPerDay}h limit.`
        });
        return { success: false };
    }

    const expectedEndTime = new Date(Date.now() + remainingMinutes * 60000);

    // 3. Find an Available Seat
    // Using aggregation for random selection prevents "always picking Seat 1"
    const randomSeatResult = await Seat.aggregate([
        { $match: { libraryId: library._id, status: 'Available' } },
        { $sample: { size: 1 } }
    ]).session(session); // Should work if we are in a transaction

    if (!randomSeatResult || randomSeatResult.length === 0) {
        res.status(400).json({ success: false, msg: "Library is full! No seats available." });
        return { success: false };
    }

    const selectedSeat = randomSeatResult[0];

    // 4. Lock the Seat (Atomic Operation)
    const availableSeat = await Seat.findOneAndUpdate(
        { _id: selectedSeat._id, status: 'Available' },
        {
            status: 'Occupied',
            currentOccupant: userId,
            occupiedSince: new Date(),
            expectedEndTime: expectedEndTime
        },
        { new: true, session: session }
    );

    if (!availableSeat) {
        res.status(400).json({ success: false, msg: "Seat was just taken! Please try scanning again." });
        return { success: false };
    }

    // 5. Update Attendance Bucket (Log the session start)
    await Attendance.findOneAndUpdate(
        { userId, libraryId: library._id, date: today },
        {
            $push: {
                sessions: {
                    seatNumber: availableSeat.seatNumber,
                    checkInTime: new Date(),
                    checkOutTime: null,
                    durationMinutes: 0
                }
            },
            $inc: { sessionCount: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, session: session }
    );

    // 6. UPDATE USER CONTEXT (CRITICAL FIX)
    // We must link the *specific* subscription ID here.
    await User.findByIdAndUpdate(userId, {
        $set: {
            // Seat Details
            'studentDetails.assignedSeat': {
                seatId: availableSeat._id,
                seatNumber: availableSeat.seatNumber,
                checkInTime: new Date(),
                expectedEndTime: expectedEndTime
            },
            // Subscription Details (Ensures next auth check passes)
            'studentDetails.currentSubscription': {
                subscriptionId: subscription._id, // <--- IMPORTANT LINK
                libraryId: library._id,
                planId: subscription.planId,
                startDate: subscription.startDate,
                expiryDate: subscription.expiryDate,
                status: 'active'
            }
        }
    }, { session: session });

    // 7. Refresh Cache
    authMiddleware.invalidateUserCache(userId);

    const rHours = Math.floor(remainingMinutes / 60);
    const rMins = Math.floor(remainingMinutes % 60);

    return {
        success: true,
        data: {
            success: true,
            action: 'SUCCESS',
            seat: availableSeat.seatNumber,
            checkinsRemaining: MAX_DAILY_CHECKINS - (dailyStats.sessionsCount + 1),
            maxDailyCheckins: MAX_DAILY_CHECKINS,
            remainingTime: { hours: rHours, minutes: rMins },
            msg: `Checked In! Assigned Seat: ${availableSeat.seatNumber}`
        }
    };
    return { success: true };
}

// ==========================================
// 3. ACTIVATE TRIAL CONTROLLER
// ==========================================
exports.activateTrial = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { libraryId, planId } = req.body;
        const userId = req.finduser._id;

        // Double check eligibility
        const history = await Subscription.exists({ userId, libraryId }).session(session);
        if (history) {
            await session.abortTransaction();
            return res.status(403).json({ msg: "Trial already used." });
        }

        const library = await Library.findById(libraryId).session(session);
        if (!library) {
            await session.abortTransaction();
            return res.status(404).json({ msg: "Library not found" });
        }

        // Find Plan (Embedded or Standalone)
        const plan = await resolvePlan(planId, library); // Assuming resolvePlan reads are fine w/o session if just checking config

        if (!plan || !plan.trialDays || plan.trialDays <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ msg: "Invalid Trial Plan" });
        }

        // Calculate Expiry
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.trialDays);

        // CREATE SUBSCRIPTION DOCUMENT
        // Use create with array for session support or use new Sub + sub.save({ session })
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

        // Immediately Check User In
        // Since it's a new trial, stats are 0
        const initialStats = { minutesUsed: 0, sessionsCount: 0 };

        // Pass the 'newSub' object so assignSeat links it to the User
        const result = await assignSeat(library, userId, newSub, res, initialStats, session);

        if (result.success) {
            await session.commitTransaction();
            return res.json(result.data);
        } else {
            await session.abortTransaction();
            // assignSeat already sent the error response
            return;
        }

    } catch (err) {
        await session.abortTransaction();
        console.error("Activate Trial Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ msg: "Failed to activate trial" });
        }
    } finally {
        session.endSession();
    }
};

// ==========================================
// 4. CHECK-OUT CONTROLLER
// ==========================================
exports.checkOut = async (req, res) => {
    try {
        const userId = req.finduser._id;

        // Find where the user is sitting
        const seat = await Seat.findOne({ currentOccupant: userId });
        if (!seat) return res.status(400).json({ msg: "You are not currently checked in." });

        const checkOutTime = new Date();

        // Calculate Duration
        let durationMinutes = 0;
        if (seat.occupiedSince) {
            durationMinutes = Math.round((checkOutTime - seat.occupiedSince) / 60000);
        }
        if (durationMinutes < 1) durationMinutes = 1; // Min 1 min for records

        // 1. Release Seat
        await Seat.findByIdAndUpdate(seat._id, {
            status: 'Available',
            currentOccupant: null,
            occupiedSince: null,
            expectedEndTime: null
        });

        // 2. Update Attendance (Find today's bucket)
        // We use $set to update the specific array element where checkOutTime is null
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
            }
        );

        // 3. Clear User's Assigned Seat
        await User.findByIdAndUpdate(userId, {
            'studentDetails.assignedSeat': null
        });

        authMiddleware.invalidateUserCache(userId);

        // 4. Prepare Response Data (Remaining time calculation)
        const dailyStats = await getDailyStats(userId, seat.libraryId);

        // Get limits based on subscription
        let hoursPerDay = 5;
        const activeSub = await Subscription.findOne({
            userId,
            libraryId: seat.libraryId,
            status: 'active',
            expiryDate: { $gt: new Date() }
        });

        if (activeSub) {
            const planDoc = await resolvePlan(activeSub.planId, { _id: seat.libraryId }); // Minimal lib obj
            if (planDoc && planDoc.hoursPerDay) hoursPerDay = planDoc.hoursPerDay;
        }

        const maxMinutes = hoursPerDay * 60;
        const usedMinutes = dailyStats.minutesUsed; // Updated with new session
        const remainingMinutes = Math.max(0, maxMinutes - usedMinutes);

        res.json({
            success: true,
            msg: `Checked out successfully. Session duration: ${durationMinutes} mins.`,
            checkinsRemaining: MAX_DAILY_CHECKINS - dailyStats.sessionsCount,
            maxDailyCheckins: MAX_DAILY_CHECKINS,
            remainingTime: {
                hours: Math.floor(remainingMinutes / 60),
                minutes: Math.floor(remainingMinutes % 60)
            }
        });

    } catch (err) {
        console.error("CheckOut Error:", err);
        res.status(500).json({ msg: "Server Error during checkout" });
    }
};

// ==========================================
// 5. AUTO-RELEASE CRON JOB
// ==========================================
// This function should be called by a cron job (e.g., every 5 minutes)
const releaseExpiredSeats = async () => {
    try {
        const now = new Date();

        // Find occupied seats where time has passed expectedEndTime
        const expiredSeats = await Seat.find({
            status: 'Occupied',
            expectedEndTime: { $lt: now }
        });

        if (expiredSeats.length === 0) return { releasedCount: 0 };

        let releasedCount = 0;

        for (const seat of expiredSeats) {
            try {
                if (!seat.currentOccupant) {
                    // Zombie seat (Occupied status but no user). Just reset it.
                    seat.status = 'Available';
                    seat.occupiedSince = null;
                    seat.expectedEndTime = null;
                    await seat.save();
                    continue;
                }

                const userId = seat.currentOccupant;
                const checkOutTime = now; // Force checkout at current time (or expected time?)

                let durationMinutes = 0;
                if (seat.occupiedSince) {
                    durationMinutes = Math.round((checkOutTime - seat.occupiedSince) / 60000);
                }

                const bucketDate = new Date(seat.occupiedSince);
                bucketDate.setHours(0, 0, 0, 0);

                // Close attendance session
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
                    }
                );

                // Update User
                await User.findByIdAndUpdate(userId, { 'studentDetails.assignedSeat': null });
                authMiddleware.invalidateUserCache(userId);

                // Reset Seat
                seat.status = 'Available';
                seat.currentOccupant = null;
                seat.occupiedSince = null;
                seat.expectedEndTime = null;
                await seat.save();

                releasedCount++;
            } catch (innerErr) {
                console.error(`Failed to auto-release seat ${seat.seatNumber}:`, innerErr);
            }
        }

        return { releasedCount, message: `Released ${releasedCount} expired seats` };

    } catch (err) {
        console.error("Auto Release Logic Error:", err);
        throw err; // Re-throw to be caught by the route handler
    }
};

exports.releaseExpiredSeats = releaseExpiredSeats; // For Cron
exports.autoReleaseSeats = async (req, res) => { // For Manual API Trigger
    try {
        const result = await releaseExpiredSeats();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ message: "Auto release failed" });
    }
};

exports.getAttendanceHistory = async (req, res) => {
    try {
        const userId = req.finduser._id;

        // Fetch all attendance records for this user
        // We now include sessions for the detailed view
        const history = await Attendance.find(
            { userId },
            { date: 1, totalDurationToday: 1, sessionCount: 1, sessions: 1, _id: 0 }
        ).sort({ date: -1 });

        res.json({
            success: true,
            history
        });
    } catch (err) {
        console.error("Get History Error:", err);
        res.status(500).json({ success: false, msg: "Failed to fetch history" });
    }
};

// ==========================================
// 5. OFFLINE PAYMENT - MANUAL SUBSCRIPTION ACTIVATION
// ==========================================
// @desc    Admin/Owner manually activates subscription for a user (Offline Payment)
// @route   POST /api/entry/activate-subscription-offline
// @access  Private (Admin/Library Owner)
exports.activateSubscriptionOffline = async (req, res) => {
    try {
        const { userId, libraryId, planId, pricePaid, startDate } = req.body;
        const adminId = req.finduser._id;
        const adminRole = req.finduser.role;

        // Validation: Required fields
        if (!userId || !libraryId || !planId) {
            return res.status(400).json({
                success: false,
                msg: "Missing required fields: userId, libraryId, planId"
            });
        }

        // Get Library to verify ownership
        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ success: false, msg: "Library not found" });
        }

        // Authorization: Only Admin or Library Owner can do this
        const isAdmin = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' &&
            library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) {
            return res.status(403).json({
                success: false,
                msg: "Only admin or library owner can activate subscriptions"
            });
        }

        // Verify User exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, msg: "User not found" });
        }

        // Find Plan (Embedded or Standalone)
        const plan = await resolvePlan(planId, library);
        if (!plan) {
            return res.status(404).json({ success: false, msg: "Plan not found" });
        }

        // Check if user already has active subscription for this library
        const existingActiveSub = await Subscription.findOne({
            userId,
            libraryId,
            status: 'active',
            expiryDate: { $gt: new Date() }
        });

        if (existingActiveSub) {
            return res.status(400).json({
                success: false,
                msg: "User already has an active subscription for this library"
            });
        }

        // Calculate Expiry Date
        const subStartDate = startDate ? new Date(startDate) : new Date();
        const expiryDate = new Date(subStartDate);
        expiryDate.setDate(expiryDate.getDate() + plan.durationInDays);

        // Create Subscription
        const newSub = await Subscription.create({
            userId,
            libraryId,
            planId: plan._id,
            planName: plan.name || plan.title,
            pricePaid: pricePaid || plan.price || 0, // Store actual price paid
            startDate: subStartDate,
            expiryDate: expiryDate,
            status: 'active',
            paymentId: `OFFLINE-${Date.now()}` // Track as offline payment
        });

        // Update user's subscription info in studentDetails
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
            { new: true }
        );

        return res.status(201).json({
            success: true,
            msg: "Subscription activated successfully (Offline Payment)",
            subscription: {
                _id: newSub._id,
                userId,
                libraryId,
                planName: newSub.planName,
                pricePaid: newSub.pricePaid,
                startDate: newSub.startDate,
                expiryDate: newSub.expiryDate,
                status: newSub.status
            }
        });

    } catch (err) {
        console.error("Activate Subscription Offline Error:", err);
        res.status(500).json({
            success: false,
            msg: "Failed to activate subscription"
        });
    }
};