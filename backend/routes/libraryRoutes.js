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
    generateSeatsForLibrary
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

//owner routes
router.get('/owner/my-libraries', authMiddleware, getMyLibraries);
router.post('/generate-seats', authMiddleware, generateSeatsForLibrary);

module.exports = router;
