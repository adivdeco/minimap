const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// These routes will be mounted at /api/questions
// But we also need routes for /api/quizzes/:quizId/questions.
// So we will handle both in server.js or group them properly.

// Route to add a question to a specific quiz
// POST /api/quizzes/:quizId/questions
router.post('/quizzes/:quizId/questions', questionController.addQuestion);

// Route to get all questions for a specific quiz
// GET /api/quizzes/:quizId/questions
router.get('/quizzes/:quizId/questions', questionController.getQuestionsByQuiz);

// Route to update a specific question
// PUT /api/questions/:questionId
router.put('/questions/:questionId', questionController.updateQuestion);

// Route to delete a specific question
// DELETE /api/questions/:questionId
router.delete('/questions/:questionId', questionController.deleteQuestion);

module.exports = router;
