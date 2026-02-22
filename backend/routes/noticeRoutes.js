const express = require('express');
const router = express.Router();
const { createNotice, getLibraryNotices, updateNotice, deleteNotice } = require('../controllers/noticeController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/notices
// @desc    Create a new notice
// @access  Private (Admin/Owner)
router.post('/', authMiddleware, createNotice);

// @route   GET /api/notices/library/:libraryId
// @desc    Get all active/inactive notices for a specific library
// @access  Private (User/Admin/Owner) - Anyone authenticated can read
router.get('/library/:libraryId', authMiddleware, getLibraryNotices);

// @route   PUT /api/notices/:id
// @desc    Update a notice (title, message, priority, status)
// @access  Private (Admin/Owner)
router.put('/:id', authMiddleware, updateNotice);

// @route   DELETE /api/notices/:id
// @desc    Delete a notice
// @access  Private (Admin/Owner)
router.delete('/:id', authMiddleware, deleteNotice);

module.exports = router;
