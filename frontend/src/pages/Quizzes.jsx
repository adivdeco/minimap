import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Clock, Target, Atom, Beaker, Award, Code, Brain, Zap, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const CATEGORIES = ["All", "Class 10", "Class 11", "Class 12", "IIT JEE", "NEET", "General"];

const ICON_MAP = {
    'Beaker': Beaker,
    'Target': Target,
    'Atom': Atom,
    'Award': Award,
    'Code': Code,
    'Brain': Brain,
    'Zap': Zap,
};

const THEME_MAP = {
    'emerald': { accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10', darkHover: 'dark:hover:border-emerald-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]' },
    'blue': { accent: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10', darkHover: 'dark:hover:border-blue-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.15)]' },
    'amber': { accent: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10', darkHover: 'dark:hover:border-amber-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]' },
    'rose': { accent: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10', darkHover: 'dark:hover:border-rose-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(225,29,72,0.15)]' },
    'indigo': { accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10', darkHover: 'dark:hover:border-indigo-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]' },
    'teal': { accent: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-500/10', darkHover: 'dark:hover:border-teal-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(20,184,166,0.15)]' },
    'slate': { accent: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-500/10', darkHover: 'dark:hover:border-slate-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(148,163,184,0.15)]' },
    'orange': { accent: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10', darkHover: 'dark:hover:border-orange-500/30 dark:hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.15)]' },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

