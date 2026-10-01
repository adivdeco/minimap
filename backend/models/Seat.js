const mongoose = require('mongoose');
const { Schema } = mongoose;

const seatSchema = new Schema({
    // Link to the Parent Library
    libraryId: {
        type: Schema.Types.ObjectId,
        ref: 'Library',
        required: true,
        index: true
    },

    // Seat Identity (e.g., "G-1", "VIP-4")
    seatNumber: { type: String, required: true },

    // Layout Coordinates (for Visual Editor)
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },

    // Category (Matches your Library's seatCategories)
    category: {
        type: String,
        default: 'General' // e.g., 'AC', 'Private Cabin'
    },

    // Who is here?
    currentOccupant: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    occupiedSince: { type: Date, default: null },
    expectedEndTime: { type: Date, default: null }, // Automatically calculated based on plan limits

    // Status
    status: {
        type: String,
        enum: ['Available', 'Occupied', 'Maintenance', 'Reserved'],
        default: 'Available'
    },

    // Recurring Reservation Schedule (multi-user, multi-slot)
    reservations: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        startTime: { type: String, required: true },  // "HH:MM" e.g. "10:00"
        endTime: { type: String, required: true },     // "HH:MM" e.g. "14:00"
        createdAt: { type: Date, default: Date.now }
    }],

    // --- DEPRECATED: kept temporarily for backward compat migration ---
    reservedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reservationType: {
        type: String,
        enum: ['FullDay', 'TimeSlot', null],
        default: null
    },
    reservedTimeSlots: [{
        startTime: String,
        endTime: String
    }],
    reservationDate: { type: Date, default: null }
}, { timestamps: true });

// Compound Index: Ensures you can't have two "G-1" seats in the same Library
seatSchema.index({ libraryId: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ status: 1, expectedEndTime: 1 });

module.exports = mongoose.model('Seat', seatSchema);