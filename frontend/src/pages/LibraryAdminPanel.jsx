import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PlanManagement from '../components/PlanManagement';
import UserSubscriptionManagement from '../components/UserSubscriptionManagement';
import NoticeManagement from '../components/NoticeManagement';
import AdminAnalytics from '../components/dashboard/AdminAnalytics';
import OccupancyWidget from '../components/dashboard/OccupancyWidget';
import { toast } from 'react-toastify';
import { Settings, Users, DollarSign, ArrowLeft, BellRing, LayoutDashboard, ChevronLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const LibraryAdminPanel = () => {
    const { id: libraryId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState('analytics'); 
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [libStats, setLibStats] = useState(null);

    const canAccess = user?.role === 'admin' || user?.role === 'co-admin' || user?.role === 'library_owner';

    useEffect(() => {
        if (!canAccess) {
            toast.error("You don't have permission to access this page");
            navigate('/');
            return;
        }
        setLoading(false);
        fetchStats();
    }, [canAccess, navigate]);

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/library/${libraryId}/statistics`, {
                withCredentials: true
            });
            setLibStats(response.data);
        } catch (error) {
            console.error("Error fetching occupancy:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#050505]">
                <Navbar />
                <div className="flex items-center justify-center h-[60vh]">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (!canAccess) return null;

    const tabs = [
        { id: 'analytics', label: 'Analytics', icon: LayoutDashboard },
        { id: 'subscriptions', label: 'Users', icon: Users },
        { id: 'plans', label: 'Plans', icon: DollarSign },
        { id: 'notices', label: 'Notices', icon: BellRing },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] transition-colors duration-300 pb-20 sm:pb-0">
            {/* Desktop Navbar stays for consistency */}
            <div className="hidden sm:block">
                <Navbar />
            </div>

            {/* Mobile/Compact Header - Sticky & Slim */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-lg border-b border-gray-200 dark:border-white/10 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
                                {libStats?.library?.name || "Admin Panel"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <OccupancyWidget 
                            occupiedCount={libStats?.library?.occupiedSeats || 0} 
                            totalCapacity={libStats?.library?.totalSeats || 0}
                            loading={statsLoading}
                            compact={true}
                        />
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 rounded-full">
                            <Settings size={14} className="text-blue-600" />
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Admin Mode</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6">
                {/* Desktop Tabs */}
                <div className="hidden sm:flex bg-white dark:bg-[#0F0F12] rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-8 p-1.5 gap-1 w-fit">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors z-10 ${isActive ? 'text-blue-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="admin-active-tab-desktop"
                                        className="absolute inset-0 bg-blue-50 dark:bg-white/10 rounded-xl -z-10"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content Area */}
                <div className="relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'analytics' && <AdminAnalytics libraryId={libraryId} />}
                            {activeTab === 'subscriptions' && <UserSubscriptionManagement libraryId={libraryId} />}
                            {activeTab === 'plans' && <PlanManagement libraryId={libraryId} />}
                            {activeTab === 'notices' && <NoticeManagement libraryId={libraryId} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/90 dark:bg-[#0F0F12]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 px-6 py-3 flex items-center justify-between">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600 dark:text-white scale-110' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                            <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-600/10 dark:bg-white/10' : ''}`}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
                            {isActive && (
                                <motion.div 
                                    layoutId="mobile-nav-dot"
                                    className="w-1 h-1 bg-blue-600 dark:bg-white rounded-full mt-0.5"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default LibraryAdminPanel;