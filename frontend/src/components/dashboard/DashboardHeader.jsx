import React from 'react';
import { motion } from 'framer-motion';

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const DashboardHeader = ({ user }) => {
    return (
        <motion.div variants={itemVariants} className="mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-300">{user?.name || 'User'}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Here is what's happening in your library today.</p>
        </motion.div>
    );
};

export default DashboardHeader;
