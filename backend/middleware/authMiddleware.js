// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const NodeCache = require('node-cache');
// const userCache = new NodeCache({ stdTTL: 60, useClones: false });

// const authMiddleware = async (req, res, next) => {
//     try {
//         const token = req.cookies.token;
//         if (!token) return res.status(401).json({ message: "Not logged in" });

//         const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

//         const cacheKey = `user_${decoded.userId}`;
//         let finduser = userCache.get(cacheKey);

//         if (!finduser) {
//             finduser = await User.findById(decoded.userId)
//                 .select('-password')
//                 .populate({
//                     path: 'studentDetails.currentSubscription.libraryId',
//                     model: 'Library',
//                     select: 'libraryName location'
//                 })
//                 .populate({
//                     path: 'studentDetails.currentSubscription.planId',
//                     model: 'Plan',
//                     select: 'name durationInDays'
//                 })
//                 .populate({
//                     path: 'studentDetails.currentSubscription.subscriptionId',
//                     model: 'Subscription',
//                     populate: {
//                         path: 'planId',
//                         model: 'Plan',
//                         select: 'name durationInDays'
//                     }
//                 })
//                 .lean();
//             if (finduser) {
//                 userCache.set(cacheKey, finduser);
//             }
//         }

//         if (!finduser) {
//             return res.status(401).json({ message: "User not found", detail: `ID: ${decoded.userId}` });
//         }

//         req.finduser = finduser;
//         next();
//     } catch (err) {
//         if (err.name === 'TokenExpiredError') {
//             return res.status(401).json({ message: "Token expired", expiredAt: err.expiredAt });
//         }
//         res.status(401).json({ message: "Invalid token", error: err.message });
//     }
// };


// // Exported method to clear cache (e.g., on Check-In/Out)
// authMiddleware.invalidateUserCache = (userId) => {
//     const cacheKey = `user_${userId}`;
//     userCache.del(cacheKey);
//     // console.log(`Cache invalidated for user: ${userId}`);
// };

// module.exports = authMiddleware;

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NodeCache = require('node-cache');

// TTL: 60 seconds (Adjust based on how instant you want updates to be)
const userCache = new NodeCache({ stdTTL: 60, useClones: false });

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "Not logged in" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const cacheKey = `user_${decoded.userId}`;
        let finduser = userCache.get(cacheKey);

        if (!finduser) {
            // Fetch from DB if not in cache
            finduser = await User.findById(decoded.userId)
                .select('-password')
                .populate({
                    path: 'studentDetails.currentSubscription.libraryId',
                    model: 'Library',
                    select: 'libraryName location'
                })
                // Optimized population path
                .populate({
                    path: 'studentDetails.currentSubscription.subscriptionId',
                    model: 'Subscription',
                    populate: {
                        path: 'planId',
                        model: 'Plan',
                        select: 'name durationInDays'
                    }
                })
                .lean(); // Faster execution for read-only data

            // Only cache if user exists
            if (finduser) {
                userCache.set(cacheKey, finduser);
            }
        }

        if (!finduser) {
            return res.status(401).json({ message: "User not found" });
        }

        // Standardize naming (optional: changed from req.finduser to req.user for convention)
        req.user = finduser; 
        req.finduser = finduser; // Kept for backward compatibility with your other controllers
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expired", expiredAt: err.expiredAt });
        }
        console.error("Auth Middleware Error:", err.message);
        res.status(401).json({ message: "Invalid token", error: err.message });
    }
};

// Exported method to clear cache (Use this in Login/Logout/Update controllers)
authMiddleware.invalidateUserCache = (userId) => {
    if(!userId) return;
    const cacheKey = `user_${userId}`;
    userCache.del(cacheKey);
};

module.exports = authMiddleware;