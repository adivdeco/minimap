import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Target, XCircle, MinusCircle, Eye, Trophy, BarChart3, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const QuizRunner = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams();
    
    const quiz = location.state?.quiz || { title: "Assessment", time: 30, questions: 5 };

    const [phase, setPhase] = useState('countdown'); // 'countdown', 'test', 'submitted'
    const [countdownTimer, setCountdownTimer] = useState(3);
    
    const [timeLeft, setTimeLeft] = useState(quiz.time * 60);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});

    // Result state
    const [resultData, setResultData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [expandedQ, setExpandedQ] = useState(null);

    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await axios.get(`${API_URL}/quizzes/${id}/questions`, { withCredentials: true });
                setQuestions(res.data.questions || []);
            } catch (error) {
                console.error("Failed to fetch questions", error);
                setQuestions([]);
            } finally {
                setIsLoadingQuestions(false);
            }
        };
        if (id) {
            fetchQuestions();
        } else {
            setIsLoadingQuestions(false);
        }
    }, [id, API_URL]);

    // Phase 1: 3, 2, 1, GO
    useEffect(() => {
        if (phase === 'countdown') {
            if (countdownTimer > 0) {
                const timer = setTimeout(() => setCountdownTimer(prev => prev - 1), 1000);
                return () => clearTimeout(timer);
            } else if (countdownTimer === 0) {
                const timer = setTimeout(() => setPhase('test'), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [countdownTimer, phase]);

    // Phase 2: Actual Test Timer
    const autoSubmitTriggered = React.useRef(false);
    useEffect(() => {
        if (phase === 'test' && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1 && !autoSubmitTriggered.current) {
                        autoSubmitTriggered.current = true;
                        // Auto-submit via API
                        const timeTaken = quiz.time * 60;
                        const responses = Object.entries(answers).map(([qIdx, optIdx]) => ({
                            questionId: questions[parseInt(qIdx)]?._id,
                            selectedOptionIndex: optIdx
                        })).filter(r => r.questionId);
                        axios.post(`${API_URL}/quiz-progress/${id}/submit`, { responses, timeTaken }, { withCredentials: true })
                            .then(res => setResultData(res.data))
                            .catch(() => {})
                            .finally(() => setPhase('submitted'));
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (optionIndex) => {
        setAnswers({ ...answers, [currentQuestionIndex]: optionIndex });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleClear = () => {
        const newAnswers = { ...answers };
        delete newAnswers[currentQuestionIndex];
        setAnswers(newAnswers);
    };

    const handleSubmit = async () => {
        if(!confirm("Are you sure you want to submit your test?")) return;
        setIsSubmitting(true);
        try {
            const timeTaken = (quiz.time * 60) - timeLeft;
            const responses = Object.entries(answers).map(([qIdx, optIdx]) => ({
                questionId: questions[parseInt(qIdx)]._id,
                selectedOptionIndex: optIdx
            }));
            const res = await axios.post(`${API_URL}/quiz-progress/${id}/submit`, { responses, timeTaken }, { withCredentials: true });
            setResultData(res.data);
        } catch (err) {
            console.error('Submit error:', err);
            // Fallback: local scoring
            let correct = 0;
            const details = questions.map((q, i) => {
                const sel = answers[i];
                const isCorrect = sel !== undefined && sel === q.correctOptionIndex;
                if (isCorrect) correct++;
                return { questionText: q.questionText, options: q.options, correctOptionIndex: q.correctOptionIndex, explanation: q.explanation || '', selectedOptionIndex: sel ?? -1, isCorrect: sel !== undefined ? isCorrect : false };
            });
            const attempted = Object.keys(answers).length;
            setResultData({ score: correct, total: questions.length, correct, wrong: attempted - correct, skipped: questions.length - attempted, timeTaken: (quiz.time * 60) - timeLeft, detailedResults: details, bestScore: correct, totalAttempts: 1 });
        } finally {
            setIsSubmitting(false);
            setPhase('submitted');
        }
    };

    // --- RENDER LOADING & EMPTY STATES ---
    if (isLoadingQuestions) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 border-8 border-white dark:border-zinc-950 shadow-sm">
                        <Target size={40} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Coming Soon!</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                        We are currently preparing questions for this assessment. You will be notified when it's available.
                    </p>
                    <button 
                        onClick={() => navigate('/quizzes', { replace: true })}
                        className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    // --- RENDER COUNTDOWN PHASE ---
    if (phase === 'countdown') {
        return (
            <div className="fixed inset-0 min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center overflow-hidden z-50">
                <div className="absolute inset-0 bg-transparent backdrop-blur-[200px]" />
                <AnimatePresence mode="wait">
                    <motion.div
                        key={countdownTimer}
                        initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="relative z-10 font-bold text-9xl md:text-[12rem] bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-teal-500"
                    >
                        {countdownTimer > 0 ? countdownTimer : "GO!"}
                    </motion.div>
                </AnimatePresence>
                <div className="absolute bottom-20 z-10 text-zinc-500 dark:text-zinc-400 font-medium tracking-widest uppercase text-sm animate-pulse">
                    Preparing Environment
                </div>
            </div>
        );
    }

    // --- RENDER SUBMITTED PHASE ---
    if (phase === 'submitted') {
        const r = resultData;
        const attempted = Object.keys(answers).length;
        const fmtTime = (s) => `${Math.floor(s/60)}m ${s%60}s`;

        // If still submitting or no result yet
        if (isSubmitting || !r) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
        const circumference = 2 * Math.PI * 54;
        const strokeDash = (pct / 100) * circumference;
        const gradeColor = pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-rose-500';
        const gradeStroke = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
        const gradeLabel = pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Good Effort' : 'Keep Practicing';

        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6">
                <div className="max-w-2xl mx-auto">
                    {/* Score Card */}
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-center shadow-xl mb-4">
                        
                        {/* Score Ring */}
                        <div className="relative w-36 h-36 mx-auto mb-5">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-200 dark:text-zinc-800" />
                                <motion.circle cx="60" cy="60" r="54" fill="none" stroke={gradeStroke} strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset: circumference - strokeDash }} transition={{ duration: 1.5, ease: "easeOut" }} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-bold ${gradeColor}`}>{pct}%</span>
                                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Score</span>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{gradeLabel}</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{r.correct} out of {r.total} correct</p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                                <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-1" />
                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{r.correct}</div>
                                <div className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70 uppercase">Correct</div>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-500/10 p-3 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                                <XCircle size={18} className="mx-auto text-rose-500 mb-1" />
                                <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{r.wrong}</div>
                                <div className="text-[10px] font-medium text-rose-600/70 dark:text-rose-400/70 uppercase">Wrong</div>
                            </div>
                            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                                <MinusCircle size={18} className="mx-auto text-zinc-400 mb-1" />
                                <div className="text-xl font-bold text-zinc-500 dark:text-zinc-400">{r.total - attempted}</div>
                                <div className="text-[10px] font-medium text-zinc-500/70 uppercase">Skipped</div>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                <Clock size={18} className="mx-auto text-indigo-500 mb-1" />
                                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{fmtTime(r.timeTaken)}</div>
                                <div className="text-[10px] font-medium text-indigo-600/70 dark:text-indigo-400/70 uppercase">Time</div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button onClick={() => setShowReview(!showReview)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors text-sm">
                                <Eye size={16} /> {showReview ? 'Hide' : 'Review'} Answers
                            </button>
                            <button onClick={() => navigate('/quizzes', { replace: true })}
                                className="flex-1 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-sm">
                                Dashboard
                            </button>
                        </div>
                    </motion.div>

                    {/* Question Review */}
                    <AnimatePresence>
                    {showReview && r.detailedResults && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden">
                            {r.detailedResults.map((q, i) => {
                                const wasSkipped = q.selectedOptionIndex === undefined || q.selectedOptionIndex === -1;
                                const isExpanded = expandedQ === i;
                                return (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        className={`bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden transition-colors ${
                                            wasSkipped ? 'border-zinc-200 dark:border-zinc-800' : q.isCorrect ? 'border-emerald-200 dark:border-emerald-500/30' : 'border-rose-200 dark:border-rose-500/30'
                                        }`}>
                                        {/* Question Header */}
                                        <button onClick={() => setExpandedQ(isExpanded ? null : i)}
                                            className="w-full flex items-center gap-3 p-4 text-left">
                                            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                                wasSkipped ? 'bg-zinc-400' : q.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`}>
                                                {wasSkipped ? <MinusCircle size={14}/> : q.isCorrect ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                                            </div>
                                            <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                                                Q{i+1}. {q.questionText}
                                            </span>
                                            {isExpanded ? <ChevronUp size={16} className="text-zinc-400"/> : <ChevronDown size={16} className="text-zinc-400"/>}
                                        </button>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                                                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3 mt-3">{q.questionText}</p>
                                                <div className="space-y-2 mb-3">
                                                    {q.options.map((opt, oi) => {
                                                        const isCorrectOpt = oi === q.correctOptionIndex;
                                                        const isUserPick = oi === q.selectedOptionIndex;
                                                        let cls = 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30';
                                                        if (isCorrectOpt) cls = 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10';
                                                        if (isUserPick && !q.isCorrect) cls = 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10';
                                                        return (
                                                            <div key={oi} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${cls}`}>
                                                                <span className="flex-1 text-zinc-700 dark:text-zinc-300">{opt}</span>
                                                                {isCorrectOpt && <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>}
                                                                {isUserPick && !isCorrectOpt && <XCircle size={16} className="text-rose-500 shrink-0"/>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {q.explanation && (
                                                    <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-3">
                                                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Explanation</p>
                                                        <p className="text-sm text-indigo-800 dark:text-indigo-200">{q.explanation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // --- RENDER TEST INTERFACE ---
    const currentQ = questions[currentQuestionIndex];
    const isUrgent = timeLeft < 60; // Less than 1 min red text

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/quizzes', { replace: true })} 
                        className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
                        title="Exit Test"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200 leading-tight">
                            {quiz.title}
                        </h1>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className={`flex items-center gap-2 font-mono font-semibold text-lg ${isUrgent ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        <Timer size={20} />
                        {formatTime(timeLeft)}
                    </div>
                    <button onClick={handleSubmit} className="hidden sm:flex px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-500/20 transition-all">
                        Submit Test
                    </button>
                </div>
            </header>

            {/* Main Question Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col">
                <div className="flex-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-sm flex flex-col relative overflow-hidden">
                    {/* Decorative Background gradient */}
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-6">
                            <Target size={14} />
                            Q.{currentQuestionIndex + 1}
                        </div>
                        
                        <h2 className="text-xl sm:text-2xl font-medium text-zinc-800 dark:text-zinc-100 leading-relaxed mb-10">
                            {currentQ.questionText}
                        </h2>

                        <div className="space-y-3">
                            {currentQ.options.map((option, idx) => {
                                const isSelected = answers[currentQuestionIndex] === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionSelect(idx)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 border-2 ${
                                            isSelected 
                                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-[0_0_20px_-5px_rgba(99,102,241,0.15)]' 
                                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
                                            isSelected 
                                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-600 dark:bg-indigo-500' 
                                            : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                                        }`}>
                                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full scale-100" />}
                                        </div>
                                        <span className={`text-base flex-1 ${isSelected ? 'text-indigo-950 dark:text-indigo-100 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                            {option}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <button 
                        onClick={handleClear}
                        className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
                    >
                        Clear Response
                    </button>
                    
                    <div className="flex items-center gap-3 ml-auto">
                        <button 
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ArrowLeft size={16} />
                            Previous
                        </button>
                        
                        {currentQuestionIndex < questions.length - 1 ? (
                            <button 
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                            >
                                Save & Next
                                <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit}
                                className="flex sm:hidden items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                            >
                                Submit
                                <CheckCircle2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default QuizRunner;
