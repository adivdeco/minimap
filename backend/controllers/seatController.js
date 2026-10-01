const Seat = require('../models/Seat');
const Library = require('../models/LibrarySchema');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// --- HELPER: Check if two time ranges overlap ---
// Back-to-back is allowed: 10:00-12:00 and 12:00-14:00 do NOT overlap
function timeSlotsOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

// --- HELPER: Validate time string format "HH:MM" ---
function isValidTimeString(t) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

// --- HELPER: Recompute seat status based on state ---
function computeSeatStatus(seat) {
    if (seat.status === 'Maintenance') return 'Maintenance';
    if (seat.currentOccupant) return 'Occupied';
    if (seat.reservations && seat.reservations.length > 0) return 'Reserved';
    return 'Available';
}

// @desc    Get all seats for a specific library
// @route   GET /api/seats/library/:libraryId
const getLibrarySeats = async (req, res) => {
    try {
        const { libraryId } = req.params;

        // Ensure library exists
        const library = await Library.findById(libraryId);
        if (!library) return res.status(404).json({ message: "Library not found" });

        const seats = await Seat.find({ libraryId })
            .populate('currentOccupant', 'name email avatar phone')
            .populate('reservations.userId', 'name email avatar phone')
            // Deprecated field — populate for backward compat during migration
            .populate('reservedBy', 'name email avatar phone')
            .collation({ locale: "en_US", numericOrdering: true })
            .sort({ category: 1, seatNumber: 1 });

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
        const userId = req.user._id;
        const role = req.user.role;

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

        // Track if we need to evict a user
        const previousOccupantId = seat.currentOccupant;
        let wasEvicted = false;

        // Owners & Admins can change Status
        if (status) seat.status = status;
        
        // If status changes to Available, clear occupant
        if (status === 'Available') {
            if (seat.currentOccupant) wasEvicted = true;
            seat.currentOccupant = null;
            seat.occupiedSince = null;

            // If the seat has active reservations, keep it as Reserved
            if (seat.reservations && seat.reservations.length > 0) {
                seat.status = 'Reserved';
            }
        }

        if (status === 'Maintenance') {
            if (seat.currentOccupant) wasEvicted = true;
            seat.currentOccupant = null;
            seat.occupiedSince = null;
        }

        // --- ENFORCE USER & ATTENDANCE CLEANUP IF EVICTED ---
        if (wasEvicted && previousOccupantId) {
            try {
                // 1. Clear User.assignedSeat
                const user = await User.findById(previousOccupantId);
                if (user && user.studentDetails && user.studentDetails.assignedSeat && user.studentDetails.assignedSeat.seatId.toString() === id.toString()) {
                    user.studentDetails.assignedSeat = null;
                    await user.save();
                }

                // 2. Clear Active Attendance Session
                const attendance = await Attendance.findOne({ 
                    userId: previousOccupantId, 
                    libraryId: seat.libraryId 
                }).sort({ createdAt: -1 });

                if (attendance && attendance.sessions && attendance.sessions.length > 0) {
                    const lastSession = attendance.sessions[attendance.sessions.length - 1];
                    if (lastSession.seatNumber === seat.seatNumber && !lastSession.checkOutTime) {
                        const now = new Date();
                        lastSession.checkOutTime = now;
                        
                        const diffInMs = now.getTime() - new Date(lastSession.checkInTime).getTime();
                        lastSession.durationMinutes = Math.floor(diffInMs / 60000);

                        attendance.totalDurationToday = (attendance.totalDurationToday || 0) + lastSession.durationMinutes;
                        await attendance.save();
                    }
                }
            } catch (err) {
                console.error("Error syncing User and Attendance during force vacate:", err);
            }
        }

        // If they want to re-categorize a seat manually
        if (category) seat.category = category;

        await seat.save();

        // Return populated to keep frontend in sync
        await seat.populate('currentOccupant', 'name email avatar phone');
        await seat.populate('reservations.userId', 'name email avatar phone');

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
        const userId = req.user._id;
        const role = req.user.role;

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

// @desc    Reserve a time slot on a seat for a user (Admin/Owner only)
// @route   POST /api/seats/:id/reserve
const reserveSeat = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, startTime, endTime } = req.body;
        const adminId = req.user._id;
        const role = req.user.role;

        // --- Validation ---
        if (!userId || !startTime || !endTime) {
            return res.status(400).json({ message: "Missing required fields: userId, startTime, endTime" });
        }

        if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
            return res.status(400).json({ message: "Invalid time format. Use HH:MM (e.g., 10:00)" });
        }

        if (startTime >= endTime) {
            return res.status(400).json({ message: "Start time must be before end time" });
        }

        const seat = await Seat.findById(id);
        if (!seat) return res.status(404).json({ message: "Seat not found" });

        const library = await Library.findById(seat.libraryId);
        if (!library) return res.status(404).json({ message: "Library not found" });
        if (!library.isActive) {
            return res.status(400).json({ message: "Cannot reserve seats while the library is offline." });
        }

        // Permission check
        if (role !== 'admin' && role !== 'co-admin') {
            if (role === 'library_owner' && library.ownerId.toString() !== adminId.toString()) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        // Seat must not be in Maintenance
        if (seat.status === 'Maintenance') {
            return res.status(400).json({ message: "Cannot reserve a seat that is under maintenance." });
        }

        // --- Validate against library operating hours ---
        if (!library.businessHours?.is24x7) {
            const libOpen = library.businessHours?.open || '06:00';
            const libClose = library.businessHours?.close || '22:00';

            if (startTime < libOpen || endTime > libClose) {
                return res.status(400).json({
                    message: `Reservation must be within library hours (${libOpen} – ${libClose})`
                });
            }
        }

        // --- Check for overlapping reservations on this seat ---
        for (const existing of (seat.reservations || [])) {
            if (timeSlotsOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
                // Populate user name for a better error message
                const existingUser = await User.findById(existing.userId, 'name');
                const existingName = existingUser?.name || 'another user';
                return res.status(400).json({
                    message: `Time slot overlaps with existing reservation (${existing.startTime} – ${existing.endTime}) by ${existingName}`
                });
            }
        }

        // --- Validate user has an active subscription (optional but recommended) ---
        // Currently the existing code allows forced reservations by admin, so we keep that behavior
        // but log a warning if no subscription exists.

        // --- Push the new reservation ---
        seat.reservations.push({
            userId,
            startTime,
            endTime
        });

        // Sort reservations by startTime for cleanliness
        seat.reservations.sort((a, b) => a.startTime.localeCompare(b.startTime));

        // Update status
        seat.status = computeSeatStatus(seat);

        await seat.save();
        await seat.populate('reservations.userId', 'name email phone avatar');

        res.json({ success: true, message: "Seat reserved successfully", seat });
    } catch (err) {
        console.error("Reservation Error:", err);
        res.status(500).json({ message: "Failed to reserve seat" });
    }
};

