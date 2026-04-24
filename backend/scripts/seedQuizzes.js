const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Quiz = require('../models/Quiz');

// Load env vars from the backend directory
dotenv.config(); // Because the script is usually run from the backend root

const seedQuizzes = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected...");

        const MOCK_QUIZZES = [
            { title: 'Science Full Mock Test', category: 'Class 10', questions: 50, time: 60, difficulty: 'Medium', iconName: 'Beaker', themeColor: 'emerald' },
            { title: 'Maths Final Revision', category: 'Class 10', questions: 40, time: 45, difficulty: 'Hard', iconName: 'Target', themeColor: 'blue' },
            { title: 'Physics: Kinematics', category: 'Class 11', questions: 30, time: 60, difficulty: 'Hard', iconName: 'Atom', themeColor: 'amber' },
            { title: 'Chemistry: Organics', category: 'Class 12', questions: 45, time: 60, difficulty: 'Medium', iconName: 'Beaker', themeColor: 'rose' },
            { title: 'JEE Mains Grand Mock 1', category: 'IIT JEE', questions: 90, time: 180, difficulty: 'Expert', iconName: 'Code', themeColor: 'indigo' },
            { title: 'NEET Complete Biology', category: 'NEET', questions: 100, time: 120, difficulty: 'Hard', iconName: 'Award', themeColor: 'teal' },
            { title: 'Daily Current Affairs', category: 'General', questions: 15, time: 10, difficulty: 'Easy', iconName: 'Brain', themeColor: 'slate' },
            { title: 'Quantitative Aptitude', category: 'General', questions: 25, time: 30, difficulty: 'Medium', iconName: 'Zap', themeColor: 'orange' },
        ];
        
        // Optional: clear existing if you don't want duplicates (comment out if you want to keep data)
        // await Quiz.deleteMany({});
        // console.log("Old mock tests removed...");

        await Quiz.insertMany(MOCK_QUIZZES);
        console.log("Mock tests seeded successfully!");
        
        process.exit();
    } catch (err) {
        console.error("Error seeding mock tests:", err);
        process.exit(1);
    }
};

seedQuizzes();
