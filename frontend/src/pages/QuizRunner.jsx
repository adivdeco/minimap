import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Target } from 'lucide-react';
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
    useEffect(() => {
        if (phase === 'test' && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setPhase('submitted');
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

    const handleSubmit = () => {
        if(confirm("Are you sure you want to submit your test?")) {
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
                        onClick={() => navigate('/quizzes')}
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
        const attempted = Object.keys(answers).length;
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 border-8 border-white dark:border-zinc-950 shadow-sm">
                        <CheckCircle2 size={40} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Test Submitted!</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-8">Your responses have been successfully recorded.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{attempted}</div>
                            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Attempted</div>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <div className="text-3xl font-bold text-zinc-400 dark:text-zinc-500 mb-1">{questions.length - attempted}</div>
                            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Skipped</div>
                        </div>
                    </div>

                    <button 
                        onClick={() => navigate('/quizzes')}
                        className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </motion.div>
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
                        onClick={() => navigate('/quizzes')} 
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
