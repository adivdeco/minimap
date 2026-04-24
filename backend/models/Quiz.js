const mongoose = require('mongoose');
const { Schema } = mongoose;

const quizSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    questions: {
        type: Number,
        required: true,
        min: 1
    },
    time: {
        type: Number,
        required: true,
        min: 1
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard', 'Expert']
    },
    iconName: {
        type: String,
        default: 'Target'
    },
    themeColor: {
        type: String,
        default: 'emerald'
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
