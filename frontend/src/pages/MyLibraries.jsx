import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyLibraries, toggleLibraryStatus } from '../api/library';
import { useAuth } from '../context/AuthContext';

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

    return (
        <div className="min-h-screen bg-gray-50 font-sans py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 mb-2 font-medium">
                            ← Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">My Libraries</h1>
                        <p className="text-gray-500 mt-1">Manage your owned libraries</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Libraries Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                ) : libraries.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="text-5xl mb-4">🏢</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Libraries Found</h3>
                        <p className="text-gray-500">You haven't been assigned any libraries yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {libraries.map((lib) => (
                            <div key={lib._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Library Image */}
                                <div className="h-48 bg-gray-100 relative">
                                    {lib.images?.[0]?.url ? (
                                        <img src={lib.images[0].url} alt={lib.libraryName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${lib.isActive
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-red-100 text-red-800 border border-red-200'
                                            }`}>
                                            {lib.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{lib.libraryName}</h3>
                                    <p className="text-gray-500 text-sm mb-4">
                                        {lib.location?.address?.city}, {lib.location?.address?.state}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                                        <span className="flex items-center gap-1">
                                            🪑 {lib.totalSeats} seats
                                        </span>
                                        <span className="flex items-center gap-1">
                                            ⭐ {lib.rating?.average || 0}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => navigate(`/edit-library/${lib._id}`)}
                                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Edit Details
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(lib._id)}
                                            className={`px-4 py-2 font-medium rounded-lg transition-colors ${lib.isActive
                                                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                                }`}
                                        >
                                            {lib.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/library/${lib._id}`)}
                                        className="w-full mt-3 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        View Full Preview
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyLibraries;
