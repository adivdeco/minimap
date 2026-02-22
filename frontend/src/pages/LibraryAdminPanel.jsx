import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PlanManagement from '../components/PlanManagement';
import UserSubscriptionManagement from '../components/UserSubscriptionManagement';
import NoticeManagement from '../components/NoticeManagement';
import { toast } from 'react-toastify';
import { Settings, Users, DollarSign, ArrowLeft, BellRing } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

const LibraryAdminPanel = () => {
    const { id: libraryId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState('subscriptions');
    const [loading, setLoading] = useState(true);

    const canAccess = user?.role === 'admin' || user?.role === 'co-admin' || user?.role === 'library_owner';

    useEffect(() => {
        if (!canAccess) {
            toast.error("You don't have permission to access this page");
            navigate('/');
            return;
        }
        setLoading(false);
    }, [canAccess, navigate]);

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
        { id: 'subscriptions', label: 'User Subscriptions', icon: Users },
        { id: 'plans', label: 'Plans Management', icon: DollarSign },
        { id: 'notices', label: 'Announcements', icon: BellRing },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] transition-colors duration-300">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-4 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/20 rounded-xl">
                            <Settings className="text-blue-600 dark:text-blue-400" size={28} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Library Admin Panel</h1>
                    </div>
                </motion.div>

                {/* Modern Tabs */}
                <div className="bg-white dark:bg-[#0F0F12] rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-8 overflow-x-auto p-1.5 flex gap-1 w-full sm:w-fit custom-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center shrink-0 gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors z-10 ${isActive ? 'text-blue-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="admin-active-tab"
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
                            {activeTab === 'subscriptions' && <UserSubscriptionManagement libraryId={libraryId} />}
                            {activeTab === 'plans' && <PlanManagement libraryId={libraryId} />}
                            {activeTab === 'notices' && <NoticeManagement libraryId={libraryId} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default LibraryAdminPanel;