import { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getAttendanceHistory } from '../api/entry';
import {
    Loader2, CalendarDays, History, Clock,
    ChevronLeft, ChevronRight, MapPin, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useTheme } from '../context/ThemeContext';

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
            console.error("Failed to fetch attendance history", error);
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

    // --- Custom CSS Overrides for Premium Look ---
    const customCalendarStyles = `
        .react-calendar { 
            background: transparent !important;
            border: none !important;
            width: 100% !important;
            font-family: inherit;
        }
        .react-calendar__navigation {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }
        .react-calendar__navigation button {
            color: ${theme === 'dark' ? 'white' : '#111827'};
            min-width: 40px;
            background: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} !important;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
        }
        .react-calendar__navigation button:enabled:hover {
            background: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;
        }
        .react-calendar__month-view__weekdays {
            text-transform: uppercase;
            font-weight: 700;
            font-size: 0.75rem;
            color: #6b7280;
            text-decoration: none !important;
            margin-bottom: 10px;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
            text-decoration: none;
        }
        .react-calendar__tile {
            height: 46px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 14px !important;
            color: ${theme === 'dark' ? '#d1d5db' : '#374151'};
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;
            position: relative;
        }
        .react-calendar__tile:enabled:hover {
            background-color: ${theme === 'dark' ? 'rgba(255,255,255, 0.08)' : 'rgba(0,0,0, 0.05)'} !important;
        }
        .react-calendar__tile--now {
            background: transparent !important;
            border: 1px solid #a855f7 !important; /* Purple Border */
            color: #a855f7 !important;
        }
        .react-calendar__tile--active {
            background: #7e22ce !important; /* Purple-700 */
            color: white !important;
            box-shadow: 0 4px 15px rgba(126, 34, 206, 0.4);
        }
        /* The green dot for present days */
        .present-day::after {
            content: '';
            position: absolute;
            bottom: 6px;
            width: 5px;
            height: 5px;
            background-color: #10b981; /* Emerald-500 */
            border-radius: 50%;
        }
        .react-calendar__tile--active.present-day::after {
            background-color: white; /* White dot when selected */
        }
    `;

    if (loading) {
        return (
            <div className="flex h-96 justify-center items-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    const selectedRecord = attendanceMap[selectedDate.toDateString()];

    return (
        <div className="w-full">
            <style>{customCalendarStyles}</style>

            {/* --- Stats Overview --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard
                    icon={<CalendarDays size={20} className="text-blue-400" />}
                    label="Days Present"
                    value={stats.days}
                    subtext="Total sessions"
                />
                <StatCard
                    icon={<History size={20} className="text-purple-400" />}
                    label="Total Hours"
                    value={stats.hours}
                    subtext="Productive time"
                />
                <StatCard
                    icon={<Clock size={20} className="text-emerald-400" />}
                    label="Daily Avg"
                    value={`${stats.average}h`}
                    subtext="Per visit"
                />
            </div>

            {/* --- Main Interface --- */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Left: Calendar Widget */}
                <div className="lg:w-7/12">
                    <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-colors">
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <CalendarDays size={18} className="text-gray-400" />
                                Select Date
                            </h3>
                            <Calendar
                                onChange={setSelectedDate}
                                value={selectedDate}
                                tileClassName={getTileClassName}
                                prevLabel={<ChevronLeft size={18} />}
                                nextLabel={<ChevronRight size={18} />}
                                next2Label={null}
                                prev2Label={null}
                                formatShortWeekday={(locale, date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Timeline Details */}
                <div className="lg:w-5/12 flex flex-col">
                    <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-6 flex-1 shadow-xl relative h-full transition-colors">

                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </h3>
                                <p className="text-xs text-gray-500 uppercase font-semibold">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                </p>
                            </div>
                            {selectedRecord && (
                                <div className="text-right">
                                    <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                                        {(selectedRecord.totalDurationToday / 60).toFixed(1)}
                                        <span className="text-sm text-gray-500 font-normal ml-1">hrs</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            {selectedRecord ? (
                                <motion.div
                                    key={selectedDate.toString()}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {/* Timeline Container */}
                                    <div className="relative pl-4 border-l border-white/10 space-y-8 ml-2">
                                        {selectedRecord.sessions?.map((session, idx) => (
                                            <div key={idx} className="relative">
                                                {/* Timeline Dot */}
                                                <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-purple-500 ring-4 ring-[#0F0F12]"></span>

                                                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 hover:border-purple-500/30 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                                                                <Clock size={14} />
                                                            </div>
                                                            <span className="text-gray-900 dark:text-white font-medium">
                                                                {new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                                                            {session.seatNumber || 'No Seat'}
                                                        </span>
                                                    </div>

                                                    <div className="w-0.5 h-4 bg-white/10 ml-3 my-1"></div>

                                                    <div className="flex justify-between items-end">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                                                                <LogOutIcon size={14} />
                                                            </div>
                                                            <span className="text-gray-900 dark:text-white font-medium">
                                                                {session.checkOutTime
                                                                    ? new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                    : <span className="text-green-600 dark:text-green-400 animate-pulse text-sm">Active Now</span>
                                                                }
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-purple-300 font-mono">
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
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center h-48 text-center"
                                >
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <Coffee className="text-gray-400 dark:text-gray-600" size={24} />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 font-medium">Rest Day</p>
                                    <p className="text-sm text-gray-500 mt-1">No activity recorded for this date.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub Components ---

const StatCard = ({ icon, label, value, subtext }) => (
    <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group shadow-md dark:shadow-none">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1">{value}</p>
            <p className="text-xs text-gray-500">{subtext}</p>
        </div>
    </div>
);

// Small Icon Helper
const LogOutIcon = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);

export default AttendanceCalendar;