import React, { useState, useEffect } from 'react';
import { getNotices } from '../api/notice';
import { Bell, AlertTriangle, Info, Clock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NoticeBoard = ({ libraryId }) => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!libraryId) return;

        const fetchActiveNotices = async () => {
            setLoading(true);
            try {
                // Fetch only active notices for students
                const data = await getNotices(libraryId, true);
                setNotices(data.notices);
            } catch (error) {
                console.error("Failed to load notices", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveNotices();
    }, [libraryId]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-20 bg-gray-100 dark:bg-white/5 rounded-2xl"></div>
                    <div className="h-20 bg-gray-100 dark:bg-white/5 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (notices.length === 0) {
        return null; // Explicitly hiding if there's no active announcement
    }

    const getPriorityStyles = (priority) => {
        switch (priority) {
            case 'urgent':
                return {
                    icon: <AlertTriangle size={18} className="text-red-500" />,
                    bg: 'bg-red-50 dark:bg-red-500/10',
                    border: 'border-red-100 dark:border-red-500/20',
                    text: 'text-red-700 dark:text-red-400'
                };
            case 'high':
                return {
                    icon: <Bell size={18} className="text-orange-500" />,
                    bg: 'bg-orange-50 dark:bg-orange-500/10',
                    border: 'border-orange-100 dark:border-orange-500/20',
                    text: 'text-orange-700 dark:text-orange-400'
                };
            default:
                return {
                    icon: <Info size={18} className="text-blue-500" />,
                    bg: 'bg-blue-50 dark:bg-blue-500/10',
                    border: 'border-blue-100 dark:border-blue-500/20',
                    text: 'text-blue-700 dark:text-blue-400'
                };
        }
    };

    return (
        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl dark:shadow-2xl dark:shadow-black/50 mb-10 overflow-hidden relative">

            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-[80px] -z-10 -translate-y-1/2 translate-x-1/2"></div>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl">
                    <Bell className="text-indigo-600 dark:text-indigo-400" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Notice Board</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Important announcements from the admin</p>
                </div>
            </div>

            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                    {notices.map((notice, index) => {
                        const style = getPriorityStyles(notice.priority);
                        return (
                            <motion.div
                                key={notice._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-5 rounded-2xl border ${style.bg} ${style.border} relative overflow-hidden group`}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full opacity-50 transition-opacity group-hover:opacity-100" style={{ backgroundColor: style.icon.props.className.match(/(text-\w+-500)/)[1].replace('text-', '').replace('500', '400') }}></div>

                                <div className="flex items-start gap-4">
                                    <div className="shrink-0 mt-1">
                                        {style.icon}
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-1">
                                            <h4 className={`font-bold text-base ${style.text}`}>
                                                {notice.title}
                                            </h4>
                                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 shrink-0">
                                                <Clock size={12} />
                                                {new Date(notice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {notice.message}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NoticeBoard;
