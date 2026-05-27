const SystemConfig = require('../models/SystemConfig');

const ipBlacklist = async (req, res, next) => {
    try {
        const clientIp = req.headers['x-forwarded-for'] 
            ? req.headers['x-forwarded-for'].split(',')[0].trim() 
            : (req.ip || req.socket.remoteAddress || '127.0.0.1');

        // Fetch blocked IPs list from DB config
        const config = await SystemConfig.findOne({ key: 'blockedIPs' });
        const blockedIPs = config ? config.value : [];

        if (Array.isArray(blockedIPs) && blockedIPs.includes(clientIp)) {
            return res.status(403).json({
                success: false,
                message: 'Access Denied: This IP address has been blocked by system administrators.'
            });
        }
    } catch (err) {
        console.error('[ipBlacklist] Error checking IP blacklist:', err.message);
    }
    next();
};

module.exports = ipBlacklist;
