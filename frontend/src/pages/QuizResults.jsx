import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trophy, Clock, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, Target } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const QuizResults = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const quiz = location.state?.quiz || { title: 'Assessment', questions: 0 };

    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [expandedQ, setExpandedQ] = useState(null);
    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [progRes, qRes] = await Promise.all([
                    axiosClient.get(`/quiz-progress/${id}`),
                    axiosClient.get(`/quizzes/${id}/questions`)
                ]);
                setProgress(progRes.data);
                setQuestions(qRes.data.questions || []);
                // Auto-select latest attempt
                const attempts = progRes.data.recentAttempts || [];
                if (attempts.length > 0) setSelectedAttempt(attempts.length - 1);
            } catch (err) {

            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const fmtTime = (s) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—';
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const attempts = progress?.recentAttempts || [];
    const totalQs = quiz.questions || questions.length;

    // Build question lookup for review
    const qMap = {};
    questions.forEach(q => { qMap[q._id] = q; });

    const currentAttempt = selectedAttempt !== null ? attempts[selectedAttempt] : null;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-8 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <button onClick={() => navigate('/quizzes')} className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200 truncate">{quiz.title}</h1>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Your Results & History</p>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
                {/* Summary Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                            <Trophy size={28} className="text-amber-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                                {progress?.bestScore ?? 0}<span className="text-base font-normal text-zinc-400">/{totalQs}</span>
                            </div>
                            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Best Score • {progress?.totalAttemptsEver ?? 0} Total Attempts</div>
                        </div>
                    </div>

                    {/* Best Score Progress Bar */}
                    {totalQs > 0 && (() => {
                        const pct = Math.round(((progress?.bestScore ?? 0) / totalQs) * 100);
                        const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                        return (
                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                                    className={`h-full rounded-full ${barColor}`} />
                            </div>
                        );
                    })()}
                </motion.div>

                {/* Attempt Tabs */}
                {attempts.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {attempts.map((a, i) => {
                            const isActive = selectedAttempt === i;
                            return (
                                <button key={i} onClick={() => { setSelectedAttempt(i); setExpandedQ(null); }}
                                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                        isActive
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                    }`}>
                                    Attempt {i + 1}
                                    <span className={`ml-2 text-xs ${isActive ? 'text-indigo-200' : 'text-zinc-400'}`}>{a.score}/{totalQs}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Selected Attempt Detail */}
                {currentAttempt && (
                    <motion.div key={selectedAttempt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {(() => {
                                const correct = currentAttempt.responses?.filter(r => r.isCorrect).length ?? 0;
                                const wrong = currentAttempt.responses?.filter(r => !r.isCorrect).length ?? 0;
                                const skipped = totalQs - (currentAttempt.responses?.length ?? 0);
                                return (
                                    <>
                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                                            <CheckCircle2 size={16} className="mx-auto text-emerald-500 mb-1" />
                                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{correct}</div>
                                            <div className="text-[10px] font-medium text-emerald-600/70 uppercase">Correct</div>
                                        </div>
                                        <div className="bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-100 dark:border-rose-500/20 text-center">
                                            <XCircle size={16} className="mx-auto text-rose-500 mb-1" />
                                            <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{wrong}</div>
                                            <div className="text-[10px] font-medium text-rose-600/70 uppercase">Wrong</div>
                                        </div>
                                        <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                                            <MinusCircle size={16} className="mx-auto text-zinc-400 mb-1" />
                                            <div className="text-lg font-bold text-zinc-500 dark:text-zinc-400">{skipped}</div>
                                            <div className="text-[10px] font-medium text-zinc-500/70 uppercase">Skipped</div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 px-1">
                            <div className="flex items-center gap-1"><Clock size={13} /> {fmtTime(currentAttempt.timeTaken)}</div>
                            <div>{fmtDate(currentAttempt.attemptDate)}</div>
                        </div>

                        {/* Per-Question Review */}
                        <div className="space-y-2">
                            {(currentAttempt.responses || []).map((resp, i) => {
                                const q = qMap[resp.questionId] || {};
                                const isExpanded = expandedQ === i;
                                const wasSkipped = resp.selectedOptionIndex === undefined || resp.selectedOptionIndex === null;
                                return (
                                    <div key={i} className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${
                                        wasSkipped ? 'border-zinc-200 dark:border-zinc-800' : resp.isCorrect ? 'border-emerald-200 dark:border-emerald-500/30' : 'border-rose-200 dark:border-rose-500/30'
                                    }`}>
                                        <button onClick={() => setExpandedQ(isExpanded ? null : i)}
                                            className="w-full flex items-center gap-3 p-3 text-left">
                                            <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                                wasSkipped ? 'bg-zinc-400' : resp.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`}>
                                                {wasSkipped ? <MinusCircle size={12} /> : resp.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                            </div>
                                            <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                                                Q{i + 1}. {q.questionText || 'Question'}
                                            </span>
                                            {isExpanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                                        </button>

                                        <AnimatePresence>
                                        {isExpanded && q.options && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden">
                                                <div className="px-3 pb-3 border-t border-zinc-100 dark:border-zinc-800">
                                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 my-2">{q.questionText}</p>
                                                    <div className="space-y-1.5 mb-2">
                                                        {q.options.map((opt, oi) => {
                                                            const isCorrectOpt = oi === q.correctOptionIndex;
                                                            const isUserPick = oi === resp.selectedOptionIndex;
                                                            let cls = 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30';
                                                            if (isCorrectOpt) cls = 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10';
                                                            if (isUserPick && !resp.isCorrect) cls = 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10';
                                                            return (
                                                                <div key={oi} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${cls}`}>
                                                                    <span className="flex-1 text-zinc-700 dark:text-zinc-300">{opt}</span>
                                                                    {isCorrectOpt && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                                                                    {isUserPick && !isCorrectOpt && <XCircle size={14} className="text-rose-500 shrink-0" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {q.explanation && (
                                                        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg p-2.5">
                                                            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">Explanation</p>
                                                            <p className="text-sm text-indigo-800 dark:text-indigo-200">{q.explanation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {attempts.length === 0 && (
                    <div className="py-16 text-center text-zinc-400 dark:text-zinc-600">
                        <Target size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No attempts yet for this assessment.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default QuizResults;
