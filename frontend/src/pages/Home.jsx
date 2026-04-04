import { useState } from 'react';
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
    Library, CalendarDays, Sun, Moon, X, ChevronRight, Users, Bell, Sparkles,
    MapPin, ScanLine, ShieldCheck, ArrowUpRight, Clock3, LogOut
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
    const firstName = user?.name?.split(' ')[0] || 'Reader';
    const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'R';
    const activeSeatLabel = activeSeat?.seatNumber || activeSeat?.seatId || 'Not assigned';
    const membershipTone = hasSubscription ? 'Active membership' : 'Explore plans';
    const heroStats = [
        {
            label: 'Seat',
            value: hasSubscription ? activeSeatLabel : 'Open',
            icon: <Library size={16} className="text-amber-300" />
        },
        {
            label: 'Days left',
            value: hasSubscription ? `${daysLeft}` : '--',
            icon: <Clock3 size={16} className="text-cyan-300" />
        },
        {
            label: 'Unread notices',
            value: `${unreadNoticesCount}`,
            icon: <Bell size={16} className="text-pink-300" />
        }
    ];

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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,_#fff8ef_0%,_#f8fafc_42%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_22%),radial-gradient(circle_at_85%_15%,_rgba(56,189,248,0.16),_transparent_20%),linear-gradient(180deg,_#04070d_0%,_#07111f_48%,_#02040a_100%)] text-gray-900 dark:text-white selection:bg-orange-500/20 transition-colors duration-300">

            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-200/45 dark:bg-orange-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-200/45 dark:bg-cyan-500/10 rounded-full blur-[120px]" />
                <div className="absolute top-[25%] right-[30%] w-[320px] h-[320px] bg-fuchsia-200/25 dark:bg-fuchsia-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/55 dark:bg-slate-950/50 border-b border-white/40 dark:border-white/8 shadow-[0_20px_80px_-50px_rgba(15,23,42,0.55)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/40 bg-white/70 shadow-lg shadow-orange-200/40 dark:border-white/10 dark:bg-white/6 dark:shadow-orange-500/10">
                                    <Library size={20} className="text-orange-500 dark:text-orange-300" />
                                </div>
                                <div>
                                    <span className="block text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        Study<span className="text-orange-500 dark:text-cyan-300">Space</span>
                                    </span>
                                    <span className="block text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                        Smart library hub
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-2">
                            <NavLink onClick={() => navigate('/libraries')} icon={<Library size={16} />} text="Libraries" />
                            {hasSubscription && <NavLink onClick={() => setShowAttendance(true)} icon={<CalendarDays size={16} />} text="History" />}
                            {isAdmin && <NavLink onClick={() => navigate('/users')} icon={<Users size={16} />} text="Users" />}

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 ml-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/8 transition-all"
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>

                            {/* Notifications Bell */}
                            {libraryId && (
                                <button
                                    onClick={() => setShowNotices(true)}
                                    className="p-2 ml-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/8 transition-all relative"
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
                                        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 hover:border-orange-400/40 dark:hover:border-cyan-300/30 hover:bg-white/80 dark:hover:bg-white/10 transition-all group shadow-sm"
                                    >
                                        <CalendarDays size={16} className="text-orange-500 dark:text-cyan-300" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-200">Attendance</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate('/profile')}
                                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-white/65 dark:bg-white/5 border border-white/60 dark:border-white/10 hover:border-orange-400/40 dark:hover:border-cyan-300/30 hover:bg-white/80 dark:hover:bg-white/10 transition-all cursor-pointer group shadow-sm"
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-orange-400/40 group-hover:border-orange-400 dark:border-cyan-300/40 dark:group-hover:border-cyan-300" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-inner text-white">
                                            {userInitial}
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start leading-none gap-1">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors">
                                            {firstName}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold dark:text-slate-400">
                                            {user?.role === 'student' ? 'Member' : user?.role}
                                        </span>
                                    </div>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-2xl border border-white/50 bg-white/65 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                    <span className="flex items-center gap-2">
                                        <LogOut size={16} />
                                        Logout
                                    </span>
                                </button>
                            </div>

                            {/* Mobile Profile & Theme */}
                            <div className="md:hidden flex items-center gap-3">
                                <button
                                    onClick={toggleTheme}
                                    className="p-2.5 rounded-full bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-cyan-300 transition-all shadow-sm"
                                >
                                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                </button>

                                {libraryId && (
                                    <button
                                        onClick={() => setShowNotices(true)}
                                        className="p-2.5 rounded-full bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-cyan-300 hover:bg-white dark:hover:bg-white/10 transition-all relative shadow-sm"
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
                                        className="p-2.5 rounded-full bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-cyan-300 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm"
                                        title="Attendance"
                                    >
                                        <CalendarDays size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-white/50 dark:border-white/10 hover:border-orange-400/40 dark:hover:border-cyan-300/30 hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer group shadow-sm"
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-orange-400/40 group-hover:border-orange-400 dark:border-cyan-300/40 dark:group-hover:border-cyan-300" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-cyan-500 flex items-center justify-center text-xs font-bold shadow-inner text-white">
                                            {userInitial}
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

                    <motion.section
                        variants={itemVariants}
                        className="mb-10 grid gap-6 xl:grid-cols-[1.6fr_1fr]"
                    >
                        <div className="relative overflow-hidden rounded-[32px] border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,247,237,0.88)_45%,rgba(224,242,254,0.82)_100%)] p-6 shadow-[0_30px_100px_-45px_rgba(14,165,233,0.45)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(30,41,59,0.84)_45%,rgba(8,47,73,0.78)_100%)]">
                            <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-orange-300/30 blur-3xl dark:bg-orange-400/10" />
                            <div className="absolute bottom-0 right-20 h-44 w-44 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-400/10" />
                            <div className="relative z-10">
                                <div className="mb-5 flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700 dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                                        <Sparkles size={14} className="text-orange-500 dark:text-cyan-300" />
                                        {membershipTone}
                                    </span>
                                    {libraryName && (
                                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white dark:border-white/10 dark:bg-white/10">
                                            <ShieldCheck size={14} className="text-emerald-300" />
                                            {libraryName}
                                        </span>
                                    )}
                                </div>

                                <div className="max-w-3xl">
                                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                                        Your study dashboard now feels like a real command center.
                                    </h2>
                                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                                        Track your seat, scan in fast, watch subscription progress, and stay on top of notices from one sharper-looking home screen.
                                    </p>
                                </div>

                                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                    {heroStats.map((stat) => (
                                        <div
                                            key={stat.label}
                                            className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/7"
                                        >
                                            <div className="mb-4 flex items-center justify-between">
                                                <span className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{stat.label}</span>
                                                <span className="rounded-full bg-slate-900/90 p-2 dark:bg-white/10">{stat.icon}</span>
                                            </div>
                                            <div className="text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex flex-wrap gap-3">
                                    <button
                                        onClick={() => hasSubscription ? setShowScanner(true) : navigate('/libraries')}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                    >
                                        <ScanLine size={18} />
                                        {hasSubscription ? 'Open scanner' : 'Browse libraries'}
                                    </button>
                                    <button
                                        onClick={() => libraryId ? setShowNotices(true) : navigate('/libraries')}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white dark:border-white/10 dark:bg-white/6 dark:text-slate-100 dark:hover:bg-white/10"
                                    >
                                        <Bell size={18} />
                                        Check notices
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="rounded-[28px] border border-white/55 bg-white/75 p-5 shadow-[0_24px_80px_-48px_rgba(249,115,22,0.55)] backdrop-blur dark:border-white/10 dark:bg-white/6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Current setup</p>
                                        <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                                            {planName || 'No plan yet'}
                                        </h3>
                                    </div>
                                    <div className="rounded-2xl bg-orange-500/10 p-3 text-orange-500 dark:bg-cyan-400/10 dark:text-cyan-300">
                                        <ArrowUpRight size={18} />
                                    </div>
                                </div>
                                <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/[0.03] px-4 py-3 dark:bg-white/5">
                                        <span>Subscription</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{hasSubscription ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/[0.03] px-4 py-3 dark:bg-white/5">
                                        <span>Seat access</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{activeSeatLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl bg-slate-950/[0.03] px-4 py-3 dark:bg-white/5">
                                        <span>Amount paid</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{pricePaid ? `Rs ${pricePaid}` : '--'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_80px_-48px_rgba(2,132,199,0.75)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(8,47,73,0.92))]">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Library pulse</p>
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <p className="text-2xl font-semibold">{libraryName || 'Choose a library'}</p>
                                        <p className="mt-2 flex items-start gap-2 text-sm text-slate-300">
                                            <MapPin size={16} className="mt-0.5 shrink-0 text-cyan-300" />
                                            <span>{libraryAddress || 'Pick a library to unlock notices, seat maps, and check-in tools.'}</span>
                                        </p>
                                    </div>
                                    <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                                            <span>Role</span>
                                            <span>{user?.role === 'student' ? 'Member' : user?.role}</span>
                                        </div>
                                        <p className="text-sm leading-6 text-slate-300">
                                            {isAdmin
                                                ? 'You have elevated controls. Review users, notices, and branch-wide activity from this home base.'
                                                : hasSubscription
                                                    ? 'Your next session is one tap away. Use the scanner, review attendance, and keep an eye on updates.'
                                                    : 'You are ready to explore the best nearby spaces and activate a subscription when you want.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

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
