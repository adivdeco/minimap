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
    }, // e.g., 'Academic', 'Competitive'
    targetAudience: { 
        type: String, 
        required: true, 
        index: true 
    }, // 'Class 10', 'CGL'
    questions: {
        type: Number,
        required: true,
        min: 1
    },
    questionList: [{
        type: Schema.Types.ObjectId,
        ref: 'Question'
    }],
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

// Ensure virtuals are included when converting to JSON for your frontend
quizSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Quiz', quizSchema);
