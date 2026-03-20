import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Ensure these imports point to your actual file paths
import { getAllLibraries, deleteLibrary, toggleLibraryStatus } from '../api/library';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, Armchair, ChevronRight,
    Trash2, Edit, Power, Star, Map, LayoutGrid
} from 'lucide-react';
import NearbyLibrariesMap from '../components/NearbyLibrariesMap';

const AllLibraries = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [libraries, setLibraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({});
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

    const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

    const fetchLibraries = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 12 };
            if (searchTerm) params.search = searchTerm;

            const response = await getAllLibraries(params);
            setLibraries(response.libraries);
            setPagination(response.pagination);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch libraries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLibraries(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleDelete = async (libId, libName) => {
        if (!confirm(`Are you sure you want to delete "${libName}"?`)) return;
        try {
            await deleteLibrary(libId);
            setLibraries(libraries.filter(l => l._id !== libId));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete library');
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

    // --- ANIMATION FIXES ---
    // 1. Removed staggering from the main container to prevent lag
    // 2. Applied staggering directly to the GRID
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
            transition: { type: "spring", stiffness: 50, damping: 15 } // Softer spring for smoother entry
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] text-gray-900 dark:text-white transition-colors duration-300">

            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
            </div>

            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">

                {/* Header Section - No Animation variants on parent wrapper to avoid 'stuck' state */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl font-bold tracking-tight mb-2">
                            Explore <span className="text-purple-600 dark:text-purple-400">Libraries</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Find the perfect space for your study sessions.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col sm:flex-row gap-4 w-full md:w-auto"
                    >
                        {/* Search Bar */}
                        <div className="relative group w-full md:w-80">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name or city..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all shadow-sm text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Map Toggle & Actions */}
                        <div className="flex gap-2 w-full md:w-auto overflow-hidden">
                            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                                >
                                    <LayoutGrid size={18} />
                                    <span className="hidden sm:inline">List</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('map')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                                >
                                    <Map size={18} />
                                    <span className="hidden sm:inline">Map</span>
                                </button>
                            </div>

                            {isAdmin && (
                                <button
                                    onClick={() => navigate('/add-library')}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <span>Add Library</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3">
                        <span className="text-xl">⚠️</span> {error}
                    </div>
                )}

                {/* Main Content Area */}
                {viewMode === 'map' ? (
                    <NearbyLibrariesMap />
                ) : loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="bg-white dark:bg-white/5 rounded-3xl h-80 animate-pulse border border-gray-200 dark:border-white/5" />
                        ))}
                    </div>
                ) : libraries.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-white/10">
                        <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No libraries found</h3>
                        <p className="text-gray-500 dark:text-gray-400">Try adjusting your search terms.</p>
                    </div>
                ) : (
                    /* FIX: The Grid itself is now a motion.div 
                       This ensures the 'visible' state is passed down to children correctly
                    */
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
                                whileHover={{ y: -5 }}
                                className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-none hover:shadow-2xl hover:shadow-purple-500/10 dark:hover:border-purple-500/20 transition-all duration-300 group flex flex-col h-full"
                            >
                                {/* Image Section */}
                                <div className="relative h-48 shrink-0 overflow-hidden bg-gray-100 dark:bg-white/5">
                                    {(lib.image || lib.images?.[0]?.url) ? (
                                        <img
                                            src={lib.image || lib.images[0].url}
                                            alt={lib.libraryName}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-white/20">
                                            <Armchair size={48} />
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4 backdrop-blur-md bg-black/30 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-2 z-10">
                                        <span className={`w-2 h-2 rounded-full ${lib.isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></span>
                                        {lib.isActive ? 'Active' : 'Inactive'}
                                    </div>

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>

                                {/* Content Section */}
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 mr-2">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                                                {lib.libraryName}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                <MapPin size={14} className="text-purple-500 shrink-0" />
                                                <span className="truncate">
                                                    {lib.location?.address?.city}, {lib.location?.address?.state}
                                                </span>
                                            </p>
                                        </div>
                                        {/* Rating Placeholder */}
                                        {lib.rating?.average > 0 && (
                                            <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2 py-1 rounded-lg shrink-0">
                                                <Star size={12} fill="currentColor" />
                                                <span className="text-xs">{lib.rating.average}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Amenities/Tags */}
                                    <div className="flex flex-wrap gap-2 mt-4 mb-6">
                                        <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-xs rounded-lg font-medium">
                                            {lib.totalSeats} Seats
                                        </span>
                                        {lib.amenities?.slice(0, 2).map((amenity, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-xs rounded-lg font-medium">
                                                {amenity}
                                            </span>
                                        ))}
                                        {lib.amenities?.length > 2 && (
                                            <span className="px-2 py-1 text-gray-400 text-xs text-center flex items-center">
                                                +{lib.amenities.length - 2}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-3">
                                        <button
                                            onClick={() => navigate(`/library/${lib._id}`)}
                                            className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            View Details
                                        </button>

                                        {isAdmin && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/edit-library/${lib._id}`)}
                                                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(lib._id)}
                                                    className={`p-2.5 rounded-xl hover:bg-opacity-20 transition-colors ${lib.isActive ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500' : 'bg-green-500/10 text-green-600 hover:bg-green-500'}`}
                                                    title={lib.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    <Power size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lib._id, lib.libraryName)}
                                                    className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Pagination Details (Only list view) */}
                {viewMode === 'list' && pagination.totalPages > 1 && (
                    <div className="mt-6 flex justify-center pb-10">
                        <div className="flex items-center gap-2 bg-white dark:bg-white/5 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10">
                            <button
                                onClick={() => fetchLibraries(pagination.currentPage - 1)}
                                disabled={!pagination.hasPrevPage}
                                className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-700 dark:text-gray-200"
                            >
                                <ChevronRight size={20} className="rotate-180" />
                            </button>
                            <span className="px-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => fetchLibraries(pagination.currentPage + 1)}
                                disabled={!pagination.hasNextPage}
                                className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-700 dark:text-gray-200"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AllLibraries;