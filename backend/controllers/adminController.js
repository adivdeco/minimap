const User = require('../models/User');
const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const Quiz = require('../models/Quiz');
const SystemConfig = require('../models/SystemConfig');
const ApiLog = require('../models/ApiLog');
const os = require('os');

// ==========================================
// 1. SYSTEM CONFIGURATION ENDPOINTS
// ==========================================

// @desc    Get all platform configurations
// @route   GET /api/admin/config
// @access  Private (Admin/Co-Admin)
exports.getSystemConfig = async (req, res) => {
    try {
        const configs = await SystemConfig.find().populate('updatedBy', 'name email');
        
        // Convert to a clean key-value object for easier frontend rendering
        const configMap = {};
        configs.forEach(cfg => {
            configMap[cfg.key] = {
                value: cfg.value,
                description: cfg.description,
                updatedAt: cfg.updatedAt,
                updatedBy: cfg.updatedBy
            };
        });

        res.json({
            success: true,
            configs: configMap
        });
    } catch (err) {
        console.error('Error fetching system config:', err);
        res.status(500).json({ success: false, message: 'Server error fetching configs' });
    }
};

// @desc    Update system configurations (Bulk update)
// @route   PUT /api/admin/config
// @access  Private (Admin/Co-Admin)
exports.updateSystemConfig = async (req, res) => {
    try {
        const { updates } = req.body; // Expecting updates object: { maxDailyCheckins: 5, gracePeriodDefaultDays: 4 }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid updates payload' });
        }

        const keys = Object.keys(updates);
        const operations = keys.map(key => {
            return SystemConfig.findOneAndUpdate(
                { key },
                { 
                    $set: { 
                        value: updates[key],
                        updatedBy: req.user._id
                    } 
                },
                { new: true, upsert: true }
            );
        });

        await Promise.all(operations);

        res.json({
            success: true,
            message: 'System configurations updated successfully'
        });
    } catch (err) {
        console.error('Error updating system config:', err);
        res.status(500).json({ success: false, message: 'Server error updating configs' });
    }
};

// ==========================================
// 2. SYSTEM HEALTH ENDPOINTS
// ==========================================

// @desc    Get platform resource metrics and database record counts
// @route   GET /api/admin/health
// @access  Private (Admin/Co-Admin)
exports.getSystemHealth = async (req, res) => {
    try {
        // A. Database Collection counts
        const [
            userCount,
            libraryCount,
            seatCount,
            activeSubscriptionCount,
            totalSubscriptionCount,
            attendanceCount,
            noticeCount,
            quizCount,
            occupiedSeatsCount,
            maintenanceSeatsCount
        ] = await Promise.all([
            User.countDocuments(),
            Library.countDocuments(),
            Seat.countDocuments(),
            Subscription.countDocuments({ status: 'active', expiryDate: { $gt: new Date() } }),
            Subscription.countDocuments(),
            Attendance.countDocuments(),
            Notice.countDocuments(),
            Quiz.countDocuments(),
            Seat.countDocuments({ status: 'Occupied' }),
            Seat.countDocuments({ status: 'Maintenance' })
        ]);

        // B. Process Performance Metrics
        const memoryUsage = process.memoryUsage();
        const serverUptime = process.uptime(); // in seconds
        
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const processHealth = {
            uptimeSeconds: Math.floor(serverUptime),
            uptimeFormatted: formatUptime(serverUptime),
            memory: {
                rss: formatBytes(memoryUsage.rss), // Resident Set Size
                heapTotal: formatBytes(memoryUsage.heapTotal),
                heapUsed: formatBytes(memoryUsage.heapUsed),
                external: formatBytes(memoryUsage.external)
            },
            platform: process.platform,
            nodeVersion: process.version,
            os: {
                totalMemory: formatBytes(os.totalmem()),
                freeMemory: formatBytes(os.freemem()),
                cpuCores: os.cpus().length,
                loadAverage: os.loadavg() // [1, 5, 15] minute load averages
            }
        };

        res.json({
            success: true,
            dbStats: {
                users: userCount,
                libraries: libraryCount,
                seats: {
                    total: seatCount,
                    occupied: occupiedSeatsCount,
                    maintenance: maintenanceSeatsCount,
                    available: Math.max(0, seatCount - occupiedSeatsCount - maintenanceSeatsCount)
                },
                subscriptions: {
                    active: activeSubscriptionCount,
                    total: totalSubscriptionCount
                },
                attendances: attendanceCount,
                notices: noticeCount,
                quizzes: quizCount
            },
            system: processHealth
        });

    } catch (err) {
        console.error('Error fetching system health metrics:', err);
        res.status(500).json({ success: false, message: 'Server error fetching health statistics' });
    }
};

