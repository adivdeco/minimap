const mongoose = require('mongoose');
const { Schema } = mongoose;

const librarySchema = new Schema({
    // --- Basic Identity ---
    libraryName: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100,
        index: true // Faster name search
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    description: {
        type: String,
        maxLength: 1000
    },

    // --- Location (Crucial for "Near Me" feature) ---
    // We use GeoJSON format for accurate map plotting
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        address: {
            street: String,
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            landmark: String
        }
    },

    // --- Contact ---
    contact: {
        email: { type: String, lowercase: true, trim: true },
        phone: {
            type: String,
            required: true,
            validate: {
                validator: (v) => /^[6-9]\d{9}$/.test(v),
                message: props => `${props.value} is not a valid phone number!`
            }
        },
        website: String
    },

    // --- Facilities & Amenities ---
    amenities: [{
        type: String,
        enum: [
            'High-Speed WiFi', 'AC', 'Non-AC', 'Personal Cabin',
            'CCTV', 'Power Backup', 'RO Water', 'Cafeteria',
            'Locker', 'Newspaper', 'Parking', 'Discussion Room'
        ]
    }],

    // --- Capacity & Seat Config ---
    // This allows you to have different counts for different types
    seatCategories: [{
        name: { type: String, default: 'General' }, // e.g., "General Hall", "VIP Cabin"
        totalCount: Number,
        priceMultiplier: { type: Number, default: 1 } // 1.0 = base price, 1.5 = 50% more
    }],

    totalSeats: { type: Number, required: true }, // Aggregate total

    // --- Pricing Plans (More flexible than fixed fields) ---
    plans: [{
        title: { type: String, required: true }, // e.g., "Monthly Basic", "Quarterly Pro"
        durationInDays: { type: Number, required: true },
        trialDays: { type: Number, default: 0 },
        hoursPerDay: { type: Number, required: true, default: 5 },
        price: { type: Number, required: true },
        features: [String] // e.g., ["Locker Included", "Reserved Seat"]
    }],

    // --- Timing ---
    businessHours: {
        open: { type: String, default: '06:00' },
        close: { type: String, default: '22:00' },
        holidays: [String], // e.g. ["Sunday", "National Holidays"]
        is24x7: { type: Boolean, default: false }
    },

    // --- Social & Status ---
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 },
        reviews: [{
            userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            rating: { type: Number, required: true, min: 1, max: 5 },
            comment: { type: String, required: true, maxlength: 500 },
            createdAt: { type: Date, default: Date.now }
        }]
    },
    images: [{
        url: String,
        caption: String,
        isMain: { type: Boolean, default: false }
    }],

    accessConfig: {
        // The actual string hidden inside the QR Code
        // Format example: "https://yourapp.com/checkin/LIB-87345-SECURE"
        qrCodeData: {
            type: String,
            // unique: true,
            required: true
        },

        // If the QR code is leaked, the owner can click "Regenerate" 
        // which updates the version and invalidates the old printed code.
        qrVersion: { type: Number, default: 1 },

        // Optional: Geo-fencing radius (in meters) allowed for scanning
        allowedRadius: { type: Number, default: 50 },

    },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

}, { timestamps: true });

// 2dsphere index is REQUIRED for geospatial queries ($near, $geoWithin)
librarySchema.index({ location: '2dsphere' });
librarySchema.index({ 'address.city': 1, 'address.pincode': 1 });
librarySchema.index({ 'accessConfig.qrCodeData': 1 });

module.exports = mongoose.model('Library', librarySchema);