const express = require('express');
const router = express.Router();
const quizProgressController = require('../controllers/quizProgressController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/quiz-progress/batch  — Lightweight batch: all progress for this user (one call)
router.get('/batch', quizProgressController.getBatchProgress);

// POST /api/quiz-progress/:quizId/submit  — Submit an attempt
router.post('/:quizId/submit', quizProgressController.submitAttempt);

// GET /api/quiz-progress/:quizId  — Get user's progress for a quiz
router.get('/:quizId', quizProgressController.getProgress);

module.exports = router;
