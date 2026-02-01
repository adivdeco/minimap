const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const Subscription = require('../models/Subscription');
// IMPORT NOTE: Ensure this file contains the "Daily Bucket" Schema we discussed
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const Plan = require('../models/Plan');

// --- CONFIGURATION ---
const MAX_DAILY_CHECKINS = 3;
const MIN_SESSION_MINUTES = 5;

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

exports.checkIn = async (req, res) => {
    try {
        const { qrCodeString } = req.body;
        const userId = req.finduser._id;

        // 1. Identify Library
        const library = await Library.findOne({ 'accessConfig.qrCodeData': qrCodeString });
        if (!library) return res.status(404).json({ success: false, msg: "Invalid QR Code" });

        // 2. Prevent Double Entry
        const existingSeat = await Seat.findOne({ currentOccupant: userId });
        if (existingSeat) {
            return res.status(400).json({
                success: false,
                msg: `You are already seated at ${existingSeat.seatNumber}. Please checkout first.`
            });
        }

        // --- SECURITY CHECK: DAILY LIMITS ---
        const dailyStats = await getDailyStats(userId, library._id);

        if (dailyStats.sessionsCount >= MAX_DAILY_CHECKINS) {
            return res.status(403).json({
                success: false,
                msg: `Daily entry limit reached (${MAX_DAILY_CHECKINS} times/day). See you tomorrow!`
            });
        }

        // 3. Check for ACTIVE Subscription
        const activeSub = await Subscription.findOne({
            userId,
            libraryId: library._id,
            status: 'active',
            expiryDate: { $gt: new Date() }
        });

        // --- PATH A: USER HAS VALID PASS ---
        if (activeSub) {
            return await assignSeat(library, userId, activeSub.planId, res, dailyStats);
        }

        // --- PATH B: TRIAL CHECKS ---
        const history = await Subscription.exists({ userId, libraryId: library._id });
        if (history) {
            return res.status(200).json({
                success: false,
                action: 'SHOW_PLANS',
                libraryId: library._id,
                msg: "Subscription expired. Please renew."
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
                msg: `Eligible for ${trialPlan.trialDays}-Day Free Trial.`
            });
        }

        return res.status(200).json({
            success: false,
            action: 'SHOW_PLANS',
            libraryId: library._id,
            msg: "Please choose a plan."
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: "Server Error" });
    }
};

