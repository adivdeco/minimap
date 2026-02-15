import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const SubscriptionStatusCard = ({
    planName,
    hasSubscription,
    pricePaid,
    daysLeft,
    progressPercentage,
    totalDuration,
    expiryDate
}) => {
    const navigate = useNavigate();

    return (
        <motion.div variants={itemVariants} className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-6 flex flex-col shadow-xl dark:shadow-none">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <CreditCard size={18} className="text-purple-600 dark:text-purple-400" />
                {planName}
            </h3>

            {hasSubscription ? (
                <div className="flex-1 flex flex-col justify-between">
                    <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 space-y-5">
                        {/* Top Row: Status & Price */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Active Plan</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs text-gray-400 uppercase font-bold tracking-wider">Price</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">₹{pricePaid}</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-200 dark:bg-white/10" />

                        {/* Bottom Row: Days & Progress */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{daysLeft}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ml-1">days left</span>
                                </div>
                                <span className="text-xs text-gray-400 font-mono">{progressPercentage.toFixed(0)}% used</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercentage}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className={`h-full rounded-full ${daysLeft < 3
                                        ? 'bg-red-500'
                                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                        }`}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                <span>Started</span>
                                <span>{totalDuration} Days Total</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">Expires on {expiryDate?.toLocaleDateString()}</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        <Clock className="text-gray-400 dark:text-gray-500" size={24} />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium mb-4">No active subscription</p>
                    <button onClick={() => navigate('/libraries')} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold">
                        Browse Plans &rarr;
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default SubscriptionStatusCard;
