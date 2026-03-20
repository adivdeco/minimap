import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLibraryById, rateLibrary, deleteReview } from '../api/library';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { Check, Star, MapPin, Phone, Globe, Clock, Shield, Zap, X, ChevronRight, Image as ImageIcon } from 'lucide-react';
import SmartLibraryScanner from '../components/SmartLibraryScanner';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { motion, AnimatePresence } from 'framer-motion';

const LibraryDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [library, setLibrary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);

    // Derived state for subscription
    const subscription = user?.studentDetails?.currentSubscription;
    const hasSubscription = !!subscription && subscription.status === 'active';

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

    if (loading) return <LoadingSpinner />;
    if (!library) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-300">

            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Hero Section */}
            <div className="relative h-[400px] w-full z-10">
                <div className="absolute inset-0">
                    <img
                        src={library.image || library.images?.[0]?.url || "https://i.pinimg.com/736x/0f/b5/24/0fb524592eedc447dcdd179a00962555.jpg"}
                        alt={library.libraryName}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-400 via-gray-500/60 blur-[40px] to-transparent"></div>
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
                                <span className="flex items-center gap-1 text-yellow-400 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-yellow-400/20">
                                    <Star size={14} fill="currentColor" />
                                    <span className="font-bold">{library.rating?.average?.toFixed(1) || 'New'}</span>
                                    <span className="text-white/60 text-sm">({library.rating?.count || 0} reviews)</span>
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">{library.libraryName}</h1>
                            <p className="text-lg text-gray-300 md:max-w-2xl text-shadow-sm">{library.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg shadow-white/10"
                                onClick={() => setShowScanner(true)}
                            >
                                Book a Seat
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Amenities */}
                        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Zap className="text-purple-600 dark:text-purple-400" />
                                Amenities
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {library.amenities?.map((amenity, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        <span className="text-gray-700 dark:text-gray-200">{amenity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Photo Gallery */}
                        {library.images && library.images.length > 0 && (
                            <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <ImageIcon className="text-purple-600 dark:text-purple-400" />
                                    Photo Gallery
                                </h2>
                                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 pt-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {library.images.map((img, index) => (
                                        <div key={index} className="relative w-72 h-72 sm:w-80 sm:h-80 shrink-0 snap-center rounded-2xl overflow-hidden group cursor-pointer border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 shadow-sm hover:shadow-lg dark:hover:shadow-purple-500/10 transition-all">
                                            <img src={img.url} alt={`Gallery ${index + 1} for ${library.libraryName}`} className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pricing Plans */}
                        <div>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Shield className="text-purple-600 dark:text-purple-400" />
                                Membership Plans
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {library.plans?.map((plan, index) => (
                                    <div key={index} className={`relative bg-white dark:bg-[#18181b] border ${plan.isPopular ? 'border-purple-500 dark:border-purple-500/50 shadow-lg shadow-purple-500/10' : 'border-gray-200 dark:border-white/10'} rounded-2xl p-6 transition-all hover:scale-[1.02] group`}>

                                        {/* Popular Badge */}
                                        {plan.isPopular && (
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                                MOST POPULAR
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                                            {plan.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{plan.description}</p>
                                            )}
                                        </div>

                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.price}</span>
                                            <span className="text-gray-500 dark:text-gray-400">/ {plan.durationInDays} days</span>
                                        </div>

                                        {/* Features List */}
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <Clock size={16} className="text-purple-500" />
                                                <span>{plan.hoursPerDay} hours per day</span>
                                            </div>
                                            {plan.features?.map((feature, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <Check size={16} className="text-green-500" />
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                            {plan.trialDays > 0 && (
                                                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                                    <Star size={16} fill="currentColor" />
                                                    <span>Includes {plan.trialDays}-day free trial</span>
                                                </div>
                                            )}
                                        </div>

                                        <button className="w-full py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold border border-gray-200 dark:border-white/10 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-all">
                                            Choose Plan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold mb-6">Reviews & Ratings</h2>

                            {/* Review Form */}
                            <form onSubmit={handleReviewSubmit} className="mb-8 p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Write a Review</h3>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Rating</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                                className={`text-2xl transition-transform hover:scale-110 ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Your Feedback</label>
                                    <textarea
                                        value={reviewForm.comment}
                                        onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white resize-none focus:outline-none focus:border-purple-500 transition-colors"
                                        rows={3}
                                        placeholder="Share your experience..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-purple-600/20"
                                >
                                    {submittingReview ? 'Submitting...' : 'Post Review'}
                                </button>
                            </form>

                            {/* Review List */}
                            <div className="space-y-6">
                                {library.rating?.reviews?.length > 0 ? (
                                    library.rating.reviews.slice().reverse().map((review, i) => (
                                        <div key={i} className="border-b border-gray-100 dark:border-white/5 pb-6 last:border-0 last:pb-0 relative group">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {review.userId?.avatar ? (
                                                        <img src={review.userId.avatar} alt="User" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-purple-500/50" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                                            {review.userId?.name?.[0] || 'U'}
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-gray-900 dark:text-gray-200">{review.userId?.name || 'User'}</span>
                                                </div>
                                                <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mb-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} className={`${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-700'}`} />
                                                ))}
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300">{review.comment}</p>

                                            {/* Delete Button */}
                                            {canDeleteReview(review) && (
                                                <button
                                                    onClick={() => handleDeleteReview(review._id)}
                                                    className="absolute top-0 right-0 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-white/10 rounded-full"
                                                    title="Delete Review"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-6">No reviews yet. Be the first to review!</p>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Info Card */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl p-6 sticky top-8 shadow-sm">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Library Details</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Address</label>
                                    <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                        <MapPin size={18} className="text-purple-500 mt-0.5 shrink-0" />
                                        <p>
                                            {library.location?.address?.street}<br />
                                            {library.location?.address?.city}, {library.location?.address?.state}<br />
                                            {library.location?.address?.pincode}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Contact Details</label>
                                    <div className="space-y-2">
                                        <a href={`tel:${library.contact?.phone}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                            <Phone size={18} className="text-purple-500" /> {library.contact?.phone}
                                        </a>
                                        {library.contact?.email && (
                                            <a href={`mailto:${library.contact?.email}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                                <span>✉️</span> {library.contact?.email}
                                            </a>
                                        )}
                                        {library.contact?.website && (
                                            <a href={library.contact.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                                <Globe size={18} className="text-purple-500" /> Visit Website
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Business Hours</label>
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <Clock size={18} className="text-purple-500" />
                                        <p>
                                            {library.businessHours?.is24x7 ? (
                                                <span className="text-green-500 font-semibold">Open 24x7</span>
                                            ) : (
                                                `${library.businessHours?.open} - ${library.businessHours?.close}`
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-6 mt-6 border-t border-gray-100 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        {library.ownerId?.avatar ? (
                                            <img src={library.ownerId.avatar} alt="Owner" className="w-10 h-10 rounded-full border border-purple-500/50" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
                                                {library.ownerId?.name?.[0]}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Managed by</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{library.ownerId?.name || 'Library Owner'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Scanner Modal */}
            <AnimatePresence>
                {showScanner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center "
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full bg-[#18181b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
                        >
                            <div className="">
                                <SmartLibraryScanner onClose={() => setShowScanner(false)} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Attendance Modal */}
                {showAttendance && hasSubscription && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm overflow-y-auto"
                    >
                        <div className="min-h-screen p-4">
                            <div className="max-w-6xl mx-auto">
                                <div className="flex items-center justify-between mb-8 pt-4">
                                    <button
                                        onClick={() => setShowAttendance(false)}
                                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ChevronRight size={20} className="rotate-180" />
                                        Back to Dashboard
                                    </button>
                                    <button
                                        onClick={() => setShowAttendance(false)}
                                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <X size={20} className="text-gray-400" />
                                    </button>
                                </div>

                                {/* Attendance Calendar Component */}
                                <div className="bg-[#0F0F12] border border-white/10 rounded-3xl overflow-hidden">
                                    <AttendanceCalendar />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LibraryDetails;
