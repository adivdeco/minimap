const express = require('express');
const router = express.Router();
const { getLibrarySeats, updateSeat, updateSeatPositions } = require('../controllers/seatController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all seats for a library
router.get('/library/:libraryId', authMiddleware, getLibrarySeats);

// Update seat positions (Visual Layout)
router.put('/positions', authMiddleware, updateSeatPositions);

// Update a seat
router.patch('/:id', authMiddleware, updateSeat);

module.exports = router;
