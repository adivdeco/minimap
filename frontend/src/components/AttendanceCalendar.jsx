import { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getAttendanceHistory } from '../api/entry';
import { Loader2, Clock, CalendarDays, History, ChevronRight } from 'lucide-react';

const AttendanceCalendar = () => {
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
                // UX Optimization: Convert array to a Map for O(1) instant lookup
                // Key format: "YYYY-MM-DD"
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
            hours: (totalMinutes / 60).toFixed(1)
        };
    }, [attendanceMap]);

    // Calendar Tile Logic
    const getTileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateKey = date.toDateString();
            if (attendanceMap[dateKey]) {
                return 'present-day'; // We will style this class in CSS below
            }
        }
        return null;
    };

    // Custom CSS for a Professional Look
    const customStyles = `
        /* Hide default messy navigation */
        .react-calendar { 
            background: transparent !important;
            border: none !important;
            width: 100% !important;
            font-family: inherit;
        }
        
        /* Navigation Header */
        .react-calendar__navigation {
            margin-bottom: 1rem;
        }
        .react-calendar__navigation button {
            color: #e2e8f0;
            font-weight: 600;
            font-size: 1rem;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        }

        /* Day Tiles */
        .react-calendar__month-view__weekdays {
            text-transform: uppercase;
            font-weight: 700;
            font-size: 0.7rem;
            color: #94a3b8; /* Slate-400 */
            letter-spacing: 0.05em;
            text-decoration: none !important;
        }
        .react-calendar__tile {
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px !important;
            color: #cbd5e1;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        
        /* Hover State */
        .react-calendar__tile:enabled:hover {
            background-color: rgba(255,255,255, 0.05) !important;
        }

        /* Current Day (Today) */
        .react-calendar__tile--now {
            background: transparent !important;
            border: 1px solid #6366f1 !important; /* Indigo border */
            color: #818cf8 !important;
        }

        /* Selected Day */
        .react-calendar__tile--active {
            background: #6366f1 !important; /* Indigo-500 */
            color: white !important;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Custom Class: Present Day (Green Dot Indicator) */
        .present-day {
            position: relative;
            font-weight: bold;
            color: white;
        }
        .present-day::after {
            content: '';
            position: absolute;
            bottom: 6px;
            width: 6px;
            height: 6px;
            background-color: #10b981; /* Emerald-500 */
            border-radius: 50%;
        }
    `;

    if (loading) {
        return (
            <div className="flex h-64 justify-center items-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const selectedRecord = attendanceMap[selectedDate.toDateString()];

    return (
        <div className="max-w-4xl mx-auto p-6 bg-slate-900 min-h-screen text-slate-100 font-sans">
            <style>{customStyles}</style>

            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Title Card */}
                <div className="col-span-1 md:col-span-1 flex flex-col justify-center">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Attendance</h2>
                    <p className="text-slate-400 text-sm mt-1">Track your library consistency</p>
                </div>

                {/* Stat 1 */}
                <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex items-center space-x-4 backdrop-blur-sm">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <CalendarDays size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Days Present</p>
                        <p className="text-2xl font-bold text-white">{stats.days}</p>
                    </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex items-center space-x-4 backdrop-blur-sm">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <History size={24} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Total Hours</p>
                        <p className="text-2xl font-bold text-white">{stats.hours}h</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Calendar Section */}
                <div className="lg:col-span-7 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md shadow-xl">
                    <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        tileClassName={getTileClassName}
                        prev2Label={null}
                        next2Label={null}
                    />
                </div>

                {/* Details Section */}
                <div className="lg:col-span-5 flex flex-col h-full">
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 flex-1 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-6 border-b border-slate-700 pb-4">
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>

                        {selectedRecord ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Daily Summary */}
                                <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-emerald-400 font-medium">Present</span>
                                    </div>
                                    <span className="text-white font-bold text-lg">
                                        {(selectedRecord.totalDurationToday / 60).toFixed(1)} hrs
                                    </span>
                                </div>

                                {/* Sessions Timeline */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                        Session Timeline
                                    </p>
                                    <div className="space-y-3">
                                        {selectedRecord.sessions?.map((session, idx) => (
                                            <div key={idx} className="flex items-center group">
                                                {/* Time Pill */}
                                                <div className="flex flex-col items-center mr-4">
                                                     <div className="w-px h-full bg-slate-700 group-first:bg-transparent mb-1"></div>
                                                     <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                     <div className="w-px h-full bg-slate-700 group-last:bg-transparent mt-1"></div>
                                                </div>
                                                
                                                {/* Card */}
                                                <div className="flex-1 bg-slate-700/30 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                                                    <div>
                                                        <p className="text-white text-sm font-medium">
                                                            {new Date(session.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            <span className="text-slate-500 mx-2">to</span>
                                                            {session.checkOutTime 
                                                                ? new Date(session.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                                                : <span className="text-amber-400 text-xs">Active</span>
                                                            }
                                                        </p>
                                                        {session.seatNumber && (
                                                            <p className="text-xs text-slate-400 mt-1">Seat: {session.seatNumber}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-300 bg-slate-700 px-2 py-1 rounded">
                                                        {session.durationMinutes}m
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-center opacity-50">
                                <Clock className="w-12 h-12 text-slate-600 mb-2" />
                                <p className="text-slate-400">No attendance records found for this date.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCalendar;