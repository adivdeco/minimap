const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const SystemConfig = require('../models/SystemConfig');

// Fast, non-blocking helper to inspect token payload without a database lookup
const extractTokenInfo = (req) => {
    try {
        const token = req.cookies?.token || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
        if (!token) return null;
        return jwt.decode(token);
    } catch (e) {
        return null;
    }
};

// General API Rate Limiter
// NOTE: To prevent shared library Wi-Fi / NAT from blocking all students,
// authenticated users are tracked by their unique User ID, giving each student their own quota.
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
    // Super Admins & Co-admins are exempt so operational tasks never fail
    skip: (req) => {
        const decoded = extractTokenInfo(req);
        return decoded?.role === 'admin' || decoded?.role === 'co-admin';
    },
    // Key by User ID if authenticated; fallback to normalized IP for anonymous visitors
    keyGenerator: (req) => {
        const decoded = extractTokenInfo(req);
        if (decoded?.userId) {
            return `user_${decoded.userId}`;
        }
        return ipKeyGenerator(req.ip);
    },
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    message: {
        success: false,
        message: "Too many requests. Please try again after 15 minutes."
    }
});

// Stricter Auth Rate Limiter (Public Login / Public Register)
// Keyed by IP + Email combination so one failed login or brute-force attempt on an account
// does NOT lock out other students sharing the same library Wi-Fi.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    // Authenticated Admins, Co-Admins, and Library Owners are exempt from auth rate limits
    skip: (req) => {
        const decoded = extractTokenInfo(req);
        return decoded?.role === 'admin' || decoded?.role === 'co-admin' || decoded?.role === 'library_owner';
    },
    keyGenerator: (req) => {
        const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
        const ip = ipKeyGenerator(req.ip);
        if (email) {
            return `${ip}_${email}`;
        }
        return ip;
    },
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts for this account from this network. Please try again after 15 minutes."
    }
});

module.exports = { apiLimiter, authLimiter };
