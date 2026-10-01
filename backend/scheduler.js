const cron = require('node-cron');
const { releaseExpiredSeats } = require('./controllers/entryController');
const Subscription = require('./models/Subscription');
const Seat = require('./models/Seat');

// --- HELPER: Release reservations for expired subscriptions ---
const releaseExpiredReservations = async () => {
    try {
        const now = new Date();

        // Find all subscriptions that have truly expired (past expiry + grace)
        // Step 1: Find expired subscriptions (status !== 'active' or expiry passed)
        const expiredSubs = await Subscription.find({
            expiryDate: { $lt: now }
        });

        if (expiredSubs.length === 0) return { releasedCount: 0 };

        let totalReleasedSlots = 0;

        for (const sub of expiredSubs) {
            try {
                // Check if grace period still applies
                if (sub.gracePeriodAllowed && sub.graceStartDate) {
                    const graceEnd = new Date(
                        sub.graceStartDate.getTime() + sub.graceDaysAllowed * 24 * 60 * 60 * 1000
                    );
                    if (now <= graceEnd) {
                        // Grace period is still active, skip this subscription
                        continue;
                    }
                }

                const userId = sub.userId;
                const libraryId = sub.libraryId;

                // Find all seats in this library that have reservations for this user
                const seatsWithUserReservations = await Seat.find({
                    libraryId,
                    'reservations.userId': userId
                });

                for (const seat of seatsWithUserReservations) {
                    const beforeCount = seat.reservations.length;

                    // Remove ONLY this user's reservations, preserving others
                    seat.reservations = seat.reservations.filter(
                        r => r.userId.toString() !== userId.toString()
                    );

                    const removed = beforeCount - seat.reservations.length;
                    totalReleasedSlots += removed;

                    // Recompute status
                    if (seat.status !== 'Maintenance' && seat.status !== 'Occupied') {
                        seat.status = seat.reservations.length > 0 ? 'Reserved' : 'Available';
                    }

                    // Also clear deprecated fields if they match this user
                    if (seat.reservedBy && seat.reservedBy.toString() === userId.toString()) {
                        seat.reservedBy = null;
                        seat.reservationType = null;
                        seat.reservedTimeSlots = [];
                        seat.reservationDate = null;
                    }

                    await seat.save();
                }
            } catch (innerErr) {
                console.error(`[Scheduler] Error releasing reservations for sub ${sub._id}:`, innerErr);
            }
        }

        return {
            releasedCount: totalReleasedSlots,
            message: `Released ${totalReleasedSlots} expired reservation slots`
        };
    } catch (err) {
        console.error("[Scheduler] Expired Reservation Release Error:", err);
        throw err;
    }
};

const initScheduler = () => {
    console.log("Initializing Scheduler...");

    // Run every 10 minutes — release physically expired seats (time quota exceeded)
    cron.schedule('*/10 * * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running Auto-Release Seats Job...`);
        try {
            const result = await releaseExpiredSeats();
            if (result.releasedCount > 0) {
                console.log(`[Scheduler] ${result.message}`);
            }
        } catch (err) {
            console.error("[Scheduler] Error releasing seats:", err);
        }
    });

    // Run once daily at midnight — release reservations for expired subscriptions
    cron.schedule('0 0 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running Expired Reservation Cleanup...`);
        try {
            const result = await releaseExpiredReservations();
            if (result.releasedCount > 0) {
                console.log(`[Scheduler] ${result.message}`);
            }
        } catch (err) {
            console.error("[Scheduler] Error releasing expired reservations:", err);
        }
    });

    console.log("Scheduler initialized. Jobs are running.");
};

module.exports = initScheduler;
