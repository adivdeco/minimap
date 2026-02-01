const mongoose = require('mongoose');
const { Schema } = mongoose;

const planSchema = new Schema({
    libraryId: {
        type: Schema.Types.ObjectId,
        ref: 'Library',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        maxLength: 500
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    durationInDays: {
        type: Number,
        required: true, // e.g., 30 for Monthly, 1 for Daily
        min: 1
    },
    trialDays: {
        type: Number,
        default: 0,
        min: 0
    },
    hoursPerDay: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        default: 5
    },
    features: [{
        type: String
    }], // e.g. ["AC", "Locker", "WiFi"]

    // For sorting/display logic
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    order: { type: Number, default: 0 } // Custom display order

}, { timestamps: true });

// Ensure names are unique per library? Maybe not strictly required but good practice.
// planSchema.index({ libraryId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Plan', planSchema);
