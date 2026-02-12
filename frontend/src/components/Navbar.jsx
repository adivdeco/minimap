import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Library, LayoutDashboard, Users, CalendarDays,
    Sun, Moon, ChevronRight, X
} from 'lucide-react';
import AttendanceCalendar from './AttendanceCalendar';

const Navbar = () => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth(); // removed checkAuth if not used directly
    const { logout: auth0Logout } = useAuth0();
    const navigate = useNavigate();

    const [showAttendance, setShowAttendance] = useState(false);

    const subscription = user?.studentDetails?.currentSubscription;
    const hasSubscription = !!subscription && subscription.status === 'active';
    const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

    const handleLogout = () => {
        logout();
        auth0Logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
    };

    return (
        <>
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

            {/* Attendance Modal */}
            <AnimatePresence>
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
        </>
    );
};

const NavLink = ({ icon, text, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
    >
        {icon}
        <span className="font-medium text-sm">{text}</span>
    </button>
);

export default Navbar;