// Helper: Formats node process uptime to readable string
function formatUptime(uptime) {
    const days = Math.floor(uptime / (3600 * 24));
    const hours = Math.floor((uptime % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

// ==========================================
// 3. API & RATE LIMITING ENDPOINTS
// ==========================================

// @desc    Get API performance and rate limit violation logs
// @route   GET /api/admin/rate-limits
// @access  Private (Admin/Co-Admin)
exports.getRateLimitAnalytics = async (req, res) => {
    try {
        // A. Summary stats over last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [
            totalRequests,
            rateLimitedRequests,
            serverErrors,
            recentViolations
        ] = await Promise.all([
            ApiLog.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            ApiLog.countDocuments({ createdAt: { $gte: oneDayAgo }, wasRateLimited: true }),
            ApiLog.countDocuments({ createdAt: { $gte: oneDayAgo }, statusCode: { $gte: 500 } }),
            ApiLog.find({ wasRateLimited: true })
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('userId', 'name email isLocked')
        ]);

        // B. Top 10 IP Addresses by Request Volume
        const topIPs = await ApiLog.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            { 
                $group: { 
                    _id: '$ip', 
                    count: { $sum: 1 },
                    rateLimitedCount: { $sum: { $cond: [{ $eq: ['$wasRateLimited', true] }, 1, 0] } }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // C. Route Latency & Performance Details
        const routePerformance = await ApiLog.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            {
                $group: {
                    _id: { path: '$path', method: '$method' },
                    avgResponseTime: { $avg: '$responseTimeMs' },
                    minResponseTime: { $min: '$responseTimeMs' },
                    maxResponseTime: { $max: '$responseTimeMs' },
                    requestCount: { $sum: 1 },
                    errorCount: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } }
                }
            },
            { $sort: { requestCount: -1 } },
            { $limit: 15 }
        ]);

        // D. Request Volume Timeline (Hourly over last 24h)
        const hourlyTraffic = await ApiLog.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                        hour: { $hour: '$createdAt' }
                    },
                    requests: { $sum: 1 },
                    rateLimited: { $sum: { $cond: [{ $eq: ['$wasRateLimited', true] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    day: '$_id.day',
                    hour: '$_id.hour',
                    requests: 1,
                    rateLimited: 1
                }
            },
            { $sort: { year: 1, month: 1, day: 1, hour: 1 } }
        ]);

        res.json({
            success: true,
            summary: {
                totalRequests24h: totalRequests,
                rateLimitedCount24h: rateLimitedRequests,
                serverErrors24h: serverErrors,
                rateLimitedRatio24h: totalRequests > 0 ? parseFloat(((rateLimitedRequests / totalRequests) * 100).toFixed(2)) : 0
            },
            topIPs: topIPs.map(ip => ({
                ip: ip._id,
                totalRequests: ip.count,
                rateLimitedRequests: ip.rateLimitedCount
            })),
            routePerformance: routePerformance.map(rp => ({
                path: rp._id.path,
                method: rp._id.method,
                averageLatencyMs: Math.round(rp.avgResponseTime),
                minLatencyMs: rp.minResponseTime,
                maxLatencyMs: rp.maxResponseTime,
                totalCalls: rp.requestCount,
                errorCount: rp.errorCount
            })),
            hourlyTimeline: hourlyTraffic,
            recentViolations: recentViolations.map(v => ({
                id: v._id,
                timestamp: v.createdAt,
                path: v.path,
                method: v.method,
                ip: v.ip,
                statusCode: v.statusCode,
                userAgent: v.userAgent,
                user: v.userId ? {
                    id: v.userId._id,
                    name: v.userId.name,
                    email: v.userId.email,
                    isLocked: v.userId.isLocked
                } : null
            }))
        });

    } catch (err) {
        console.error('Error fetching rate limiting analytics:', err);
        res.status(500).json({ success: false, message: 'Server error fetching rate limits' });
    }
};

