import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyLibraries, toggleLibraryStatus } from '../api/library';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';
import {
    MapPin, Armchair, Edit, Power, Users, Eye, Star,
    ArrowUpRight, Clock, Settings
} from 'lucide-react';

const MyLibraries = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [libraries, setLibraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMyLibraries();
    }, []);

    const fetchMyLibraries = async () => {
        setLoading(true);
        try {
            const response = await getMyLibraries();
            setLibraries(response.libraries);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch your libraries');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (libId) => {
        try {
            const response = await toggleLibraryStatus(libId);
            setLibraries(libraries.map(l =>
                l._id === libId ? { ...l, isActive: response.isActive } : l
            ));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to toggle status');
        }
    };

    // --- ANIMATION VARIANTS (Fixed) ---
    const gridContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 50, damping: 15 }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-300">

            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-900/10 rounded-full blur-[120px]" />
            </div>

            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                            My <span className="text-indigo-600 dark:text-indigo-400">Libraries</span>
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <button
                            onClick={() => navigate('/add-library')}
                            className="px-5 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm flex items-center gap-2 text-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Library Settings
                        </button>
                    </motion.div>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm font-medium"
                    >
                        <span className="text-lg">⚠️</span> {error}
                    </motion.div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="bg-white dark:bg-white/5 rounded-3xl h-96 animate-pulse border border-gray-200 dark:border-white/5" />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && libraries.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-24 bg-white dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-white/10"
                    >
                        <div className="w-20 h-20 mx-auto bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Armchair className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No libraries assigned</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't been assigned any libraries yet.</p>
                        <button
                            onClick={() => navigate('/add-library')}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Register New Library
                        </button>
                    </motion.div>
                )}

                {/* Libraries Grid */}
                {!loading && libraries.length > 0 && (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10"
                        variants={gridContainerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {libraries.map((lib) => (
                            <motion.div
                                key={lib._id}
                                variants={cardVariants}
                                className="group relative bg-white dark:bg-[#0F0F12] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:border-indigo-500/30 transition-all duration-300 flex flex-col"
                            >
                                {/* Image Header */}
                                <div className="relative h-56 shrink-0 overflow-hidden bg-gray-100 dark:bg-white/5">
                                    {(lib.image || lib.images?.[0]?.url) ? (
                                        <img
                                            src={lib.image || lib.images[0].url}
                                            alt={lib.libraryName}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-white/20">
                                            <Armchair size={48} />
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="absolute top-4 left-4">
                                        <div className={`backdrop-blur-md bg-black/40 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 ${lib.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                            <span className={`w-2 h-2 rounded-full ${lib.isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-400'}`}></span>
                                            {lib.isActive ? 'ONLINE' : 'OFFLINE'}
                                        </div>
                                    </div>

                                    {/* View Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                                        <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-white font-medium text-sm flex items-center gap-2">
                                            <Eye className="w-4 h-4" /> Preview Page
                                        </div>
                                    </div>
                                </div>

                                {/* Content Body */}
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                {lib.libraryName}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1.5">
                                                <MapPin size={14} className="text-indigo-500 shrink-0" />
                                                <span className="truncate">{lib.location?.address?.city}, {lib.location?.address?.state}</span>
                                            </p>
                                        </div>
                                        {lib.rating?.average > 0 && (
                                            <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg font-bold text-xs shrink-0">
                                                <Star size={12} fill="currentColor" />
                                                <span>{lib.rating.average}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                                                <Armchair size={12} /> Capacity
                                            </div>
                                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                {lib.totalSeats} <span className="text-xs font-normal text-gray-500">Seats</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                                                <Clock size={12} /> Hours
                                            </div>
                                            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                                12 <span className="text-xs font-normal text-gray-500">h/day</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-auto space-y-3">
                                        <button
                                            onClick={() => navigate(`/library/${lib._id}/users`)}
                                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <Users size={18} />
                                            <span>All Users & Attendence History</span>
                                            <ArrowUpRight size={16} className="opacity-60" />
                                        </button>

                                        <button
                                            onClick={() => navigate(`/library/${lib._id}/admin`)}
                                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <Users size={18} />
                                            <span>Edit Subs & plans</span>
                                            <ArrowUpRight size={16} className="opacity-60" />
                                        </button>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => navigate(`/edit-library/${lib._id}`)}
                                                className="py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
                                            >
                                                <Edit size={16} /> Edit Details
                                            </button>

                                            <button
                                                onClick={() => handleToggleStatus(lib._id)}
                                                className={`py-2.5 border font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${lib.isActive
                                                    ? 'border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                                                    : 'border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'
                                                    }`}
                                            >
                                                <Power size={16} />
                                                {lib.isActive ? 'Go Offline' : 'Go Online'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>
        </div>
    );
};

export default MyLibraries;