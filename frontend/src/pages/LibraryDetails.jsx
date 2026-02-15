import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLibraryById, rateLibrary, deleteReview } from '../api/library';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const LibraryDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [library, setLibrary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        fetchLibrary();
    }, [id]);

    const fetchLibrary = async () => {
        try {
            const response = await getLibraryById(id);
            setLibrary(response.library);
        } catch (error) {
            toast.error("Failed to load library details");
            navigate('/libraries');
        } finally {
            setLoading(false);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();

        // Client-side check for duplicate review
        const hasReviewed = library.rating?.reviews?.some(
            review => review.userId?._id === user?._id || review.userId === user?._id
        );

        if (hasReviewed) {
            toast.error("You have already reviewed this library");
            return;
        }

        setSubmittingReview(true);
        try {
            const response = await rateLibrary(id, reviewForm);
            setLibrary(prev => ({
                ...prev,
                rating: response.rating
            }));
            toast.success("Review submitted successfully!");
            setReviewForm({ rating: 5, comment: '' });
        } catch (error) {
            // Explicitly handle the duplicate review case if backend sends it
            const errorMessage = error.response?.data?.message || "Failed to submit review";
            toast.error(errorMessage);
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!confirm("Are you sure you want to delete this review?")) return;
        try {
            const response = await deleteReview(id, reviewId);
            setLibrary(prev => ({
                ...prev,
                rating: response.rating
            }));
            toast.success("Review deleted successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete review");
        }
    };

    const canDeleteReview = (review) => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'co-admin') return true;
        if (library.ownerId?._id === user._id) return true;
        if (review.userId?._id === user._id) return true;
        return false;
    };

    if (loading) return (
        <LoadingSpinner/>
    );

    if (!library) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Hero Section */}
            <div className="relative h-[400px] w-full">
                <div className="absolute inset-0">
                    <img
                        src={library.images?.[0]?.url || "https://i.pinimg.com/736x/0f/b5/24/0fb524592eedc447dcdd179a00962555.jpg"}
                        alt={library.libraryName}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                    <button onClick={() => navigate('/libraries')} className="mb-6 text-white/80 hover:text-white flex items-center gap-2 transition-colors">
                        ← Back to Libraries
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${library.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    {library.isActive ? 'Open Now' : 'Closed'}
                                </span>
                                <span className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20">
                                    ⭐ <span className="font-bold">{library.rating?.average?.toFixed(1) || 'New'}</span>
                                    <span className="text-yellow-400/60 text-sm">({library.rating?.count || 0} reviews)</span>
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">{library.libraryName}</h1>
                            <p className="text-lg text-gray-300 md:max-w-2xl">{library.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg shadow-white/10">
                                Book a Seat
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Amenities */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                            <h2 className="text-2xl font-bold mb-6">Amenities</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {library.amenities?.map((amenity, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                        <span className="text-gray-200">{amenity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pricing Plans */}
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Membership Plans</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {library.plans?.map((plan, index) => (
                                    <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all group">
                                        <h3 className="text-xl font-bold text-white mb-2">{plan.title}</h3>
                                        <div className="text-3xl font-bold text-purple-400 mb-4">
                                            ₹{plan.price}<span className="text-sm text-gray-400 font-normal">/{plan.durationInDays} days</span>
                                        </div>
                                        <button className="w-full py-2 rounded-lg bg-purple-500/20 text-purple-300 font-semibold group-hover:bg-purple-500 group-hover:text-white transition-all">
                                            Choose Plan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                            <h2 className="text-2xl font-bold mb-6">Reviews & Ratings</h2>

                            {/* Review Form */}
                            <form onSubmit={handleReviewSubmit} className="mb-8 p-6 bg-black/20 rounded-xl border border-white/5">
                                <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-2">Rating</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                                className={`text-2xl transition-transform hover:scale-110 ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-2">Your Feedback</label>
                                    <textarea
                                        value={reviewForm.comment}
                                        onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white resize-none focus:outline-none focus:border-purple-500 transition-colors"
                                        rows={3}
                                        placeholder="Share your experience..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                                >
                                    {submittingReview ? 'Submitting...' : 'Post Review'}
                                </button>
                            </form>

                            {/* Review List */}
                            <div className="space-y-6">
                                {library.rating?.reviews?.length > 0 ? (
                                    library.rating.reviews.slice().reverse().map((review, i) => (
                                        <div key={i} className="border-b border-white/10 pb-6 last:border-0 last:pb-0 relative group">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {review.userId?.avatar ? (
                                                        <img src={review.userId.avatar} alt="User" className="w-8 h-8 rounded-full border border-purple-500/50" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                                                            {review.userId?.name?.[0] || 'U'}
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-gray-200">{review.userId?.name || 'User'}</span>
                                                </div>
                                                <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mb-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-700'}`}>★</span>
                                                ))}
                                            </div>
                                            <p className="text-gray-300">{review.comment}</p>

                                            {/* Delete Button */}
                                            {canDeleteReview(review) && (
                                                <button
                                                    onClick={() => handleDeleteReview(review._id)}
                                                    className="absolute top-0 right-0 p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 rounded-full"
                                                    title="Delete Review"
                                                >
                                                    🗑
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 text-center py-6">No reviews yet. Be the first to review!</p>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Info Card */}
                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sticky top-8">
                            <h3 className="text-xl font-bold mb-4">Library Details</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Address</label>
                                    <p className="text-gray-300">
                                        {library.location?.address?.street}<br />
                                        {library.location?.address?.city}, {library.location?.address?.state}<br />
                                        {library.location?.address?.pincode}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Contact Details</label>
                                    <div className="space-y-2">
                                        <a href={`tel:${library.contact?.phone}`} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                                            <span>📞</span> {library.contact?.phone}
                                        </a>
                                        {library.contact?.email && (
                                            <a href={`mailto:${library.contact?.email}`} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                                                <span>✉️</span> {library.contact?.email}
                                            </a>
                                        )}
                                        {library.contact?.website && (
                                            <a href={library.contact.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                                                <span>🌐</span> Visit Website
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Business Hours</label>
                                    <p className="text-gray-300">
                                        {library.businessHours?.is24x7 ? (
                                            <span className="text-green-400 font-semibold">Open 24x7</span>
                                        ) : (
                                            `${library.businessHours?.open} - ${library.businessHours?.close}`
                                        )}
                                    </p>
                                </div>

                                <div className="pt-6 mt-6 border-t border-white/10">
                                    <div className="flex items-center gap-3">
                                        {library.ownerId?.avatar ? (
                                            <img src={library.ownerId.avatar} alt="Owner" className="w-10 h-10 rounded-full border border-purple-500/50" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
                                                {library.ownerId?.name?.[0]}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-400">Managed by</p>
                                            <p className="font-semibold text-white">{library.ownerId?.name || 'Library Owner'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LibraryDetails;
