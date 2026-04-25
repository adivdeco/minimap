const Question = require('../models/Questions');
const QuizProgress = require('../models/quizAttempt');

/**
 * Submit a quiz attempt.
 * Body: { responses: [{ questionId, selectedOptionIndex }], timeTaken }
 * Server-side scoring: looks up correct answers, computes score, marks each response.
 */
exports.submitAttempt = async (req, res) => {
    try {
        const userId = req.user._id;
        const { quizId } = req.params;
        const { responses = [], timeTaken } = req.body;

        // 1. Fetch the correct answers from DB in one query
        const questionIds = responses.map(r => r.questionId);
        const questionsFromDB = await Question.find({ _id: { $in: questionIds } }).lean();

        // Build a lookup map: questionId -> correctOptionIndex
        const correctMap = {};
        questionsFromDB.forEach(q => {
            correctMap[q._id.toString()] = q.correctOptionIndex;
        });

        // 2. Score each response
        let correctCount = 0;
        const scoredResponses = responses.map(r => {
            const correct = correctMap[r.questionId];
            const isCorrect = correct !== undefined && r.selectedOptionIndex === correct;
            if (isCorrect) correctCount++;
            return {
                questionId: r.questionId,
                selectedOptionIndex: r.selectedOptionIndex,
                isCorrect
            };
        });

        const score = correctCount;

        // 3. Upsert the QuizProgress document using $push with $slice to cap at 3 recent attempts
        const update = {
            $inc: { totalAttemptsEver: 1 },
            $max: { bestScore: score },
            $push: {
                recentAttempts: {
                    $each: [{
                        attemptDate: new Date(),
                        score,
                        timeTaken: timeTaken || 0,
                        responses: scoredResponses
                    }],
                    $slice: -3 // Keep only the 3 most recent
                }
            }
        };

        const progress = await QuizProgress.findOneAndUpdate(
            { user: userId, quiz: quizId },
            update,
            { upsert: true, new: true }
        );

        // 4. Build detailed results to send back to frontend
        //    Include question text, options, explanations so the client can render review
        const detailedResults = scoredResponses.map(r => {
            const qData = questionsFromDB.find(q => q._id.toString() === r.questionId);
            return {
                questionId: r.questionId,
                questionText: qData?.questionText || '',
                options: qData?.options || [],
                correctOptionIndex: qData?.correctOptionIndex ?? -1,
                explanation: qData?.explanation || '',
                selectedOptionIndex: r.selectedOptionIndex,
                isCorrect: r.isCorrect
            };
        });

        res.status(200).json({
            message: 'Attempt submitted successfully',
            score,
            total: questionsFromDB.length,
            correct: correctCount,
            wrong: responses.length - correctCount,
            skipped: questionsFromDB.length - responses.length,
            bestScore: progress.bestScore,
            totalAttempts: progress.totalAttemptsEver,
            timeTaken: timeTaken || 0,
            detailedResults
        });

    } catch (err) {
        console.error('Submit attempt error:', err);
        res.status(500).json({ message: 'Error submitting attempt', error: err.message });
    }
};

/**
 * Batch: Get lightweight progress summary for ALL quizzes this user has attempted.
 * Returns a map: { quizId: { bestScore, totalAttemptsEver, lastAttemptDate } }
 * This avoids N individual requests from the Quizzes listing page.
 */
exports.getBatchProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const docs = await QuizProgress.find(
            { user: userId },
            { quiz: 1, bestScore: 1, totalAttemptsEver: 1, 'recentAttempts': { $slice: -1 } }
        ).lean();

        const progressMap = {};
        docs.forEach(d => {
            const lastAttempt = d.recentAttempts?.[0];
            progressMap[d.quiz.toString()] = {
                bestScore: d.bestScore,
                totalAttempts: d.totalAttemptsEver,
                lastScore: lastAttempt?.score ?? null,
                lastDate: lastAttempt?.attemptDate ?? null
            };
        });

        res.status(200).json({ progressMap });
    } catch (err) {
        console.error('Batch progress error:', err);
        res.status(500).json({ message: 'Error fetching batch progress', error: err.message });
    }
};

/**
 * Get user's quiz progress for a specific quiz.
 */
exports.getProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { quizId } = req.params;

        const progress = await QuizProgress.findOne({ user: userId, quiz: quizId });

        if (!progress) {
            return res.status(200).json({
                totalAttemptsEver: 0,
                bestScore: 0,
                recentAttempts: []
            });
        }

        res.status(200).json(progress);
    } catch (err) {
        console.error('Get progress error:', err);
        res.status(500).json({ message: 'Error fetching progress', error: err.message });
    }
};
