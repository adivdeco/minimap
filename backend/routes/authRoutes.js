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
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', socialLogin);
router.post('/logout', logoutUser);

// Protected routes
router.get('/check-session', authMiddleware, checkSession);

// User management routes (Admin/Co-Admin)
router.get('/users', authMiddleware, allUsers);
router.put('/users/:id', authMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, deleteUser);

// Profile routes (Any authenticated user)
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

module.exports = router;
