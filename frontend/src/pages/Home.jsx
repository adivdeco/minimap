import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import SmartLibraryScanner from '../components/SmartLibraryScanner';
import CountdownTimer from '../components/CountdownTimer';
import UserSeatMap from '../components/UserSeatMap';
import { getLibrarySeats } from '../api/seat';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    LogOut, MapPin, Armchair, Library, QrCode,
    LayoutDashboard, Users, PlusCircle, BookOpen, CalendarDays,
    ChevronRight, CreditCard, Clock, Sun, Moon,
    LibraryBig, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import AttendanceCalendar from '../components/AttendanceCalendar';

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
    const [checkingOut, setCheckingOut] = useState(false);

    // Seat Canvas State
    const [seats, setSeats] = useState([]);
    const [loadingSeats, setLoadingSeats] = useState(false);

    // Data Extraction
    const activeSeat = user?.studentDetails?.assignedSeat;
    const subscription = user?.studentDetails?.currentSubscription;

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

    // --- Effects ---

    useEffect(() => {
        const fetchSeats = async () => {
            if (!libraryId) return;
            setLoadingSeats(true);
            try {
                const data = await getLibrarySeats(libraryId);
                setSeats(data);
            } catch (error) {
                console.error("Failed to load seats", error);
            } finally {
                setLoadingSeats(false);
            }
        };

        if (libraryId) {
            fetchSeats();
        }
        // Fix: Use primitive values in dependency array to avoid infinite loops
    }, [libraryId, activeSeat?.seatNumber]);

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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
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
                            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Library className="text-white" size={20} />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Study<span className="text-purple-600 dark:text-purple-400">Space</span>
                            </span>
                        </motion.div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-2">
                            <NavLink onClick={() => navigate('/libraries')} icon={<LayoutDashboard size={16} />} text="Libraries" />
                            {hasSubscription && <NavLink onClick={() => setShowAttendance(true)} icon={<CalendarDays size={16} />} text="History" />}
                            {isAdmin && <NavLink onClick={() => navigate('/users')} icon={<Users size={16} />} text="Users" />}

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 ml-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
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
                                        <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full object-cover border-2 border-purple-500/50 group-hover:border-purple-400" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-inner text-white">
                                            {user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start leading-none gap-1">
                                        <span className="text-sm font-medium text-gray-500 group-hover:text-white transition-colors">
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

                                {hasSubscription && (
                                    <button
                                        onClick={() => setShowAttendance(true)}
                                        className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                                        title="Attendance"
                                    >
                                        <CalendarDays size={18} />
                                    </button>
                                )}
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
                    <motion.div variants={itemVariants} className="mb-10">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-300">{user?.name || 'User'}</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Here is what's happening in your library today.</p>
                    </motion.div>

                    {/* --- MASTER DASHBOARD GRID --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

                        {/* 1. MAIN STATUS CARD (Spans 2 columns) */}
                        <motion.div variants={itemVariants} className="lg:col-span-2 relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
                            <div className="relative h-full bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-8 flex flex-col justify-between overflow-hidden shadow-xl dark:shadow-none">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 p-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border-2 shadow-2xl ${activeSeat ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-600/10 border-green-500/30' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                            {activeSeat ? (
                                                <div className="text-center">
                                                    <div className="text-xs text-green-600 dark:text-green-400 uppercase font-bold tracking-wider mb-1">Seat</div>
                                                    <div className="text-4xl font-bold text-gray-900 dark:text-white">{activeSeat.seatNumber}</div>
                                                </div>
                                            ) : (
                                                <Armchair size={36} className="text-gray-400 dark:text-gray-600" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${activeSeat ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                                    {activeSeat ? "Session Active" : "No Active Session"}
                                                </h2>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                <LibraryBig size={16} className="text-purple-600 dark:text-purple-400" />
                                                {libraryName || "Select a library to begin"}
                                            </p>
                                            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                <MapPin size={16} className="text-purple-600 dark:text-purple-400" />
                                                {libraryAddress?.state ? `${libraryAddress.state}, ${libraryAddress.city}` : 'No location selected'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        {activeSeat ? (
                                            <button
                                                onClick={handleCheckOut}
                                                disabled={checkingOut}
                                                className="relative overflow-hidden px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all group"
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    {checkingOut ? 'Processing...' : 'End Session'}
                                                    <LogOut size={18} />
                                                </span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setShowScanner(true)}
                                                className="relative px-8 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                            >
                                                <QrCode size={20} />
                                                Scan to Enter
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Info Bar */}
                                {activeSeat && activeSeat.expectedEndTime && (
                                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center gap-8">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Remaining Time</p>
                                            <div className="text-xl font-mono text-white">
                                                <CountdownTimer targetDate={activeSeat.expectedEndTime} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Check-in Time</p>
                                            <p className="text-xl text-white font-mono">
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* 2. SUBSCRIPTION INFO (Side Card) */}
                        <motion.div variants={itemVariants} className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-6 flex flex-col shadow-xl dark:shadow-none">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <CreditCard size={18} className="text-purple-600 dark:text-purple-400" />
                                {planName}
                            </h3>

                            {hasSubscription ? (
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 space-y-5">
                                        {/* Top Row: Status & Price */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Active Plan</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-xs text-gray-400 uppercase font-bold tracking-wider">Price</span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">₹{pricePaid}</span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gray-200 dark:bg-white/10" />

                                        {/* Bottom Row: Days & Progress */}
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{daysLeft}</span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ml-1">days left</span>
                                                </div>
                                                <span className="text-xs text-gray-400 font-mono">{progressPercentage.toFixed(0)}% used</span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progressPercentage}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${daysLeft < 3
                                                        ? 'bg-red-500'
                                                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                                        }`}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                                <span>Started</span>
                                                <span>{totalDuration} Days Total</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">Expires on {expiryDate?.toLocaleDateString()}</p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                        <Clock className="text-gray-400 dark:text-gray-500" size={24} />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 font-medium mb-4">No active subscription</p>
                                    <button onClick={() => navigate('/libraries')} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold">
                                        Browse Plans &rarr;
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* --- FLOOR PLAN SECTION --- */}
                    {libraryId && (
                        <motion.div variants={itemVariants} className="mb-10">
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
                        </motion.div>
                    )}

                    {/* --- QUICK ACTIONS --- */}
                    <motion.div variants={itemVariants}>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ActionCard
                                icon={<LayoutDashboard size={24} className="text-blue-600 dark:text-blue-400" />}
                                title="All Libraries"
                                subtitle="View available spaces"
                                onClick={() => navigate('/libraries')}
                            />

                            {isAdmin && (
                                <ActionCard
                                    icon={<PlusCircle size={24} className="text-green-600 dark:text-green-400" />}
                                    title="Add Library"
                                    subtitle="Register new branch"
                                    onClick={() => navigate('/add-library')}
                                />
                            )}

                            {user?.role === 'library_owner' && (
                                <ActionCard
                                    icon={<BookOpen size={24} className="text-purple-600 dark:text-purple-400" />}
                                    title="My Libraries"
                                    subtitle="Manage your branch"
                                    onClick={() => navigate('/my-libraries')}
                                />
                            )}

                            {isAdmin && (
                                <ActionCard
                                    icon={<Users size={24} className="text-yellow-600 dark:text-yellow-400" />}
                                    title="Manage Users"
                                    subtitle="Admin control panel"
                                    onClick={() => navigate('/users')}
                                />
                            )}

                            {/* Generic fallback for students */}
                            {!isAdmin && user?.role !== 'library_owner' && (
                                <ActionCard
                                    icon={<CreditCard size={24} className="text-pink-600 dark:text-pink-400" />}
                                    title="History"
                                    subtitle="View past sessions"
                                    onClick={() => setShowAttendance(true)}
                                />
                            )}
                        </div>
                    </motion.div>
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
                                        {/* Changed LogOut to X for clearer UI */}
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

const ActionCard = ({ icon, title, subtitle, onClick }) => (
    <motion.button
        whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.08)" }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-2xl text-left transition-all group shadow-md dark:shadow-none hover:shadow-xl dark:hover:shadow-none hover:bg-gray-50 dark:hover:bg-white/10"
    >
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-between">
            {title}
            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-gray-400 dark:text-gray-500" />
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </motion.button>
);

export default Home;