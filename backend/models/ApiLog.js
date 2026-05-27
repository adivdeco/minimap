const mongoose = require('mongoose');
const { Schema } = mongoose;

const apiLogSchema = new Schema({
    path: {
        type: String,
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true
    },
    statusCode: {
        type: Number,
        required: true,
        index: true
    },
    responseTimeMs: {
        type: Number,
        required: true
    },
    ip: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    wasRateLimited: {
        type: Boolean,
        default: false,
        index: true
    },
    userAgent: {
        type: String,
        default: 'Unknown'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 259200 // 3 days in seconds (3 * 24 * 60 * 60)
    }
});

// Compound index for quick range queries in health dashboards
apiLogSchema.index({ createdAt: 1, wasRateLimited: 1 });
apiLogSchema.index({ createdAt: 1, statusCode: 1 });

module.exports = mongoose.model('ApiLog', apiLogSchema);
