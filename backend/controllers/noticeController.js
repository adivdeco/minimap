const Notice = require('../models/Notice');
const Library = require('../models/LibrarySchema');

// @desc    Create a new notice
// @route   POST /api/notices
// @access  Private (Admin/Library Owner)
exports.createNotice = async (req, res) => {
    try {
        const { libraryId, title, message, priority, isActive } = req.body;
        const adminId = req.user._id;
        const adminRole = req.user.role;

        // Validation
        if (!libraryId || !title || !message) {
            return res.status(400).json({ success: false, msg: "Please provide libraryId, title, and message." });
        }

        // Check if library exists
        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ success: false, msg: "Library not found." });
        }

        // Authorization: Only Admin, Co-admin or Library Owner can create notices
        const isAdmin = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' &&
            library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) {
            return res.status(403).json({ success: false, msg: "You don't have permission to create notices for this library." });
        }

        const newNotice = await Notice.create({
            libraryId,
            title,
            message,
            priority: priority || 'normal',
            isActive: isActive !== undefined ? isActive : true,
            createdBy: adminId
        });

        res.status(201).json({ success: true, msg: "Notice created successfully.", notice: newNotice });
    } catch (err) {
        console.error("Create Notice Error:", err);
        res.status(500).json({ success: false, msg: "Server Error during notice creation." });
    }
};

// @desc    Get all notices for a specific library (public to library users)
// @route   GET /api/notices/library/:libraryId
// @access  Private (Any authenticated user can fetch if they want)
exports.getLibraryNotices = async (req, res) => {
    try {
        const { libraryId } = req.params;
        const { activeOnly } = req.query; // If true, only fetch active notices

        let filter = { libraryId };

        if (activeOnly === 'true') {
            filter.isActive = true;
        }

        // Sort by priority (urgent first) and then by creation date (newest first)
        const priorityOrder = { urgent: 1, high: 2, normal: 3, low: 4 };

        const notices = await Notice.find(filter)
            .populate('createdBy', 'name') // Optionally fetch admin name
            .sort({ createdAt: -1 }); // initial sort by newest

        // Custom sort to bring urgent/high to the top
        notices.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.createdAt - a.createdAt);

        res.json({ success: true, count: notices.length, notices });
    } catch (err) {
        console.error("Get Notices Error:", err);
        res.status(500).json({ success: false, msg: "Server Error fetching notices." });
    }
};

// @desc    Update a notice (title, message, priority, isActive)
// @route   PUT /api/notices/:id
// @access  Private (Admin/Library Owner)
exports.updateNotice = async (req, res) => {
    try {
        const noticeId = req.params.id;
        const adminId = req.user._id;
        const adminRole = req.user.role;

        const notice = await Notice.findById(noticeId);
        if (!notice) {
            return res.status(404).json({ success: false, msg: "Notice not found." });
        }

        // Find Library to check ownership
        const library = await Library.findById(notice.libraryId);

        // Authorization check
        const isAdmin = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' &&
            library && library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) {
            return res.status(403).json({ success: false, msg: "Permission denied." });
        }

        // Update fields
        const { title, message, priority, isActive } = req.body;
        if (title) notice.title = title;
        if (message) notice.message = message;
        if (priority) notice.priority = priority;
        if (isActive !== undefined) notice.isActive = isActive;

        await notice.save();

        res.json({ success: true, msg: "Notice updated successfully.", notice });
    } catch (err) {
        console.error("Update Notice Error:", err);
        res.status(500).json({ success: false, msg: "Server Error updating notice." });
    }
};

// @desc    Delete a notice
// @route   DELETE /api/notices/:id
// @access  Private (Admin/Library Owner)
exports.deleteNotice = async (req, res) => {
    try {
        const noticeId = req.params.id;
        const adminId = req.user._id;
        const adminRole = req.user.role;

        const notice = await Notice.findById(noticeId);
        if (!notice) {
            return res.status(404).json({ success: false, msg: "Notice not found." });
        }

        const library = await Library.findById(notice.libraryId);

        // Authorization check
        const isAdmin = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' &&
            library && library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) {
            return res.status(403).json({ success: false, msg: "Permission denied." });
        }

        await Notice.findByIdAndDelete(noticeId);

        res.json({ success: true, msg: "Notice deleted successfully." });
    } catch (err) {
        console.error("Delete Notice Error:", err);
        res.status(500).json({ success: false, msg: "Server Error deleting notice." });
    }
};
