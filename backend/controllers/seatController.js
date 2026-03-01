const Seat = require('../models/Seat');
const Library = require('../models/LibrarySchema');
const Subscription = require('../models/Subscription');

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

            // If the seat has an active reservation, prevent it from becoming Available
            if (seat.reservedBy && seat.reservationType) {
                seat.status = 'Reserved';
            }
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

// @desc    Reserve a seat for a specific user (Admin/Owner only)
// @route   POST /api/seats/:id/reserve
const reserveSeat = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, reservationType, startTime, endTime } = req.body;
        const adminId = req.finduser._id;
        const role = req.finduser.role;

        if (!userId || !reservationType) {
            return res.status(400).json({ message: "Missing required reservation fields" });
        }

        const seat = await Seat.findById(id);
        if (!seat) return res.status(404).json({ message: "Seat not found" });

        // Permission check
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(seat.libraryId);
            if (!library || (role === 'library_owner' && library.ownerId.toString() !== adminId.toString())) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        // Validate that user has an active subscription for this library
        const activeSub = await Subscription.findOne({
            userId,
            libraryId: seat.libraryId,
            status: 'active'
        });

        // Note: For now we might bypass strict subscription validation to allow owners to force reserve, 
        // but typically you'd want them to have a plan. We'll allow it but you might want to strict-check it later.

        if (reservationType === 'TimeSlot') {
            if (!startTime || !endTime) {
                return res.status(400).json({ message: "Start and End time required for TimeSlot reservation" });
            }

            // Check for overlaps if the seat is already reserved on the same day for a TimeSlot
            if (seat.status === 'Reserved' && seat.reservationType === 'TimeSlot') {
                const newStart = startTime;
                const newEnd = endTime;

                for (const slot of seat.reservedTimeSlots) {
                    // Very basic string comparison for "HH:MM" overlap
                    if ((newStart >= slot.startTime && newStart < slot.endTime) ||
                        (newEnd > slot.startTime && newEnd <= slot.endTime) ||
                        (newStart <= slot.startTime && newEnd >= slot.endTime)) {
                        return res.status(400).json({ message: `Time slot overlaps with existing reservation (${slot.startTime} - ${slot.endTime})` });
                    }
                }
            } else if (seat.status === 'Reserved' && seat.reservationType === 'FullDay') {
                return res.status(400).json({ message: "Seat is already permanently reserved by another user." });
            } else {
                // Not currently reserved, ensure array is clean
                seat.reservedTimeSlots = [];
            }

            seat.reservedTimeSlots.push({ startTime, endTime });
        }

        seat.status = 'Reserved';
        seat.reservedBy = userId;
        seat.reservationType = reservationType;
        seat.reservationDate = new Date(); // Record creation date for reference only

        // If it was occupied by someone else, we might want to evict them or warn, 
        // but for now we just change status and the admin handles physical enforcement.
        // We'll reset current occupant if it's currently empty, or keep them if they are the reserved user.
        if (seat.currentOccupant && seat.currentOccupant.toString() !== userId.toString()) {
            // Optional: You could auto-checkout the current user here if strictly needed.
        }

        await seat.save();
        await seat.populate('reservedBy', 'name email phone avatar');

        res.json({ success: true, message: "Seat reserved successfully", seat });
    } catch (err) {
        console.error("Reservation Error:", err);
        res.status(500).json({ message: "Failed to reserve seat" });
    }
};

// @desc    Cancel a reservation
// @route   POST /api/seats/:id/cancel-reservation
const cancelReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.finduser._id;
        const role = req.finduser.role;

        const seat = await Seat.findById(id);
        if (!seat) return res.status(404).json({ message: "Seat not found" });

        // Permission check
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(seat.libraryId);
            if (!library || (role === 'library_owner' && library.ownerId.toString() !== adminId.toString())) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        // If it's occupied by the reserver, you might want to leave it occupied, just clear reservation info.
        // If it's pure reserved (no one sitting), switch to Available.
        if (seat.status === 'Reserved') {
            seat.status = 'Available';
        }

        seat.reservedBy = null;
        seat.reservationType = null;
        seat.reservedTimeSlots = [];
        seat.reservationDate = null;

        await seat.save();

        // Populate standard fields just in case frontend needs them
        await seat.populate('currentOccupant', 'name email avatar phone');

        res.json({ success: true, message: "Reservation cancelled", seat });

    } catch (err) {
        console.error("Cancel Reservation Error:", err);
        res.status(500).json({ message: "Failed to cancel reservation" });
    }
};

module.exports = {
    getLibrarySeats,
    updateSeat,
    updateSeatPositions,
    reserveSeat,
    cancelReservation
};
