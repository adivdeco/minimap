const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getSystemConfig,
    updateSystemConfig,
    getSystemHealth,
    getRateLimitAnalytics,
    blockIP,
    unblockIP,
    lockUser,
    unlockUser,
    clearApiLogs
} = require('../controllers/adminController');

// Middleware to restrict access to system admins and co-admins
const adminOnly = (req, res, next) => {
    const role = req.user?.role;
    if (role === 'admin' || role === 'co-admin') {
        return next();
    }
    return res.status(403).json({ 
        success: false, 
        message: 'Access Denied: Administrative permissions required' 
    });
};

// Protect all admin endpoints
router.use(authMiddleware);
router.use(adminOnly);

// Settings
router.route('/config')
    .get(getSystemConfig)
    .put(updateSystemConfig);

// Metrics & Health
router.get('/health', getSystemHealth);

// Logs & Rate Limiting
router.get('/rate-limits', getRateLimitAnalytics);
router.delete('/rate-limits/clear', clearApiLogs);

// IP Blacklist management
router.post('/ip-blacklist/block', blockIP);
router.post('/ip-blacklist/unblock', unblockIP);

// User account locking
router.post('/users/:id/lock', lockUser);
router.post('/users/:id/unlock', unlockUser);

module.exports = router;
