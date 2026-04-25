const Quiz = require('../models/Quiz');

exports.createQuiz = async (req, res) => {
    try {
        const { title, category, questions, time, difficulty, iconName, themeColor } = req.body;

        // Allowed roles to create (could be customized later)
        const allowedRoles = ['admin', 'co-admin'];
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Only admins or co-admins can perform this action." });
        }

        const newQuiz = new Quiz({
            title,
            category,
            questions: Number(questions),
            time: Number(time),
            difficulty,
            iconName: iconName || 'Target',
            themeColor: themeColor || 'emerald',
            createdBy: req.user ? req.user._id : undefined
        });

        await newQuiz.save();
        res.status(201).json({ message: "Mock test created successfully", quiz: newQuiz });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating mock test", error: err.message });
    }
};

exports.getQuizzes = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category && category !== 'All') {
            query.category = category;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const quizzes = await Quiz.find(query).sort({ createdAt: -1 });
        res.status(200).json({ quizzes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching mock tests", error: err.message });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const allowedRoles = ['admin', 'co-admin'];
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Only admins or co-admins can perform this action." });
        }

        const { id } = req.params;
        const updatableFields = ['title', 'category', 'questions', 'time', 'difficulty', 'iconName', 'themeColor'];

        const updateData = {};
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        const updatedQuiz = await Quiz.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedQuiz) {
            return res.status(404).json({ message: "Mock test not found" });
        }

        res.status(200).json({ message: "Mock test updated successfully", quiz: updatedQuiz });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating mock test", error: err.message });
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        const allowedRoles = ['admin', 'co-admin'];
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Only admins or co-admins can perform this action." });
        }

        const { id } = req.params;
        const deletedQuiz = await Quiz.findByIdAndDelete(id);

        if (!deletedQuiz) {
            return res.status(404).json({ message: "Mock test not found" });
        }

        // Cascade delete questions
        const Question = require('../models/Questions');
        await Question.deleteMany({ quizId: id });

        res.status(200).json({ message: "Mock test deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting mock test", error: err.message });
    }
};
