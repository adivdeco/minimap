const express = require('express');
const router = express.Router();
const { getLibraryPlans, createPlan, updatePlan, deletePlan } = require('../controllers/planController');
const authMiddleware = require('../middleware/authMiddleware');

// Public: Get plans for a library
router.get('/library/:libraryId', getLibraryPlans);

// Protected: Create, Update, Delete
router.post('/', authMiddleware, createPlan);
router.put('/:id', authMiddleware, updatePlan);
router.delete('/:id', authMiddleware, deletePlan);

module.exports = router;