// @desc    Block IP address
// @route   POST /api/admin/ip-blacklist/block
// @access  Private (Admin/Co-Admin)
exports.blockIP = async (req, res) => {
    try {
        const { ip } = req.body;
        if (!ip) {
            return res.status(400).json({ success: false, message: 'IP address is required' });
        }

        // Add to blockedIPs array in SystemConfig
        const config = await SystemConfig.findOneAndUpdate(
            { key: 'blockedIPs' },
            { $addToSet: { value: ip } },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: `Successfully blocked IP address: ${ip}`,
            blockedIPs: config.value
        });
    } catch (err) {
        console.error('Error blocking IP:', err);
        res.status(500).json({ success: false, message: 'Server error blocking IP' });
    }
};

// @desc    Unblock IP address
// @route   POST /api/admin/ip-blacklist/unblock
// @access  Private (Admin/Co-Admin)
exports.unblockIP = async (req, res) => {
    try {
        const { ip } = req.body;
        if (!ip) {
            return res.status(400).json({ success: false, message: 'IP address is required' });
        }

        // Remove from blockedIPs array in SystemConfig
        const config = await SystemConfig.findOneAndUpdate(
            { key: 'blockedIPs' },
            { $pull: { value: ip } },
            { new: true }
        );

        res.json({
            success: true,
            message: `Successfully unblocked IP address: ${ip}`,
            blockedIPs: config ? config.value : []
        });
    } catch (err) {
        console.error('Error unblocking IP:', err);
        res.status(500).json({ success: false, message: 'Server error unblocking IP' });
    }
};

// @desc    Lock user account
// @route   POST /api/admin/users/:id/lock
// @access  Private (Admin/Co-Admin)
exports.lockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent locking yourself
        if (id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot lock your own account' });
        }

        // Only admin can lock co-admins or other admins
        if ((user.role === 'admin' || user.role === 'co-admin') && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Only admin can lock co-admin/admin accounts' });
        }

        user.isLocked = true;
        await user.save();

        // Invalidate auth cache
        const { invalidateUserCache } = require('../middleware/authMiddleware');
        invalidateUserCache(id);

        res.json({
            success: true,
            message: `User account '${user.name}' has been locked/suspended.`,
            user: { id: user._id, name: user.name, isLocked: user.isLocked }
        });
    } catch (err) {
        console.error('Error locking user:', err);
        res.status(500).json({ success: false, message: 'Server error locking user' });
    }
};

// @desc    Unlock user account
// @route   POST /api/admin/users/:id/unlock
// @access  Private (Admin/Co-Admin)
exports.unlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isLocked = false;
        await user.save();

        // Invalidate auth cache
        const { invalidateUserCache } = require('../middleware/authMiddleware');
        invalidateUserCache(id);

        res.json({
            success: true,
            message: `User account '${user.name}' has been unlocked.`,
            user: { id: user._id, name: user.name, isLocked: user.isLocked }
        });
    } catch (err) {
        console.error('Error unlocking user:', err);
        res.status(500).json({ success: false, message: 'Server error unlocking user' });
    }
};

// @desc    Clear all API and rate limiting logs
// @route   DELETE /api/admin/rate-limits/clear
// @access  Private (Admin/Co-Admin)
exports.clearApiLogs = async (req, res) => {
    try {
        await ApiLog.deleteMany({});
        res.json({
            success: true,
            message: 'All API security and traffic logs have been manually cleared.'
        });
    } catch (err) {
        console.error('Error clearing API logs:', err);
        res.status(500).json({ success: false, message: 'Server error clearing logs' });
    }
};
