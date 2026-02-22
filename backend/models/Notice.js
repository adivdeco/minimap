const mongoose = require('mongoose');
const { Schema } = mongoose;

const noticeSchema = new Schema({
    libraryId: {
        type: Schema.Types.ObjectId,
        ref: 'Library',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    message: {
        type: String,
        required: true,
        maxLength: 1000
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Optimizing queries to find active notices for a library
noticeSchema.index({ libraryId: 1, isActive: 1 });
noticeSchema.index({ libraryId: 1, priority: 1 });

module.exports = mongoose.model('Notice', noticeSchema);
