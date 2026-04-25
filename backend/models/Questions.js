const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({
    quizId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Quiz', 
        required: true,
        index: true
    },
    // The core question
    questionText: { 
        type: String, 
        required: true 
    },
    
    // SPACE SAVER: Just an array of strings ["Newton", "Einstein", "Bohr", "Tesla"]
    options: [{ 
        type: String, 
        required: true 
    }],
    
    // Store the array index (0, 1, 2, or 3) of the right answer. Very lightweight.
    correctOptionIndex: { 
        type: Number, 
        required: true,
        min: 0,
        max: 3 
    },
    
    // Why it's correct (crucial for students)
    explanation: { 
        type: String 
    },

    // Tags help you search your DB later (e.g., if you want to generate a random quiz)
    tags: {
        // classOrExam: { type: String, index: true }, // e.g., 'Class 10', 'NEET'
        // subject: { type: String, index: true },     // e.g., 'Physics'
        chapter: { type: String }                   // e.g., 'Light'
    }
});

module.exports = mongoose.model('Question', questionSchema);