const ApiLog = require('../models/ApiLog');

const apiTracker = (req, res, next) => {
    const start = Date.now();

    // The finish event fires when the response has been sent to the client
    res.on('finish', async () => {
        const duration = Date.now() - start;
        try {
            const wasRateLimited = res.statusCode === 429;
            
            // Get IP address safely
            const ip = req.headers['x-forwarded-for'] 
                ? req.headers['x-forwarded-for'].split(',')[0].trim() 
                : (req.ip || req.socket.remoteAddress || '127.0.0.1');

            // Log details
            await ApiLog.create({
                path: req.baseUrl + req.path,
                method: req.method,
                statusCode: res.statusCode,
                responseTimeMs: duration,
                ip: ip,
                userId: req.user ? req.user._id : null,
                wasRateLimited: wasRateLimited,
                userAgent: req.headers['user-agent'] || 'Unknown'
            });
        } catch (err) {
            console.error('[apiTracker] Error logging request details:', err.message);
        }
    });

    next();
};

module.exports = apiTracker;
