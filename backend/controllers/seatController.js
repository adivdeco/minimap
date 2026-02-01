const Seat = require('../models/Seat');
const Library = require('../models/LibrarySchema');

// @desc    Get all seats for a specific library
// @route   GET /api/seats/library/:libraryId
const getLibrarySeats = async (req, res) => {
    try {
        const { libraryId } = req.params;
        const userId = req.finduser._id;
        const role = req.finduser.role;

        // Allow anyone with a valid token to view seats (for booking/map)
        // Ensure library exists
        const library = await Library.findById(libraryId);
        if (!library) return res.status(404).json({ message: "Library not found" });

        const seats = await Seat.find({ libraryId })
            .populate('currentOccupant', 'name') // Only show name to public
            .collation({ locale: "en_US", numericOrdering: true }) // Force numeric sort (1, 2, 10)
            .sort({ category: 1, seatNumber: 1 }); // Sort by category then seat number

        res.json(seats);
    } catch (err) {
        console.error('Error fetching seats:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a specific seat (admin/owner manual override)
// @route   PATCH /api/seats/:id
const updateSeat = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, category, seatNumber } = req.body; // Allow updating status or category manually
        const userId = req.finduser._id;
        const role = req.finduser.role;

        const seat = await Seat.findById(id);
        if (!seat) return res.status(404).json({ message: "Seat not found" });

        // Check Permissions
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(seat.libraryId);
            if (!library) return res.status(404).json({ message: "Library associated with seat not found" });

            if (role !== 'library_owner' || library.ownerId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        // --- RESTRICTION: Only Admin/Co-Admin can change Seat Number ---
        if (seatNumber) {
            if (role === 'library_owner') {
                return res.status(403).json({ message: "Library Owners cannot change seat numbers. Contact Admin." });
            }
            // Optional: Check for duplicate seat number in same library
            const exists = await Seat.findOne({ libraryId: seat.libraryId, seatNumber, _id: { $ne: id } });
            if (exists) {
                return res.status(400).json({ message: "Seat number already exists in this library" });
            }
            seat.seatNumber = seatNumber;
        }

        // Owners & Admins can change Status
        if (status) seat.status = status;
        // If status changes to Available, clear occupant
        if (status === 'Available') {
            seat.currentOccupant = null;
            seat.occupiedSince = null;
        }

        if (status === 'Maintenance') {
            seat.currentOccupant = null;
            seat.occupiedSince = null;
        }

        // If they want to re-categorize a seat manually
        if (category) seat.category = category;

        await seat.save();

        // Return populated to keep frontend in sync
        await seat.populate('currentOccupant', 'name email avatar phone');

        res.json(seat);
    } catch (err) {
        console.error('Error updating seat:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update positions for multiple seats (Visual Layout Save)
// @route   PUT /api/seats/positions
const updateSeatPositions = async (req, res) => {
    try {
        const { positions } = req.body; // Array of { id, x, y }
        const userId = req.finduser._id;
        const role = req.finduser.role;

        if (!Array.isArray(positions) || positions.length === 0) {
            return res.status(400).json({ message: "No positions data provided" });
        }

        // Verify permission (light check on first item)
        const firstSeat = await Seat.findById(positions[0].id);
        if (!firstSeat) return res.status(404).json({ message: "Seat reference not found" });

        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(firstSeat.libraryId);
            if (!library || (role === 'library_owner' && library.ownerId.toString() !== userId.toString())) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        // Bulk Write
        const bulkOps = positions.map(pos => ({
            updateOne: {
                filter: { _id: pos.id },
                update: { $set: { x: pos.x, y: pos.y } }
            }
        }));

        await Seat.bulkWrite(bulkOps);

        res.json({ success: true, message: "Layout saved successfully" });

    } catch (err) {
        console.error("Error updating positions:", err);
        res.status(500).json({ message: "Failed to save layout" });
    }
};

module.exports = {
    getLibrarySeats,
    updateSeat,
    updateSeatPositions
};
