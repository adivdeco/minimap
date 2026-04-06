import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import SmartLibraryScanner from '../components/SmartLibraryScanner';
import CountdownTimer from '../components/CountdownTimer';
import UserSeatMap from '../components/UserSeatMap';
import { getLibrarySeats } from '../api/seat';
import { getNotices } from '../api/notice';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import {
    Library, CalendarDays, Sun, Moon, X, ChevronRight, Users, Bell
} from 'lucide-react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import ActiveSessionCard from '../components/dashboard/ActiveSessionCard';
import SubscriptionStatusCard from '../components/dashboard/SubscriptionStatusCard';
import QuickActionsGrid from '../components/dashboard/QuickActionsGrid';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import AttendanceCalendar from '../components/AttendanceCalendar';
import NoticeBoard from '../components/NoticeBoard';
import { OwnerAttendanceChart } from '@/components/dashboard/OwnerAttendanceChart';
import { OwnerShiftChart } from '@/components/dashboard/OwnerShiftChart';

// --- Animations ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const Home = () => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout, checkAuth } = useAuth();
    const { logout: auth0Logout } = useAuth0();
    const navigate = useNavigate();

    const [showScanner, setShowScanner] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [showNotices, setShowNotices] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);

    // Data Extraction
    const activeSeat = user?.studentDetails?.assignedSeat;
    const subscription = user?.studentDetails?.currentSubscription;
    const userRole = user?.role;

    // Handle both populated object and raw ID safely
    const libraryId = subscription?.libraryId?._id || subscription?.libraryId;
    const libraryName = subscription?.libraryId?.libraryName;
    const libraryAddress = subscription?.libraryId?.location?.address;

    const planDetails = subscription?.subscriptionId;


    // Handle both direct population and nested population
    const planName = planDetails?.planName || planDetails?.planId?.name;
    const totalDuration = planDetails?.planId?.durationInDays || planDetails?.durationInDays || 30; // Default fallback to avoid NaN
    const pricePaid = planDetails?.pricePaid;

    const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
    const startDate = subscription?.startDate ? new Date(subscription.startDate) : new Date();

    // Calculate Days Left & Progress
    const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;
    const daysElapsed = Math.max(0, Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24)));
    const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDuration) * 100));

    const hasSubscription = !!subscription && subscription.status === 'active';
    const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

    // --- Effects & Queries ---

    const { data: seats = [], isLoading: loadingSeats } = useQuery({
        queryKey: ['librarySeats', libraryId],
        queryFn: async () => {
            if (!libraryId) return [];
            return await getLibrarySeats(libraryId);
        },
        enabled: !!libraryId,
        staleTime: 5 * 60 * 1000 // Cache seats for 5 minutes to prevent unnecessary redraws
    });

    const { data: unreadNoticesCount = 0 } = useQuery({
        queryKey: ['unreadNotices', libraryId],
        queryFn: async () => {
            if (!libraryId) return 0;
            const data = await getNotices(libraryId, true);
            return data.notices?.length || 0;
        },
        enabled: !!libraryId,
        refetchInterval: 60000 // Poll every minute for new notices in the background
    });

    // --- Handlers ---

    const handleLogout = () => {
        logout();
        auth0Logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
        // Navigate is technically redundant here due to Auth0 redirect, but kept for safety
    };

    const handleCheckOut = async () => {
        if (!window.confirm("Are you sure you want to check out and release your seat?")) return;

        setCheckingOut(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL;
            const response = await axios.post(`${API_URL}/entry/check-out`, {}, { withCredentials: true });

            const { remainingTime, checkinsRemaining, maxDailyCheckins, msg } = response.data;
            const remainingTimeStr = remainingTime ? `${remainingTime.hours}h ${remainingTime.minutes}m` : '';

            toast.success(
                <div>
                    <p className="font-bold">Checked Out Successfully!</p>
                    <p className="text-sm opacity-90">{msg}</p>
                    {remainingTime && (
                        <div className="mt-2 text-xs opacity-80 border-t border-white/20 pt-1">
                            <p>Remaining: {remainingTimeStr}</p>
                            <p>Check-ins: {checkinsRemaining}/{maxDailyCheckins}</p>
                        </div>
                    )}
                </div>
            );

            if (checkAuth) checkAuth();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Checkout failed");
        } finally {
            setCheckingOut(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white selection:bg-purple-500/30 transition-colors duration-300">

            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-black/40 border-b border-gray-200 dark:border-white/5 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            {/* <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Library className="text-white" size={20} />
                            </div> */}
                            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Study<span className="text-purple-600 dark:text-purple-400">Space</span>
                            </span>
                        </motion.div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-2">
                            <NavLink onClick={() => navigate('/libraries')} icon={<Library size={16} />} text="Libraries" />
                            {hasSubscription && <NavLink onClick={() => setShowAttendance(true)} icon={<CalendarDays size={16} />} text="History" />}
                            {isAdmin && <NavLink onClick={() => navigate('/users')} icon={<Users size={16} />} text="Users" />}

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 ml-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>

                            {/* Notifications Bell */}
                            {libraryId && (
                                <button
                                    onClick={() => setShowNotices(true)}
                                    className="p-2 ml-1 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all relative"
                                    title="Notices"
                                >
                                    <Bell size={18} />
                                    {unreadNoticesCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Profile & Logout (Right Corner) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4"
                        >
                            {/* Quick Actions Bar */}
                            <div className="hidden md:flex items-center gap-3 mr-4">
                                {hasSubscription && (
                                    <button
                                        onClick={() => setShowAttendance(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all group"
                                    >
                                        <CalendarDays size={16} className="text-purple-400" />
                                        <span className="text-sm font-medium text-gray-500">Attendance</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate('/profile')}
                                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all cursor-pointer group"
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/50 group-hover:border-purple-400" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-inner text-white">
                                            {user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start leading-none gap-1">
                                        <span className="text-sm font-medium text-gray-500 group-hover:text-200 transition-colors">
                                            {user?.name?.split(' ')[0]}
                                        </span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                            {user?.role === 'student' ? 'Member' : user?.role}
                                        </span>
                                    </div>
                                </button>
                            </div>

                            {/* Mobile Profile & Theme */}
                            <div className="md:hidden flex items-center gap-3">
                                <button
                                    onClick={toggleTheme}
                                    className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
                                >
                                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                </button>

                                {libraryId && (
                                    <button
                                        onClick={() => setShowNotices(true)}
                                        className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all relative"
                                    >
                                        <Bell size={18} />
                                        {unreadNoticesCount > 0 && (
                                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                        )}
                                    </button>
                                )}

                                {hasSubscription && (
                                    <button
                                        onClick={() => setShowAttendance(true)}
                                        className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                                        title="Attendance"
                                    >
                                        <CalendarDays size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all cursor-pointer group"
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/50 group-hover:border-purple-400" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-inner text-white">
                                            {user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}

                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Header */}
                    <DashboardHeader user={user} />

                    {/* --- MASTER DASHBOARD GRID --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

                        {/* 1. MAIN STATUS CARD (Spans 2 columns) */}
                        <ActiveSessionCard
                            activeSeat={activeSeat}
                            libraryName={libraryName}
                            libraryAddress={libraryAddress}
                            checkingOut={checkingOut}
                            handleCheckOut={handleCheckOut}
                            setShowScanner={setShowScanner}
                        />

                        {/* 2. SUBSCRIPTION INFO (Side Card) */}
                        <SubscriptionStatusCard
                            planName={planName}
                            hasSubscription={hasSubscription}
                            pricePaid={pricePaid}
                            daysLeft={daysLeft}
                            progressPercentage={progressPercentage}
                            totalDuration={totalDuration}
                            expiryDate={expiryDate}
                        />
                    </div>

                    {/* --- FLOOR PLAN SECTION --- */}
                    {libraryId && (
                        <motion.div variants={itemVariants} className="mb-10 w-full space-y-6">

                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Live Floor Plan</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400 dark:bg-gray-600"></span> Occupied</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-300 dark:border-gray-600"></span> Available</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-600"></span> Yours</span>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-1 overflow-hidden shadow-xl dark:shadow-2xl dark:shadow-black/50">
                                    {loadingSeats ? (
                                        <div className="h-64 flex items-center justify-center text-gray-400 animate-pulse">
                                            Loading Layout...
                                        </div>
                                    ) : (
                                        <div className="bg-gray-100 dark:bg-[#1a1a20] rounded-[20px] overflow-hidden">
                                            <UserSeatMap seats={seats} activeSeatId={activeSeat?.seatId} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Attendance Dashboards for Owner */}
                    {
                        userRole === "library_owner" && (
                            <div className="">
                                <OwnerAttendanceChart libraryId={libraryId} />
                            </div>
                        )
                    }
                    {
                        userRole === "library_owner" && (
                            <div className="mt-3 mb-3">
                                <OwnerShiftChart libraryId={libraryId} />
                            </div>
                        )
                    }

                    {/* --- QUICK ACTIONS --- */}
                    <QuickActionsGrid
                        isAdmin={isAdmin}
                        userRole={user?.role}
                        setShowAttendance={setShowAttendance}
                    />
                </motion.div>
            </main>

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
                            {/* <button 
                                onClick={() => setShowScanner(false)}
                                className="absolute top-4 right-4 z-10 text-white bg-black/50 p-2 rounded-full hover:bg-black/80"
                            >
                                <X size={20} />
                            </button> */}
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
                        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm overflow-y-auto"
                    >
                        <div className="min-h-screen p-4">
                            <div className="max-w-6xl mx-auto">
                                <div className="flex items-center justify-between mb-8 pt-4">
                                    <button
                                        onClick={() => setShowAttendance(false)}
                                        className="flex items-center gap-2 text-white hover:text-white transition-colors"
                                    >
                                        <ChevronRight size={20} className="rotate-180" />
                                        Back to Dashboard
                                    </button>
                                    <button
                                        onClick={() => setShowAttendance(false)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/80 transition-colors"
                                    >
                                        {/* Changed LogOut to X for clearer UI */}
                                        <X size={20} className="text-white" />
                                    </button>
                                </div>

                                {/* Attendance Calendar Component */}
                                <div className="bg-[#0F0F12/50] border border-white/10 rounded-3xl overflow-hidden">
                                    <AttendanceCalendar />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Notifications Modal */}
                {showNotices && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-4 sm:p-6"
                        onClick={() => setShowNotices(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-lg relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowNotices(false)}
                                className="absolute -top-12 right-0 p-2 rounded-xl bg-white/10 hover:bg-red-500/80 transition-colors text-white border border-white/20"
                            >
                                <X size={20} />
                            </button>

                            <NoticeBoard libraryId={libraryId} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Helper Components ---

const NavLink = ({ icon, text, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
    >
        {icon}
        <span className="font-medium text-sm">{text}</span>
    </button>
);



export default Home;