const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, required: true }, // Refers to the plan in Library structure (embedded document, so manual ID match)
    planName: String,
    pricePaid: Number,
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
    },
    paymentId: String // For future payment integration
}, { timestamps: true });

// Check active subscriptions easily
subscriptionSchema.index({ userId: 1, libraryId: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
