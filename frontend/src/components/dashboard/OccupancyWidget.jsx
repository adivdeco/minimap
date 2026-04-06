import React from 'react';
import { motion } from 'framer-motion';
import { Users, Zap } from 'lucide-react';

const OccupancyWidget = ({ occupiedCount, totalCapacity, loading, compact = false }) => {
    const percentage = totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : 0;
    
    // Determine color based on occupancy
    const getStatusColor = () => {
        if (percentage >= 90) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (percentage >= 70) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        return 'text-green-500 bg-green-500/10 border-green-500/20';
    };

    if (loading) {
        return (
            <div className={`${compact ? 'h-8 w-24' : 'h-20 w-48'} bg-gray-100 dark:bg-white/5 animate-pulse rounded-full border border-gray-200 dark:border-white/10`} />
        );
    }

    if (compact) {
        return (
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor()} backdrop-blur-sm shadow-sm transition-all`}
            >
                <Users size={14} className="opacity-80" />
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold tracking-tight">{occupiedCount}/{totalCapacity}</span>
                    <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                        />
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-4 px-6 py-3 rounded-2xl border ${getStatusColor()} backdrop-blur-md shadow-lg transition-all`}
        >
            <div className="p-2 rounded-xl bg-white/20 dark:bg-white/5 shadow-inner">
                <Users size={24} />
            </div>
            
            <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tighter">{occupiedCount}</span>
                    <span className="text-xs opacity-60 font-medium">/ {totalCapacity}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-[100px]">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                        />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{percentage}%</span>
                </div>
            </div>

            {percentage >= 90 && (
                <motion.div 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="ml-2 flex items-center gap-1 text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full"
                >
                    <Zap size={10} fill="currentColor" /> ALMOST FULL
                </motion.div>
            )}
        </motion.div>
    );
};

export default OccupancyWidget;
