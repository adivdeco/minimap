import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Edit2, Trash2, X, CheckCircle2, Database } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ManageQuestions = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: quizId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const canManageQuizzes = user?.role === 'admin' || user?.role === 'co-admin';
    
    // We expect the quiz object to be passed via state. If not, we can fall back to a generic title.
    const quizTitle = location.state?.quiz?.title || "Assessment";

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: ''
    });


    useEffect(() => {
        if (!authLoading && !canManageQuizzes) {
            toast.error("You do not have permission to manage questions.");
            navigate('/quizzes', { replace: true });
            return;
        }
        if (!authLoading && canManageQuizzes) {
            fetchQuestions();
        }
    }, [quizId, canManageQuizzes, authLoading, navigate]);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/quizzes/${quizId}/questions`);
            setQuestions(res.data.questions || []);
        } catch (error) {

            toast.error("Failed to load questions.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (question = null) => {
        if (question) {
            setEditingId(question._id);
            setFormData({
                questionText: question.questionText || '',
                options: question.options && question.options.length === 4 ? [...question.options] : ['', '', '', ''],
                correctOptionIndex: question.correctOptionIndex || 0,
                explanation: question.explanation || ''
            });
        } else {
            setEditingId(null);
            setFormData({
                questionText: '',
                options: ['', '', '', ''],
                correctOptionIndex: 0,
                explanation: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.questionText.trim()) return toast.error("Question text is required.");
        if (formData.options.some(opt => !opt.trim())) return toast.error("All 4 options must be filled.");

        try {
            if (editingId) {
                // Update existing question
                await axiosClient.put(`/questions/${editingId}`, formData);
                toast.success("Question updated successfully!");
            } else {
                // Add new question
                await axiosClient.post(`/quizzes/${quizId}/questions`, formData);
                toast.success("Question added successfully!");
            }
            fetchQuestions();
            handleCloseModal();
        } catch (error) {

            toast.error(error.response?.data?.message || "Failed to save question.");
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            try {
                await axiosClient.delete(`/questions/${questionId}`);
                toast.success("Question deleted successfully!");
                fetchQuestions();
            } catch (error) {

                toast.error("Failed to delete question.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 dark:bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[size:24px_24px] text-zinc-900 dark:text-zinc-50 transition-colors duration-300 pb-20 font-sans">
            
            {/* Header Area */}
            <div className="sticky top-0 z-40 bg-zinc-50/90 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/80 pt-8 pb-5 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-lg bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all shadow-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                    Manage Questions
                                </h1>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{quizTitle}</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-indigo-500/20 transition-all"
                        >
                            <Plus size={18} />
                            Add Question
                        </button>
                    </div>
                </div>
            </div>

            {/* Questions List Area */}
            <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
                {loading ? (
                    <div className="py-20 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                            <Database size={32} />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No Questions Yet</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">Start building your assessment by adding your first multiple-choice question.</p>
                        <button onClick={() => handleOpenModal()} className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
                            Add First Question
                        </button>
                    </div>
                ) : (
                    questions.map((q, index) => (
                        <div key={q._id} className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm relative group transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                            {/* Action Buttons */}
                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(q)} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteQuestion(q._id)} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Question Content */}
                            <div className="flex gap-4 mb-6">
                                <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                    {index + 1}
                                </div>
                                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mt-1 pr-20">
                                    {q.questionText}
                                </h3>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-12">
                                {q.options.map((opt, oIndex) => {
                                    const isCorrect = q.correctOptionIndex === oIndex;
                                    return (
                                        <div 
                                            key={oIndex} 
                                            className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                                                isCorrect 
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' 
                                                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800'
                                            }`}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                {isCorrect ? (
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                                                )}
                                            </div>
                                            <span className={`text-sm ${isCorrect ? 'text-emerald-800 dark:text-emerald-300 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                {opt}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                                <div className="mt-4 pl-12">
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl text-sm text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800/50">
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 mr-2">Explanation:</span>
                                        {q.explanation}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </main>

            {/* Question Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={handleCloseModal}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"
                        >
                            <div className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 p-6 flex justify-between items-center z-10">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                    {editingId ? 'Edit Question' : 'Add New Question'}
                                </h2>
                                <button onClick={handleCloseModal} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Question Text */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Question Text</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={formData.questionText}
                                        onChange={(e) => setFormData({...formData, questionText: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                                        placeholder="Enter your question here..."
                                    />
                                </div>

                                {/* Options */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Options & Correct Answer</label>
                                    <div className="space-y-3">
                                        {[0, 1, 2, 3].map(index => (
                                            <div key={index} className="flex items-center gap-3">
                                                <input 
                                                    type="radio"
                                                    name="correctOption"
                                                    checked={formData.correctOptionIndex === index}
                                                    onChange={() => setFormData({...formData, correctOptionIndex: index})}
                                                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
                                                />
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                                                        {String.fromCharCode(65 + index)}.
                                                    </span>
                                                    <input
                                                        required
                                                        type="text"
                                                        value={formData.options[index]}
                                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                                                            formData.correctOptionIndex === index 
                                                            ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30' 
                                                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                                                        }`}
                                                        placeholder={`Option ${index + 1}`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Explanation (Optional)</label>
                                    <textarea
                                        rows={2}
                                        value={formData.explanation}
                                        onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                                        placeholder="Explain why the answer is correct..."
                                    />
                                </div>

                                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={handleCloseModal}
                                        className="px-5 py-2.5 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-sm shadow-indigo-500/20"
                                    >
                                        {editingId ? 'Save Changes' : 'Add Question'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageQuestions;
