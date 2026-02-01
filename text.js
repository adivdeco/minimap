const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Plan = require('../models/Plan'); 
const authMiddleware = require('../middleware/authMiddleware');

// --- CONFIGURATION ---
const MAX_DAILY_CHECKINS = 3; // Max times a user can enter per day
const MIN_SESSION_MINUTES = 5; // Prevents "check-in -> check-out" spamming in 10 seconds

// --- HELPER: Get Today's Usage Stats ---
async function getDailyStats(userId, libraryId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find all COMPLETED sessions for today
    const records = await Attendance.find({
        userId,
        libraryId,
        checkInTime: { $gte: startOfDay, $lte: endOfDay }
    });

    let minutesUsed = 0;
    let sessionsCount = 0;

    records.forEach(record => {
        sessionsCount++;
        // If they checked out, add duration. If currently active (crash recovery), ignore or handle specifically.
        if (record.durationMinutes) {
            minutesUsed += record.durationMinutes;
        }
    });

    return { minutesUsed, sessionsCount };
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
        // Calculate how much they have used TODAY
        const dailyStats = await getDailyStats(userId, library._id);
        
        // A. Check Frequency (Anti-Spam)
        if (dailyStats.sessionsCount >= MAX_DAILY_CHECKINS) {
            return res.status(403).json({
                success: false,
                msg: `Daily entry limit reached (${MAX_DAILY_CHECKINS} times/day). See you tomorrow!`
            });
        }

        // 3. Check for ACTIVE Subscription
        // Note: We populate planId to get 'hoursPerDay'
        // If populate fails, we must fetch plan manually (handled in assignSeat)
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

        // Check for trial plan
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
    
    // 1. Determine Plan Limits
    let hoursPerDay = 5; // Default fallback
    
    // Try to find the plan details
    // We check both the standalone 'Plan' collection and the embedded 'library.plans'
    let planDoc = await Plan.findById(planId);
    if (!planDoc) {
        // Fallback to embedded
        planDoc = library.plans.id(planId);
    }
    
    if (planDoc && planDoc.hoursPerDay) {
        hoursPerDay = planDoc.hoursPerDay;
    }

    // 2. Calculate REMAINING Time
    const maxMinutes = hoursPerDay * 60;
    const usedMinutes = dailyStats.minutesUsed;
    let remainingMinutes = maxMinutes - usedMinutes;

    // If they have used up their time
    if (remainingMinutes <= 0) {
        return res.status(403).json({
            success: false,
            msg: `Daily Quota Exceeded! You used ${Math.floor(usedMinutes/60)}h ${usedMinutes%60}m of your ${hoursPerDay}h limit.`
        });
    }

    // Set the expected end time based on REMAINING time, not full time
    const expectedEndTime = new Date(now.getTime() + remainingMinutes * 60000);

    // 3. Find Seat
    const availableSeats = await Seat.find({ libraryId: library._id, status: 'Available' });

    if (!availableSeats || availableSeats.length === 0) {
        return res.status(400).json({ success: false, msg: "Library is full!" });
    }

    const randomIndex = Math.floor(Math.random() * availableSeats.length);
    const selectedSeat = availableSeats[randomIndex];

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

    // 5. Create Attendance Record
    await Attendance.create({ 
        userId, 
        libraryId: library._id, 
        seatNumber: availableSeat.seatNumber,
        checkInTime: now 
    });

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
    
    // Convert remaining minutes to readable format
    const rHours = Math.floor(remainingMinutes / 60);
    const rMins = Math.floor(remainingMinutes % 60);

    return res.json({
        success: true,
        action: 'SUCCESS',
        seat: availableSeat.seatNumber,
        msg: `Checked In! Seat: ${availableSeat.seatNumber}. Time remaining today: ${rHours}h ${rMins}m`
    });
}

// --- UPDATED CHECKOUT ---
exports.checkOut = async (req, res) => {
    try {
        const userId = req.finduser._id;

        const seat = await Seat.findOne({ currentOccupant: userId });
        if (!seat) return res.status(400).json({ msg: "Not checked in." });

        const checkOutTime = new Date();
        
        // Calculate duration
        let durationMinutes = seat.occupiedSince ? Math.round((checkOutTime - seat.occupiedSince) / 60000) : 0;

        // Anti-Spam / Logic Correction:
        // If duration is negative (server clock skew) or 0, set to at least 1 minute to record usage
        if (durationMinutes < 1) durationMinutes = 1;

        // Free the Seat
        await Seat.findByIdAndUpdate(seat._id, {
            status: 'Available',
            currentOccupant: null,
            occupiedSince: null,
            expectedEndTime: null
        });

        // Update Attendance
        await Attendance.findOneAndUpdate(
            { userId, libraryId: seat.libraryId, checkOutTime: null },
            { checkOutTime, durationMinutes }
        );

        // Clear User
        await User.findByIdAndUpdate(userId, { 'studentDetails.assignedSeat': null });

        authMiddleware.invalidateUserCache(userId);

        res.json({ success: true, msg: `Checked out. You used ${durationMinutes} mins.` });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// ... keep activateTrial and autoRelease as is ...