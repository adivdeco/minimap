const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    // --- 1. Auth & Identity ---
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        minLength: 3,
        maxLength: 50
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    phone: {
        type: String,
        index: true,
        sparse: true
    },
    password: {
        type: String,
        required: function () { return this.loginProvider === 'email'; },
        minLength: 6,
        select: false // Security: Password won't show in queries by default
    },

    // --- 2. Role Management ---
    role: {
        type: String,
        enum: [
            "User",           // Registered but not subscribed
            "co-admin",        // Has an active library subscription
            "library_owner",  // Owns/Manages the library
            "admin"           // You (Super Admin)
        ],
        default: "User",
        index: true
    },

    // --- 3. Address Management ---
    addresses: [{
        label: {
            type: String,
            enum: ['home', 'work', 'library', 'other'],
            default: 'home'
        },
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: "India" },
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        isDefault: { type: Boolean, default: false }
    }],

    // ==================================================
    // 4. ROLE SPECIFIC PROFILES
    // ==================================================

    // A. Student Profile (Only used if role === 'student')
    studentDetails: {
        currentSubscription: {
            subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' }, // Direct link
            libraryId: { type: Schema.Types.ObjectId, ref: 'Library' },
            planId: { type: Schema.Types.ObjectId, ref: 'Plan' },
            startDate: Date,
            expiryDate: Date,
            status: {
                type: String,
                enum: ['active', 'expired', 'pending', 'cancelled'],
                default: 'pending'
            }
        },
        assignedSeat: {
            seatId: { type: Schema.Types.ObjectId, ref: 'Seat' },
            seatNumber: String,
            checkInTime: Date,
            expectedEndTime: Date
        },
        idCardImage: String
    },

    // B. Library Owner Profile (Only used if role === 'library_owner')
    libraryOwnerDetails: {
        gstNumber: String,
        businessPan: String,
        isVerified: { type: Boolean, default: false },
        ownedLibraries: [{ type: Schema.Types.ObjectId, ref: 'Library' }]
    },

    // --- 5. App Preferences ---
    preferences: {
        notificationEnabled: { type: Boolean, default: true },
        language: { type: String, default: 'en' },
        theme: { type: String, enum: ['light', 'dark'], default: 'light' }
    },

    attendanceHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Attendance'
    }],

    // --- 6. Technical Fields ---
    avatar: { type: String, default: '' },
    auth0Id: { type: String, sparse: true, unique: true },
    loginProvider: { type: String, enum: ['email', 'google', 'facebook', 'local'], default: 'email' },
    fcmToken: { type: String }, // Important for "Subscription Expiring" alerts

    // --- 7. Email Verification ---
    emailVerified: { type: Boolean, default: false },

    // --- 8. Security Suspension ---
    isLocked: { type: Boolean, default: false }

}, { timestamps: true });

// Helper: Ensure only one address is default
userSchema.methods.addAddress = function (addressData) {
    if (addressData.isDefault) {
        this.addresses.forEach(addr => addr.isDefault = false);
    }
    this.addresses.push(addressData);
    return this.save();
};

module.exports = mongoose.model('User', userSchema);