// --- UPDATED ASSIGN SEAT LOGIC ---
async function assignSeat(library, userId, planId, res, dailyStats = { minutesUsed: 0 }) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Determine Plan Limits
    let hoursPerDay = 5;
    let planDoc = await Plan.findById(planId);
    if (!planDoc) {
        planDoc = library.plans.id(planId);
    }
    if (planDoc && planDoc.hoursPerDay) {
        hoursPerDay = planDoc.hoursPerDay;
    }

    // 2. Calculate REMAINING Time
    const maxMinutes = hoursPerDay * 60;
    const usedMinutes = dailyStats.minutesUsed;
    let remainingMinutes = maxMinutes - usedMinutes;

    if (remainingMinutes <= 0) {
        return res.status(403).json({
            success: false,
            msg: `Daily Quota Exceeded! You used ${Math.floor(usedMinutes / 60)}h ${usedMinutes % 60}m of your ${hoursPerDay}h limit.`
        });
    }

    const expectedEndTime = new Date(now.getTime() + remainingMinutes * 60000);

    // 3. Find Seat (Optimized via Aggregation)
    const randomSeatResult = await Seat.aggregate([
        { $match: { libraryId: library._id, status: 'Available' } },
        { $sample: { size: 1 } }
    ]);

    if (!randomSeatResult || randomSeatResult.length === 0) {
        return res.status(400).json({ success: false, msg: "Library is full!" });
    }

    const selectedSeat = randomSeatResult[0];

    // 4. Update Seat
    const availableSeat = await Seat.findOneAndUpdate(
        { _id: selectedSeat._id, status: 'Available' },
        {
            status: 'Occupied',
            currentOccupant: userId,
            occupiedSince: now,
            expectedEndTime: expectedEndTime
        },
        { new: true }
    );

    if (!availableSeat) {
        return res.status(400).json({ success: false, msg: "Seat snagged! Try again." });
    }

    // 5. Create Attendance Record (Bucket Upsert)
    await Attendance.findOneAndUpdate(
        { userId, libraryId: library._id, date: today },
        {
            $push: {
                sessions: {
                    seatNumber: availableSeat.seatNumber,
                    checkInTime: now,
                    checkOutTime: null,
                    durationMinutes: 0
                }
            },
            $inc: { sessionCount: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 6. Update User Context
    await User.findByIdAndUpdate(userId, {
        $set: {
            'studentDetails.assignedSeat': {
                seatId: availableSeat._id,
                seatNumber: availableSeat.seatNumber,
                checkInTime: now,
                expectedEndTime: expectedEndTime
            },
            'studentDetails.currentSubscription.libraryId': library._id
        }
    });

    authMiddleware.invalidateUserCache(userId);

    const rHours = Math.floor(remainingMinutes / 60);
    const rMins = Math.floor(remainingMinutes % 60);

    return res.json({
        success: true,
        action: 'SUCCESS',
        seat: availableSeat.seatNumber,
        checkinsRemaining: MAX_DAILY_CHECKINS - (dailyStats.sessionsCount + 1),
        maxDailyCheckins: MAX_DAILY_CHECKINS,
        remainingTime: { hours: rHours, minutes: rMins },
        msg: `Checked In! Seat: ${availableSeat.seatNumber}. Time remaining today: ${rHours}h ${rMins}m`
    });
}

exports.activateTrial = async (req, res) => {
    try {
        const { libraryId, planId } = req.body;
        const userId = req.finduser._id;

        const history = await Subscription.exists({ userId, libraryId });
        if (history) return res.status(403).json({ msg: "Trial already used." });

        const library = await Library.findById(libraryId);
        if (!library) return res.status(404).json({ msg: "Library not found" });

        const plan = library.plans.id(planId);
        if (!plan || plan.trialDays <= 0) return res.status(400).json({ msg: "Invalid Trial Plan" });

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.trialDays);

        const newSub = await Subscription.create({
            userId,
            libraryId,
            planId: plan._id,
            planName: `Free Trial - ${plan.title}`,
            pricePaid: 0,
            startDate: new Date(),
            expiryDate: expiryDate,
            status: 'active'
        });

        // --- BUG FIX IS HERE ---
        // Was: assignSeat(..., newSub);
        // Now: We pass a stats object that says "0 minutes used"
        const initialStats = { minutesUsed: 0, sessionsCount: 0 };

        const result = await assignSeat(library, userId, plan._id, res, initialStats);

        authMiddleware.invalidateUserCache(userId);
        return result;

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// --- CHECK-OUT LOGIC ---
exports.checkOut = async (req, res) => {
    try {
        const userId = req.finduser._id;

        const seat = await Seat.findOne({ currentOccupant: userId });
        if (!seat) return res.status(400).json({ msg: "Not checked in." });

        const checkOutTime = new Date();

        // No minimum duration for calculation logic, but we enforce min 1 minute for data sanity
        let durationMinutes = seat.occupiedSince ? Math.round((checkOutTime - seat.occupiedSince) / 60000) : 0;
        if (durationMinutes < 1) durationMinutes = 1;

        // Free the Seat first (Lock release)
        await Seat.findByIdAndUpdate(seat._id, {
            status: 'Available',
            currentOccupant: null,
            occupiedSince: null,
            expectedEndTime: null
        });

        // Fix: Midnight Crossing
        const bucketDate = new Date(seat.occupiedSince);
        bucketDate.setHours(0, 0, 0, 0);

        // Update Attendance Bucket
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

        // Clear User
        await User.findByIdAndUpdate(userId, { 'studentDetails.assignedSeat': null });
        authMiddleware.invalidateUserCache(userId);

        // Fetch stats to show user how much time they have left
        const dailyStats = await getDailyStats(userId, seat.libraryId);
        const activeSub = await Subscription.findOne({
            userId,
            libraryId: seat.libraryId,
            status: 'active',
            expiryDate: { $gt: new Date() }
        });

        let hoursPerDay = 5;
        if (activeSub) {
            const Plan = require('../models/Plan');
            let planDoc = await Plan.findById(activeSub.planId);
            if (!planDoc) {
                const lib = await Library.findById(seat.libraryId);
                if (lib) planDoc = lib.plans.id(activeSub.planId);
            }
            if (planDoc && planDoc.hoursPerDay) hoursPerDay = planDoc.hoursPerDay;
        }

        const maxMinutes = hoursPerDay * 60;
        const usedMinutes = dailyStats.minutesUsed;
        const remainingMinutes = Math.max(0, maxMinutes - usedMinutes);
        const rHours = Math.floor(remainingMinutes / 60);
        const rMins = Math.floor(remainingMinutes % 60);

        res.json({
            success: true,
            msg: `Checked out. You used ${durationMinutes} mins.`,
            checkinsRemaining: MAX_DAILY_CHECKINS - dailyStats.sessionsCount,
            maxDailyCheckins: MAX_DAILY_CHECKINS,
            remainingTime: { hours: rHours, minutes: rMins }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// --- AUTO-RELEASE CRON JOB ---
const releaseExpiredSeats = async () => {
    try {
        const now = new Date();

        const expiredSeats = await Seat.find({
            status: 'Occupied',
            expectedEndTime: { $lt: now }
        });

        if (expiredSeats.length === 0) return { releasedCount: 0, message: "No seats to release" };

        let releasedCount = 0;

        for (const seat of expiredSeats) {
            try {
                if (!seat.currentOccupant) continue;

                const userId = seat.currentOccupant;
                const checkOutTime = now;
                const durationMinutes = seat.occupiedSince ? Math.round((checkOutTime - seat.occupiedSince) / 60000) : 0;

                const bucketDate = new Date(seat.occupiedSince);
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

                await User.findByIdAndUpdate(userId, { 'studentDetails.assignedSeat': null });
                authMiddleware.invalidateUserCache(userId);

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
        throw err;
    }
};

exports.releaseExpiredSeats = releaseExpiredSeats;
exports.autoReleaseSeats = async (req, res) => {
    try {
        const result = await releaseExpiredSeats();
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Auto Release Error:", err);
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