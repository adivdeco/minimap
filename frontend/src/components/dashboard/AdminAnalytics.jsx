import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area
} from 'recharts';
import { 
    TrendingUp, Users, DollarSign, Calendar, 
    Clock, Award, LayoutDashboard, Download
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { toast } from 'react-toastify';
import LoadingSpinner from '../LoadingSpinner';
import { motion } from 'framer-motion';

const AdminAnalytics = ({ libraryId }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [attendanceChart, setAttendanceChart] = useState([]);
    const [shiftData, setShiftData] = useState([]);
    const [timeRange, setTimeRange] = useState('30days');

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch basic stats
                const statsRes = await axiosClient.get(`/library/${libraryId}/statistics`);
                setStats(statsRes.data);

                // Fetch attendance chart (current month)
                const now = new Date();
                const chartRes = await axiosClient.get(`/library/${libraryId}/attendance-chart`, {
                    params: { month: now.getMonth() + 1, year: now.getFullYear() }
                });
                setAttendanceChart(chartRes.data.chartData);

                // Fetch shift analytics (for today)
                // Use local date string (YYYY-MM-DD) to match backend Asia/Kolkata logic
                const todayStr = now.toLocaleDateString('en-CA'); 
                const shiftRes = await axiosClient.get(`/library/${libraryId}/attendance-shifts`, {
                    params: { date: todayStr }
                });
                setShiftData(shiftRes.data.chartData);

            } catch (error) {

                toast.error("Some analytics data failed to load");
            } finally {
                setLoading(false);
            }
        };

        if (libraryId) fetchAllData();
    }, [libraryId]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <LoadingSpinner />
            <p className="text-gray-500 animate-pulse font-medium">Gathering insights...</p>
        </div>
    );

    if (!stats) return <div className="text-center py-20">No data available</div>;

    // Prepare Revenue Data for Line Chart
    const revenueData = Object.entries(stats.revenueByDate || {})
        .map(([date, revenue]) => ({
            date: date.split('-').slice(1).join('/'), // MM/DD format
            revenue
        }))
        .reverse();

    // Prepare Plan Distribution Data for Pie Chart
    const COLORS = ['#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#F59E0B'];
    const planDistributionData = [
        { name: 'Active', value: stats.subscriptionMetrics.activeSubscriptions },
        { name: 'Expired', value: stats.subscriptionMetrics.expiredSubscriptions },
        { name: 'Cancelled', value: stats.subscriptionMetrics.cancelledSubscriptions }
    ];

    const StatCard = ({ icon: Icon, title, value, subtext, colorClass }) => (
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all"
        >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-xl ${colorClass}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{value}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium truncate">
                {subtext}
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-4 sm:space-y-8 pb-12">
            {/* Quick Metrics */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={DollarSign} 
                    title="Total Revenue" 
                    value={`₹${stats.financialMetrics.totalRevenue?.toLocaleString()}`}
                    subtext="Lifetime earnings from subscriptions"
                    colorClass="bg-green-500/10 text-green-500"
                />
                <StatCard 
                    icon={Users} 
                    title="Active Members" 
                    value={stats.subscriptionMetrics.activeSubscriptions}
                    subtext={`${stats.subscriptionMetrics.totalSubscriptions} total across all time`}
                    colorClass="bg-blue-500/10 text-blue-500"
                />
                <StatCard 
                    icon={Calendar} 
                    title="Today's Visitors" 
                    value={stats.attendanceMetrics.today.visitors}
                    subtext={`${stats.attendanceMetrics.today.sessions} total sessions today`}
                    colorClass="bg-purple-500/10 text-purple-500"
                />
                <StatCard 
                    icon={Award} 
                    title="Avg Rating" 
                    value={stats.library.rating?.toFixed(1) || 'N/A'}
                    subtext={`From ${stats.library.totalReviews} customer reviews`}
                    colorClass="bg-yellow-500/10 text-yellow-500"
                />
            </div> */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend Chart */}
                <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-green-500" size={20} />
                            <h3 className="font-bold text-gray-900 dark:text-white">Revenue Stream (Last 30 Days)</h3>
                        </div>
                        <select className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none">
                            <option>Daily</option>
                            <option>Weekly</option>
                        </select>
                    </div>
                    <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#82ed58ff' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Membership Breakdown */}
                <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <Users className="text-blue-500" size={20} />
                            <h3 className="font-bold text-gray-900 dark:text-white">Membership Status Distribution</h3>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row items-center gap-4 sm:gap-8">
                        <div className="h-[200px] sm:h-[250px] w-full md:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={planDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {planDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4 w-full md:w-1/2">
                            {planDistributionData.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Attendance Shifts Radar/Bar */}
                 <div className="lg:col-span-1 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                        <Clock className="text-orange-500" size={20} />
                        <h3 className="font-bold text-gray-900 dark:text-white">Peak Hours (Shifts)</h3>
                    </div>
                    <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={shiftData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                <XAxis dataKey="shift" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                                <Tooltip 
                                     contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                                     itemStyle={{ color: '#fff' }}
                                     labelStyle={{ color: '#f09131ff' }}
                                />
                                <Bar dataKey="visitors" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {shiftData.map((item, i) => (
                            <div key={i} className="text-[10px] text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 py-1 px-2 rounded-md truncate">
                                {item.shift}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Daily Occupancy Trend */}
                <div className="lg:col-span-2 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <LayoutDashboard className="text-pink-500" size={20} />
                            <h3 className="font-bold text-gray-900 dark:text-white">Monthly Attendance Volume</h3>
                        </div>
                    </div>
                    <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceChart}>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => str.split('-')[2]} // Just the day
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#888', fontSize: 10}} 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                                <Tooltip 
                                     contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                                     itemStyle={{ color: '#fff' }}
                                     labelStyle={{ color: '#e356f3ff' }}
                                />
                                <Bar dataKey="totalSessions" name="Unique Visitors" fill="#EC4899" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
