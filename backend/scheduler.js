const cron = require('node-cron');
const { releaseExpiredSeats } = require('./controllers/entryController');

const initScheduler = () => {
    console.log("Initializing Scheduler...");

    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running Auto-Release Seats Job...`);
        try {
            const result = await releaseExpiredSeats();
            if (result.releasedCount > 0) {
                console.log(`[Scheduler] ${result.message}`);
            } else {
                // Optional: Log verbose only if needed
                // console.log(`[Scheduler] No seats released.`);
            }
        } catch (err) {
            console.error("[Scheduler] Error releasing seats:", err);
        }
    });

    console.log("Scheduler initialized. Jobs are running.");
};

module.exports = initScheduler;
