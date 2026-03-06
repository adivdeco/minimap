const express = require('express');
const router = express.Router();
const {
    addLibrary,
    updateLibrary,
    getAllLibraries,
    getLibraryById,
    getMyLibraries,
    getNearbyLibraries,
    deleteLibrary,
    toggleLibraryStatus,
    rateLibrary,
    deleteReview,
    regenerateQRCode,
    generateSeatsForLibrary,
    getLibraryUsers,
    getUserAnalytics,
    getLibraryStatistics,
    updateUserContactInfo
} = require('../controllers/libraryController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/all', getAllLibraries);
router.get('/nearby', getNearbyLibraries);
router.get('/:id', getLibraryById);

// Protected routes (require authentication)
router.post('/add', authMiddleware, addLibrary);
router.put('/update/:id', authMiddleware, updateLibrary);
router.delete('/delete/:id', authMiddleware, deleteLibrary);
router.patch('/toggle-status/:id', authMiddleware, toggleLibraryStatus);
router.post('/rate/:id', authMiddleware, rateLibrary);
router.delete('/review/:libraryId/:reviewId', authMiddleware, deleteReview);
router.patch('/regenerate-qr/:id', authMiddleware, regenerateQRCode);

// Owner routes
router.get('/owner/my-libraries', authMiddleware, getMyLibraries);
router.post('/generate-seats', authMiddleware, generateSeatsForLibrary);

// Library Owner - User & Analytics Routes
router.get('/:libraryId/users', authMiddleware, getLibraryUsers);
router.get('/:libraryId/user/:userId/analytics', authMiddleware, getUserAnalytics);
router.put('/:libraryId/user/:userId/contact', authMiddleware, updateUserContactInfo);
router.get('/:libraryId/statistics', authMiddleware, getLibraryStatistics);

module.exports = router;
