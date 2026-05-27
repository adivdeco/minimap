const SystemConfig = require('../models/SystemConfig');

const defaultConfigs = [
    {
        key: 'maxDailyCheckins',
        value: 3,
        description: 'Maximum number of library check-ins a student can perform per day.'
    },
    {
        key: 'gracePeriodDefaultDays',
        value: 3,
        description: 'Number of grace days allowed for check-in after user subscription expires.'
    },
    {
        key: 'otpExpiryMinutes',
        value: 5,
        description: 'Time duration in minutes for which OTP remains valid for email verification.'
    },
    {
        key: 'defaultAmenities',
        value: [
            'High-Speed WiFi', 'AC', 'Non-AC', 'Personal Cabin',
            'CCTV', 'Power Backup', 'RO Water', 'Cafeteria',
            'Locker', 'Newspaper', 'Parking', 'Discussion Room'
        ],
        description: 'List of standard amenities that libraries can offer.'
    },
    {
        key: 'attendanceTtlDays',
        value: 180,
        description: 'Number of days to keep student attendance records before auto-deleting.'
    },
    {
        key: 'blockedIPs',
        value: [],
        description: 'List of client IP addresses blocked from accessing the system.'
    },
    {
        key: 'apiRateLimitMax',
        value: 800,
        description: 'Maximum requests allowed per client IP address in 15 minutes.'
    }
];

const seedSystemConfig = async () => {
    try {
        console.log('[ConfigSeeder] Checking for default system configurations...');
        
        const count = await SystemConfig.countDocuments();
        if (count === 0) {
            console.log('[ConfigSeeder] Database is empty. Seeding configurations...');
            await SystemConfig.insertMany(defaultConfigs);
            console.log('[ConfigSeeder] Successfully seeded default configurations.');
        } else {
            // Seed missing keys if any exist (e.g. system upgrades)
            for (const cfg of defaultConfigs) {
                const exists = await SystemConfig.findOne({ key: cfg.key });
                if (!exists) {
                    await SystemConfig.create(cfg);
                    console.log(`[ConfigSeeder] Added missing config key: "${cfg.key}"`);
                }
            }
            console.log('[ConfigSeeder] System configurations are up-to-date.');
        }
    } catch (err) {
        console.error('[ConfigSeeder] Error seeding system configuration:', err.message);
    }
};

module.exports = seedSystemConfig;
