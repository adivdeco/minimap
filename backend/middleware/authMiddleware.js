const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NodeCache = require('node-cache');

// Limit cache size to prevent uncontrolled growth
const userCache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false,
    maxKeys: 5000
});

const authMiddleware = async (req, res, next) => {
    try {
        // DEBUG LOGGING
        // console.log(`[AuthMiddleware] checking ${req.method} ${req.path}`);

        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Not logged in" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Token expired" });
            }
            return res.status(401).json({ message: "Invalid token" });
        }

        const userId = decoded.userId;
        if (!userId) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const cacheKey = `user_${userId}`;
        let user = userCache.get(cacheKey);

        if (!user) {
            user = await User.findById(userId)
                .select('-password')
                .lean();

            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            userCache.set(cacheKey, user);
        }

        req.user = user;
        next();

    } catch (err) {
        console.error("Auth Middleware Error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

authMiddleware.invalidateUserCache = (userId) => {
    if (!userId) return;
    userCache.del(`user_${userId}`);
};

module.exports = authMiddleware;
