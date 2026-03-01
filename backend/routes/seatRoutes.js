const express = require('express');
const router = express.Router();
const { getLibrarySeats, updateSeat, updateSeatPositions, reserveSeat, cancelReservation } = require('../controllers/seatController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all seats for a library
router.get('/library/:libraryId', authMiddleware, getLibrarySeats);

// Update seat positions (Visual Layout)
router.put('/positions', authMiddleware, updateSeatPositions);

// Update a seat
router.patch('/:id', authMiddleware, updateSeat);

// Reserve a seat
router.post('/:id/reserve', authMiddleware, reserveSeat);

// Cancel a reservation
router.post('/:id/cancel-reservation', authMiddleware, cancelReservation);

module.exports = router;
