const Question = require('../models/Questions');
const Quiz = require('../models/Quiz');

exports.addQuestion = async (req, res) => {
    try {
        const allowedRoles = ['admin', 'co-admin'];
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Only admins or co-admins can perform this action." });
        }

        const { quizId } = req.params;
        const { questionText, options, correctOptionIndex, explanation, tags } = req.body;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Mock test not found" });
        }

        const newQuestion = new Question({
            quizId,
            questionText,
            options,
            correctOptionIndex,
            explanation,
            tags
        });

        await newQuestion.save();

        // Add to quiz's questionList
        quiz.questionList.push(newQuestion._id);
        
        // Update total questions count just in case
        quiz.questions = quiz.questionList.length;
        await quiz.save();

        res.status(201).json({ message: "Question added successfully", question: newQuestion });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error adding question", error: err.message });
    }
};

exports.getQuestionsByQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const questions = await Question.find({ quizId });
        res.status(200).json({ questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching questions", error: err.message });
    }
};

exports.updateQuestion = async (req, res) => {
    try {
        const allowedRoles = ['admin', 'co-admin'];
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Only admins or co-admins can perform this action." });
        }

        const { questionId } = req.params;
        const { questionText, options, correctOptionIndex, explanation, tags } = req.body;

        const updatedQuestion = await Question.findByIdAndUpdate(
            questionId,
            { questionText, options, correctOptionIndex, explanation, tags },
            { new: true }
        );

        if (!updatedQuestion) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json({ message: "Question updated successfully", question: updatedQuestion });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating question", error: err.message });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        const allowedRoles = ['admin', 'co-admin'];
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Only admins or co-admins can perform this action." });
        }

        const { questionId } = req.params;

        const deletedQuestion = await Question.findByIdAndDelete(questionId);
        
        if (!deletedQuestion) {
            return res.status(404).json({ message: "Question not found" });
        }

        // Remove from the Quiz
        const quiz = await Quiz.findById(deletedQuestion.quizId);
        if (quiz) {
            quiz.questionList.pull(questionId);
            quiz.questions = quiz.questionList.length;
            await quiz.save();
        }

        res.status(200).json({ message: "Question deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting question", error: err.message });
    }
};