const Quizzes = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentQuizId, setCurrentQuizId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        category: 'Class 10',
        questions: 50,
        time: 60,
        difficulty: 'Medium',
        iconName: 'Target',
        themeColor: 'emerald'
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/quizzes`, { withCredentials: true });
            setQuizzes(res.data.quizzes || []);
        } catch (error) {
            console.error("Failed to fetch quizzes", error);
            toast.error("Failed to load assessments.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (quiz = null) => {
        if (quiz) {
            setEditMode(true);
            setCurrentQuizId(quiz._id);
            setFormData({
                title: quiz.title,
                category: quiz.category,
                questions: quiz.questions,
                time: quiz.time,
                difficulty: quiz.difficulty,
                iconName: quiz.iconName,
                themeColor: quiz.themeColor
            });
        } else {
            setEditMode(false);
            setCurrentQuizId(null);
            setFormData({ title: '', category: 'Class 10', questions: 50, time: 60, difficulty: 'Medium', iconName: 'Target', themeColor: 'emerald' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await axios.put(`${API_URL}/quizzes/${currentQuizId}`, formData, { withCredentials: true });
                toast.success("Mock test updated successfully!");
            } else {
                await axios.post(`${API_URL}/quizzes`, formData, { withCredentials: true });
                toast.success("Mock test created successfully!");
            }
            fetchQuizzes();
            handleCloseModal();
        } catch (error) {
            console.error("Error saving quiz:", error);
            toast.error(error.response?.data?.message || "Something went wrong.");
        }
    };

    const handleDeleteQuiz = async (id) => {
        if (!confirm("Are you sure you want to delete this mock test?")) return;
        try {
            await axios.delete(`${API_URL}/quizzes/${id}`, { withCredentials: true });
            toast.success("Mock test deleted successfully.");
            fetchQuizzes();
        } catch (error) {
            console.error("Error deleting quiz:", error);
            toast.error("Failed to delete the mock test.");
        }
    };

    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesCategory = activeCategory === 'All' || quiz.category === activeCategory;
        const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 dark:bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[size:24px_24px] text-zinc-900 dark:text-zinc-50 transition-colors duration-300 pb-20 font-sans">
            
            {/* Header Area */}
            <div className="sticky top-0 z-40 bg-zinc-50/90 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/80 pt-8 pb-5 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-lg bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all shadow-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                    Practice & Mock Tests
                                </h1>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Select your batch and begin your assessment.</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-indigo-500/20 transition-all"
                        >
                            <Plus size={18} />
                            Add Mock Test
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-5 items-center justify-between">
                        {/* Categories */}
                        <div className="flex w-full overflow-x-auto pb-2 sm:pb-0 hide-scrollbar gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border ${
                                        activeCategory === cat 
                                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 dark:shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)]' 
                                        : 'bg-transparent border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-72 shrink-0 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-300 transition-colors" size={16} />
                            <input 
                                type="text"
                                placeholder="Search assessments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm transition-all shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-zinc-200"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {loading ? (
                    <div className="py-20 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredQuizzes.length > 0 ? (
                                filteredQuizzes.map((quiz) => {
                                    const Icon = ICON_MAP[quiz.iconName] || Target;
                                    const theme = THEME_MAP[quiz.themeColor] || THEME_MAP['emerald'];
                                    
                                    return (
                                        <motion.div
                                            key={quiz._id}
                                            layout
                                            variants={cardVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className={`group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 shadow-sm hover:shadow-md transition-all duration-300 ${theme.darkHover}`}
                                        >
                                            {/* Edit / Delete Buttons -> Reveal on hover */}
                                            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(quiz)} className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteQuiz(quiz._id)} className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-2.5 rounded-lg ${theme.accent} transition-colors duration-300`}>
                                                        <Icon size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-transparent dark:border-zinc-700/50">
                                                        {quiz.category}
                                                    </span>
                                                </div>
                                                
                                                <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-200 leading-tight mb-2 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors pr-10">
                                                    {quiz.title}
                                                </h3>
                                                
                                                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-zinc-500 dark:text-zinc-400/80 mb-6">
                                                    <div className="flex items-center gap-1.5">
                                                        <Target size={14} className="opacity-70" />
                                                        <span>{quiz.questions} Qs</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={14} className="opacity-70" />
                                                        <span>{quiz.time} min</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${
                                                            quiz.difficulty === 'Easy' ? 'bg-emerald-500 dark:shadow-emerald-500/50' :
                                                            quiz.difficulty === 'Medium' ? 'bg-amber-500 dark:shadow-amber-500/50' : 'bg-rose-500 dark:shadow-rose-500/50'
                                                        }`} />
                                                        <span className="dark:text-zinc-300">{quiz.difficulty}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button className="w-full py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-100 text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-900 text-sm font-semibold transition-all duration-300 border border-zinc-200 dark:border-zinc-700/50 group-hover:border-zinc-300">
                                                Start Practice
                                            </button>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-600"
                                >
                                    <Target size={40} className="mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No assessments found matching your criteria.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>

            {/* Form Modal */}
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
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
                        >
                            <div className="flex justify-between items-center p-5 border-b border-zinc-200 dark:border-zinc-800">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    {editMode ? 'Edit Mock Test' : 'Add Mock Test'}
                                </h3>
                                <button onClick={handleCloseModal} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        placeholder="e.g. Science Full Mock Test"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                                        <select 
                                            value={formData.category}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        >
                                            {CATEGORIES.filter(c => c !== "All").map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Difficulty</label>
                                        <select 
                                            value={formData.difficulty}
                                            onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        >
                                            <option value="Easy">Easy</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Hard">Hard</option>
                                            <option value="Expert">Expert</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Questions</label>
                                        <input 
                                            type="number" 
                                            required min="1"
                                            value={formData.questions}
                                            onChange={(e) => setFormData({...formData, questions: parseInt(e.target.value)})}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Time (mins)</label>
                                        <input 
                                            type="number" 
                                            required min="1"
                                            value={formData.time}
                                            onChange={(e) => setFormData({...formData, time: parseInt(e.target.value)})}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Icon</label>
                                        <select 
                                            value={formData.iconName}
                                            onChange={(e) => setFormData({...formData, iconName: e.target.value})}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        >
                                            {Object.keys(ICON_MAP).map(key => <option key={key} value={key}>{key}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Theme Color</label>
                                        <select 
                                            value={formData.themeColor}
                                            onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white capitalize"
                                        >
                                            {Object.keys(THEME_MAP).map(key => <option key={key} value={key}>{key}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={handleCloseModal}
                                        className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-sm shadow-indigo-500/30 transition-colors"
                                    >
                                        {editMode ? 'Save Changes' : 'Create Test'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Quizzes;