import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllLibraries, deleteLibrary, toggleLibraryStatus } from '../api/library';
import { useAuth } from '../context/AuthContext';

const AllLibraries = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [libraries, setLibraries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({});

    const fetchLibraries = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 10 };
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
        fetchLibraries();
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

    const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => navigate('/')} className="text-purple-400 hover:text-purple-300 mb-2">
                            ← Back to Home
                        </button>
                        <h1 className="text-3xl font-bold text-white">All Libraries</h1>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/add-library')}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700"
                        >
                            + Add Library
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search libraries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                        {error}
                    </div>
                )}

                {/* Libraries Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500 mx-auto"></div>
                    </div>
                ) : libraries.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        No libraries found
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {libraries.map((lib) => (
                            <div key={lib._id} className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 overflow-hidden">
                                {/* Library Image */}
                                <div className="h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                    {lib.images?.[0]?.url ? (
                                        <img src={lib.images[0].url} alt={lib.libraryName} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-white">{lib.libraryName}</h3>
                                        <span className={`px-2 py-1 rounded text-xs ${lib.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {lib.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <p className="text-gray-400 text-sm mb-3">
                                        {lib.location?.address?.city}, {lib.location?.address?.state}
                                    </p>
{/* 
                                    <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
                                        <span>🪑 {lib.totalSeats} seats</span>
                                        <span>⭐ {lib.rating?.average || 0}</span>
                                    </div> */}

                                    {/* Amenities */}
                                    {lib.amenities?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {lib.amenities.slice(0, 3).map((a, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300">
                                                    {a}
                                                </span>
                                            ))}
                                            {lib.amenities.length > 3 && (
                                                <span className="px-2 py-0.5 text-xs text-gray-400">
                                                    +{lib.amenities.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-3 border-t border-white/10">
                                        <button
                                            onClick={() => navigate(`/library/${lib._id}`)}
                                            className="flex-1 py-2 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 text-sm"
                                        >
                                            View
                                        </button>
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={() => navigate(`/edit-library/${lib._id}`)}
                                                    className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(lib._id)}
                                                    className="py-2 px-3 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 text-sm"
                                                    title={lib.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {lib.isActive ? '⏸' : '▶'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lib._id, lib.libraryName)}
                                                    className="py-2 px-3 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm"
                                                >
                                                    🗑
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <button
                            onClick={() => fetchLibraries(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevPage}
                            className="px-4 py-2 bg-white/10 text-white rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-gray-400">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => fetchLibraries(pagination.currentPage + 1)}
                            disabled={!pagination.hasNextPage}
                            className="px-4 py-2 bg-white/10 text-white rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllLibraries;
