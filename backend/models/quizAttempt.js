const mongoose = require('mongoose');
const { Schema } = mongoose;

const quizProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    
    // High-level stats across all time (These never get deleted!)
    totalAttemptsEver: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },

    // The Bucket: We will strictly limit this to 3 items using MongoDB $slice
    recentAttempts: [{
        attemptDate: { type: Date, default: Date.now },
        score: { type: Number, required: true },
        timeTaken: Number,
        
        // The heavy data (Responses)
        responses: [{
            questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
            selectedOptionIndex: Number,
            isCorrect: Boolean
        }]
    }]
}, { timestamps: true });

// Ensure only one progress document exists per user per quiz
quizProgressSchema.index({ user: 1, quiz: 1 }, { unique: true });

module.exports = mongoose.model('QuizProgress', quizProgressSchema);