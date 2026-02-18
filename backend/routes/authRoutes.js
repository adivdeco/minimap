const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    socialLogin,
    logoutUser,
    checkSession,
    allUsers,
    updateUser,
    deleteUser,
    updateProfile,
    changePassword
} = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/google', authLimiter, socialLogin);
router.post('/logout', logoutUser);

// Protected routes
router.get('/check-session', checkSession);

// User management routes (Admin/Co-Admin)
router.get('/users', authMiddleware, allUsers);
router.put('/users/:id', authMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, deleteUser);

// Profile routes (Any authenticated user)
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

module.exports = router;
