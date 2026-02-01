const express = require('express');
const router = express.Router();
const { checkIn, checkOut, autoReleaseSeats, activateTrial, getAttendanceHistory } = require('../controllers/entryController');
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

// @route   GET /api/entry/history
// @desc    Get user attendance history
// @access  Private
router.get('/history', authMiddleware, getAttendanceHistory);

module.exports = router;
