const express = require('express');
const router = express.Router();
const {
    getFloorElements,
    addFloorElement,
    updateFloorElementPositions,
    deleteFloorElement
} = require('../controllers/floorElementController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all floor elements for a library (public — students need to see)
router.get('/library/:libraryId', authMiddleware, getFloorElements);

// Add a new floor element
router.post('/', authMiddleware, addFloorElement);

// Bulk update positions/properties
router.put('/positions', authMiddleware, updateFloorElementPositions);

// Delete a floor element
router.delete('/:id', authMiddleware, deleteFloorElement);

module.exports = router;