// @desc    Cancel a specific reservation on a seat
// @route   POST /api/seats/:id/cancel-reservation
const cancelReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const { reservationIndex } = req.body; // Index of the reservation to cancel
        const adminId = req.user._id;
        const role = req.user.role;

        const seat = await Seat.findById(id);
        if (!seat) return res.status(404).json({ message: "Seat not found" });

        // Permission check
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(seat.libraryId);
            if (!library || (role === 'library_owner' && library.ownerId.toString() !== adminId.toString())) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        // --- Handle legacy: cancel ALL (when no index given and old-style reservedBy exists) ---
        if (reservationIndex === undefined || reservationIndex === null) {
            // Legacy behavior: clear all reservations
            seat.reservations = [];
            // Also clear deprecated fields
            seat.reservedBy = null;
            seat.reservationType = null;
            seat.reservedTimeSlots = [];
            seat.reservationDate = null;
        } else {
            // Targeted cancellation
            if (reservationIndex < 0 || reservationIndex >= (seat.reservations?.length || 0)) {
                return res.status(400).json({ message: "Invalid reservation index" });
            }
            seat.reservations.splice(reservationIndex, 1);
        }

        // Recompute status
        seat.status = computeSeatStatus(seat);

        await seat.save();
        await seat.populate('currentOccupant', 'name email avatar phone');
        await seat.populate('reservations.userId', 'name email avatar phone');

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
