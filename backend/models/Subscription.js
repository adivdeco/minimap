const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Validated HH:mm time string ───────────────────────────────────────────────
const timeStringValidator = {
    validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
    message: (props) => `${props.value} is not a valid HH:mm time string`
};

// ── Embedded shift configuration ──────────────────────────────────────────────
// Stored directly on the Subscription so check-in never needs a separate query.
const shiftSchema = new Schema({
    code: { type: String, required: true, trim: true, uppercase: true },  // e.g. "EVE"
    name: { type: String, required: true, trim: true },                   // e.g. "Evening Shift"
    startTime: { type: String, required: true, validate: timeStringValidator }, // "HH:mm"
    endTime:   { type: String, required: true, validate: timeStringValidator }, // "HH:mm"
    earlyEntryGraceMinutes: { type: Number, default: 10, min: 0 },
    allowLateEntry: { type: Boolean, default: false }
}, { _id: false });

// ── Main subscription schema ───────────────────────────────────────────────────
const subscriptionSchema = new Schema({
    userId:    { type: Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true, index: true },


    planId:   { type: Schema.Types.ObjectId, required: true },
    planName: String,
    pricePaid: Number,

    startDate:  { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },

    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
    },
    paymentId: String,


    accessMode: {
        type: String,
        enum: ['FIXED_SHIFT', 'DAILY_QUOTA'],
        default: 'DAILY_QUOTA'
    },

    shift: { type: shiftSchema, default: null },

    dailyQuotaMinutes: { type: Number, min: 1, default: null },

    gracePeriodAllowed: { type: Boolean, default: false },
    graceDaysAllowed:   { type: Number,  default: 0 },
    graceDaysUsed:      { type: Number,  default: 0 },
    graceStartDate:     { type: Date }

}, { timestamps: true });

subscriptionSchema.index({ userId: 1, libraryId: 1, status: 1 });
subscriptionSchema.index({ libraryId: 1, status: 1, expiryDate: 1 });

subscriptionSchema.pre('save', function () {
    if (this.accessMode === 'FIXED_SHIFT') {
        if (!this.shift || !this.shift.code || !this.shift.startTime || !this.shift.endTime) {
            throw new Error(
                'A FIXED_SHIFT subscription requires shift.code, shift.startTime, and shift.endTime.'
            );
        }
    }

});

module.exports = mongoose.model('Subscription', subscriptionSchema);
