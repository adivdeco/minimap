const mongoose = require('mongoose');
const { Schema } = mongoose;

const floorElementSchema = new Schema({
    // Link to the Parent Library
    libraryId: {
        type: Schema.Types.ObjectId,
        ref: 'Library',
        required: true,
        index: true
    },

    // Element type identifier
    type: {
        type: String,
        required: true,
        enum: [
            'wall',
            'entrance',
            'exit',
            'bathroom',
            'water-cooler',
            'reception',
            'window',
            'label'
        ]
    },

    // Position on canvas
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },

    // Dimensions (walls, windows can be resized)
    width: { type: Number, default: 80 },
    height: { type: Number, default: 20 },

    // Rotation in degrees (for walls, arrows)
    rotation: { type: Number, default: 0 },

    // Optional label text (e.g., "Main Gate", "Men's Bathroom")
    label: { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.model('FloorElement', floorElementSchema);
