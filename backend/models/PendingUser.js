const mongoose = require('mongoose');
const { Schema } = mongoose;

const pendingUserSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    otpExpiry: {
        type: Date,
        required: true
    },
    avatar: String,

    // TTL Index: Document automatically deletes 10 minutes (600 seconds) after creation 
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300
    }
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
