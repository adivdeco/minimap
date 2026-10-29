const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Per-session subdocument ────────────────────────────────────────────────────
// Tracks every individual check-in/check-out visit within a day bucket.
const sessionSchema = new Schema({
    seatNumber: String,

    // Shift snapshot — snapshotted at check-in so historical data
    // is correct even if a subscription is later modified.
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    accessMode:    { type: String, enum: ['FIXED_SHIFT', 'DAILY_QUOTA', null], default: null },
    shiftCode:     { type: String, default: null },  // e.g. "EVE"
    shiftName:     { type: String, default: null },  // e.g. "Evening Shift"

    // Scheduled window (FIXED_SHIFT only)
    scheduledStart: { type: Date, default: null },
    scheduledEnd:   { type: Date, default: null },

    checkInTime:   Date,
    checkOutTime:  Date,
    durationMinutes: { type: Number, default: 0 },

    // 'open'    – student is still inside
    // 'checked_out' – student manually checked out
    // 'auto_released' – system released after window expired (student may or may not have left)
    sessionStatus: {
        type: String,
        enum: ['open', 'checked_out', 'auto_released'],
        default: 'open'
    },
    // populated when sessionStatus !== 'open'
    checkoutReason: {
        type: String,
        enum: ['manual', 'auto_expiry', 'admin_override', null],
        default: null
    }
}, { _id: true });  // keep _id so checkout can target the exact session

// ── Daily attendance bucket ────────────────────────────────────────────────────
const attendanceSchema = new Schema({
    userId:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true },

    // "Midnight" of the library-local service date stored in UTC.
    // e.g. 2026-10-29 00:00:00 UTC represents 29 Oct in the library's timezone.
    date: { type: Date, required: true },

    sessions: [sessionSchema],

    // Pre-calculated stats for instant daily-limit checks.
    // Includes ONLY completed (checked_out or auto_released) sessions.
    totalDurationToday: { type: Number, default: 0 },
    sessionCount:       { type: Number, default: 0 }

}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────────────────────
// COMPOUND: one document per user per library per service-date
attendanceSchema.index({ userId: 1, libraryId: 1, date: 1 }, { unique: true });

// TTL: auto-delete after 6 months
attendanceSchema.index({ date: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

// Dashboard queries by shift code
attendanceSchema.index({ libraryId: 1, date: 1, 'sessions.shiftCode': 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);