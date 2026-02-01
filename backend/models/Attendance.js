// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const attendanceSchema = new Schema({
//     userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true },
//     seatNumber: String,
//     checkInTime: { type: Date, default: Date.now },
//     checkOutTime: Date, // Will be null initially
//     durationMinutes: Number
// });

// module.exports = mongoose.model('Attendance', attendanceSchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true },

    // This defines "Today". We store it as midnight (e.g., 2026-01-22 00:00:00)
    date: { type: Date, required: true },

    // Here is the "Bucket". All sessions go here.
    sessions: [{
        seatNumber: String,
        checkInTime: Date,
        checkOutTime: Date,
        durationMinutes: Number
    }],

    // Pre-calculated stats (Makes your "Daily Limit" check instant!)
    totalDurationToday: { type: Number, default: 0 },
    sessionCount: { type: Number, default: 0 }

}, { timestamps: true });

// COMPOUND INDEX (Crucial): Ensures one document per user per day per library
attendanceSchema.index({ userId: 1, libraryId: 1, date: 1 }, { unique: true });

// TTL Index: Auto-delete after 6 months (180 days)
// We use 'date' field which represents midnight of that day.
attendanceSchema.index({ date: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports = mongoose.model('Attendance', attendanceSchema);