const express = require('express');
const router = express.Router();
const { checkIn, checkOut, autoReleaseSeats, activateTrial, getAttendanceHistory, activateSubscriptionOffline, grantGracePeriod, deleteSubscription } = require('../controllers/entryController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/entry/check-in
// @desc    Scan QR and get a seat
// @access  Private (User who scans)
router.post('/check-in', authMiddleware, checkIn);

// @route   POST /api/entry/check-out
// @desc    Release seat
// @access  Private
router.post('/check-out', authMiddleware, checkOut);

// @route   POST /api/entry/auto-release
// @desc    Trigger auto-release of expired seats (Cron or Admin)
// @access  Public (or add separate middleware for API Key)
router.post('/auto-release', autoReleaseSeats);

// @route   POST /api/entry/activate-trial
// @desc    Activate a free trial plan
// @access  Private (User)
router.post('/activate-trial', authMiddleware, activateTrial);

// @route   POST /api/entry/activate-subscription-offline
// @desc    Admin/Owner manually activates subscription for user (Offline Payment - Cash)
// @access  Private (Admin or Library Owner)
router.post('/activate-subscription-offline', authMiddleware, activateSubscriptionOffline);

// @route   GET /api/entry/history
// @desc    Get user attendance history
// @access  Private
router.get('/history', authMiddleware, getAttendanceHistory);

// @route   POST /api/entry/grant-grace-period/:libraryId/:subscriptionId
// @desc    Admin/Owner grants grace period to an expired subscription
// @access  Private (Admin or Library Owner)
router.post('/grant-grace-period/:libraryId/:subscriptionId', authMiddleware, grantGracePeriod);

// @route   DELETE /api/entry/subscription/:libraryId/:subscriptionId
// @desc    Admin/Owner cancels/deletes an active subscription
// @access  Private (Admin or Library Owner)
router.delete('/subscription/:libraryId/:subscriptionId', authMiddleware, deleteSubscription);

module.exports = router;
