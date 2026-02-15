import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, PlusCircle, BookOpen, Users, CreditCard, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const ActionCard = ({ icon, title, subtitle, onClick }) => (
    <motion.button
        whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.08)" }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-2xl text-left transition-all group shadow-md dark:shadow-none hover:shadow-xl dark:hover:shadow-none hover:bg-gray-50 dark:hover:bg-white/10"
    >
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-between">
            {title}
            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-gray-400 dark:text-gray-500" />
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </motion.button>
);

const QuickActionsGrid = ({ isAdmin, userRole, setShowAttendance }) => {
    const navigate = useNavigate();

    return (
        <motion.div variants={itemVariants}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ActionCard
                    icon={<LayoutDashboard size={24} className="text-blue-600 dark:text-blue-400" />}
                    title="All Libraries"
                    subtitle="View available spaces"
                    onClick={() => navigate('/libraries')}
                />

                {isAdmin && (
                    <ActionCard
                        icon={<PlusCircle size={24} className="text-green-600 dark:text-green-400" />}
                        title="Add Library"
                        subtitle="Register new branch"
                        onClick={() => navigate('/add-library')}
                    />
                )}

                {userRole === 'library_owner' && (
                    <ActionCard
                        icon={<BookOpen size={24} className="text-purple-600 dark:text-purple-400" />}
                        title="My Libraries"
                        subtitle="Manage your branch"
                        onClick={() => navigate('/my-libraries')}
                    />
                )}

                {isAdmin && (
                    <ActionCard
                        icon={<Users size={24} className="text-yellow-600 dark:text-yellow-400" />}
                        title="Manage Users"
                        subtitle="Admin control panel"
                        onClick={() => navigate('/users')}
                    />
                )}

                {/* Generic fallback for students */}
                {!isAdmin && userRole !== 'library_owner' && (
                    <ActionCard
                        icon={<CreditCard size={24} className="text-pink-600 dark:text-pink-400" />}
                        title="History"
                        subtitle="View past sessions"
                        onClick={() => setShowAttendance(true)}
                    />
                )}
            </div>
        </motion.div>
    );
};

export default QuickActionsGrid;
