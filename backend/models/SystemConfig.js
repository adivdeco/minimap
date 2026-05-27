const mongoose = require('mongoose');
const { Schema } = mongoose;

const systemConfigSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    value: {
        type: Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
