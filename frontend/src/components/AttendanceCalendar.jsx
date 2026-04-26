import { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getAttendanceHistory } from '../api/entry';
import {
    CalendarDays, History, Clock,
    ChevronLeft, ChevronRight, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import Navbar from './Navbar';
import { AttendanceChart } from './dashboard/attendenceChart';
const AttendanceCalendar = () => {
    const { theme } = useTheme();
    const [attendanceMap, setAttendanceMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const data = await getAttendanceHistory();
            if (data.success) {
                const map = {};
                data.history.forEach(record => {
                    const dateKey = new Date(record.date).toDateString();
                    map[dateKey] = record;
                });
                setAttendanceMap(map);
            }
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    // Derived Stats
    const stats = useMemo(() => {
        const values = Object.values(attendanceMap);
        const totalMinutes = values.reduce((acc, curr) => acc + (curr.totalDurationToday || 0), 0);
        return {
            days: values.length,
            hours: (totalMinutes / 60).toFixed(1),
            average: values.length ? ((totalMinutes / 60) / values.length).toFixed(1) : 0
        };
    }, [attendanceMap]);

    // Calendar Class Logic
    const getTileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateKey = date.toDateString();
            if (attendanceMap[dateKey]) {
                return 'present-day';
            }
        }
        return null;
    };

    // --- Dynamic CSS specifically tailored for Light & Dark mode ---
    const customCalendarStyles = `
        .react-calendar { 
            background: transparent !important;
            border: none !important;
            width: 100% !important;
            font-family: inherit;
        }
        .react-calendar__navigation {
            margin-bottom: 1.5rem;
            display: flex;
            gap: 8px;
        }
        .react-calendar__navigation button {
            color: ${theme === 'dark' ? '#f3f4f6' : '#111827'};
            min-width: 44px;
            background: ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} !important;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .react-calendar__navigation button:enabled:hover {
            background: ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} !important;
        }
        .react-calendar__month-view__weekdays {
            text-transform: uppercase;
            font-weight: 700;
            font-size: 0.75rem;
            color: ${theme === 'dark' ? '#6b7280' : '#9ca3af'};
            text-decoration: none !important;
            margin-bottom: 12px;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
            text-decoration: none;
        }
        .react-calendar__month-view__days {
            gap: 4px 0;
        }
        .react-calendar__tile {
            height: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 14px !important;
            color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            border: 2px solid transparent !important;
            background-clip: padding-box !important;
        }
        .react-calendar__tile:enabled:hover {
            background-color: ${theme === 'dark' ? 'rgba(255,255,255, 0.05)' : 'rgba(0,0,0, 0.04)'} !important;
        }
        
        /* TODAY'S DATE */
        .react-calendar__tile--now {
            background: transparent !important;
            border: 2px solid ${theme === 'dark' ? '#4f46e5' : '#6366f1'} !important; 
            color: ${theme === 'dark' ? '#818cf8' : '#4f46e5'} !important;
            font-weight: 700;
        }
        
        /* PRESENT DAY: The whole box turns into a translucent green aesthetic */
        .react-calendar__tile.present-day {
            background: ${theme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)'} !important;
            border: 2px solid ${theme === 'dark' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.3)'} !important;
            color: ${theme === 'dark' ? '#34d399' : '#059669'} !important;
            font-weight: 700;
        }
        .react-calendar__tile.present-day:enabled:hover {
            background: ${theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'} !important;
            transform: scale(0.95);
        }
        
        /* SELECTED ACTIVE DAY */
        .react-calendar__tile--active {
            background: ${theme === 'dark' ? '#4f46e5' : '#6366f1'} !important; 
            color: white !important;
            border-color: transparent !important;
            box-shadow: 0 4px 15px ${theme === 'dark' ? 'rgba(79, 70, 229, 0.4)' : 'rgba(99, 102, 241, 0.3)'} !important;
            transform: scale(0.95);
        }
        
        /* SELECTED ACTIVE DAY *AND* PRESENT */
        .react-calendar__tile--active.present-day {
            background: #10b981 !important; /* Solid Emerald glow */
            color: white !important;
            border-color: transparent !important;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4) !important;
        }
    `;

    if (loading) {
        return (
            <div className="flex h-96 justify-center items-center">
                <LoadingSpinner />
            </div>
        );
    }

    const selectedRecord = attendanceMap[selectedDate.toDateString()];

    return (
        <div>
            {/* <nav>
                <Navbar />
            </nav> */}

            <div className="w-full font-['Outfit']">
                <style>{customCalendarStyles}</style>



                {/* --- Stats Overview --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <StatCard
                        icon={<CalendarDays size={22} className="text-indigo-500 dark:text-indigo-400" />}
                        label="Days Present"
                        value={stats.days}
                        subtext="Total sessions"
                    />
                    <StatCard
                        icon={<History size={22} className="text-purple-500 dark:text-purple-400" />}
                        label="Total Hours"
                        value={stats.hours}
                        subtext="Productive time"
                    />
                    <StatCard
                        icon={<Clock size={22} className="text-emerald-500 dark:text-emerald-400" />}
                        label="Daily Avg"
                        value={`${stats.average}h`}
                        subtext="Per visit"
                    />
                </div>

                {/* --- Main Interface --- */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left: Calendar Widget */}
                    <div className="lg:w-7/12">
                        <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-white/[0.05] rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden transition-colors duration-300 group">

                            {/* Interactive Background Glow for Dark Mode */}
                            <div className="hidden dark:block absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3 tracking-tight">
                                    <div className="p-2 bg-indigo-50 dark:bg-white/5 rounded-lg text-indigo-500 dark:text-slate-400">
                                        <CalendarDays size={18} />
                                    </div>
                                    Select Date
                                </h3>
                                <div className="px-2">
                                    <Calendar
                                        onChange={setSelectedDate}
                                        value={selectedDate}
                                        tileClassName={getTileClassName}
                                        prevLabel={<ChevronLeft size={20} />}
                                        nextLabel={<ChevronRight size={20} />}
                                        next2Label={null}
                                        prev2Label={null}
                                        formatShortWeekday={(locale, date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Timeline Details */}
                    <div className="lg:w-5/12 flex flex-col">
                        <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-white/[0.05] rounded-[2rem] p-6 lg:p-8 flex-1 shadow-xl shadow-slate-200/50 dark:shadow-none relative h-full transition-colors duration-300">

                            <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100 dark:border-white/[0.05]">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                    </p>
                                </div>
                                {selectedRecord && (
                                    <div className="text-right flex flex-col items-end">
                                        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20 mb-1">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Time</span>
                                        </div>
                                        <span className="block text-2xl font-bold text-slate-900 dark:text-white">
                                            {(selectedRecord.totalDurationToday / 60).toFixed(1)}
                                            <span className="text-sm text-slate-500 font-normal ml-1">hrs</span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            <AnimatePresence mode="wait">
                                {selectedRecord ? (
                                    <motion.div
                                        key={selectedDate.toString()}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className="space-y-6"
                                    >
                                        {/* Timeline Container */}
                                        <div className="relative pl-6 border-l-2 border-slate-100 dark:border-white/10 space-y-8 ml-2">
                                            {selectedRecord.sessions?.map((session, idx) => (
                                                <div key={idx} className="relative group">
                                                    {/* Animated Timeline Dot */}
                                                    <span className="absolute -left-[31px] top-2 h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-[#0b0f19] shadow-sm shadow-indigo-500/50 group-hover:scale-125 transition-transform duration-300"></span>

                                                    <div className="bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.05] hover:border-indigo-500/30 transition-colors shadow-sm dark:shadow-none">

                                                        {/* Check In */}
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                                    <Clock size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Check In</p>
                                                                    <span className="text-slate-900 dark:text-white font-bold">
                                                                        {new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1.5 rounded-lg shadow-sm dark:shadow-none">
                                                                {session.seatNumber || 'No Seat'}
                                                            </span>
                                                        </div>

                                                        <div className="w-0.5 h-6 bg-slate-200 dark:bg-white/10 ml-4 my-1"></div>

                                                        {/* Check Out */}
                                                        <div className="flex justify-between items-end">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                                                    <LogOutIcon size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Check Out</p>
                                                                    <span className="text-slate-900 dark:text-white font-bold">
                                                                        {session.checkOutTime
                                                                            ? new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                            : <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-2">
                                                                                Active Now
                                                                                <span className="flex h-2 w-2 relative">
                                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                                </span>
                                                                            </span>
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs text-indigo-500 dark:text-indigo-400 font-mono font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                                                                {session.durationMinutes}m
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center h-56 text-center"
                                    >
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                            <Coffee className="text-slate-400 dark:text-slate-500" size={24} />
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-200 font-bold text-lg">Rest Day</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">Take a breather. No activity recorded for this date.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* --- Chart View --- */}
                <div className="mt-8">
                    <AttendanceChart />
                </div>
            </div>
        </div>

    );
};

// --- Sub Components ---

const StatCard = ({ icon, label, value, subtext }) => (
    <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-white/[0.05] rounded-[1.5rem] p-5 lg:p-6 flex items-center gap-5 hover:border-indigo-500/30 transition-all duration-300 group shadow-lg shadow-slate-200/40 dark:shadow-none relative overflow-hidden">
        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
            {icon}
        </div>
        <div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-none mb-1 tracking-tight">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">{subtext}</p>
        </div>
    </div>
);

// Small Icon Helper
const LogOutIcon = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);

export default AttendanceCalendar;