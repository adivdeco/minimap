const rateLimit = require('express-rate-limit');
const SystemConfig = require('../models/SystemConfig');

// General API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: async (req, res) => {
        try {
            const config = await SystemConfig.findOne({ key: 'apiRateLimitMax' });
            return config ? Number(config.value) : 800;
        } catch (err) {
            return 800;
        }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes"
    }
});

// Stricter Auth Rate Limiter (Login/Register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased limit: allows up to 100 login/register attempts per IP to support library owners onboarding multiple users
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts, please try again later"
    }
});

module.exports = { apiLimiter, authLimiter };
