import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, changePassword } from '../api/users';
import { useAuth } from '../context/AuthContext';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { 
    User, Lock, Calendar, ArrowLeft, Camera,LogOut, 
    Mail, Phone, Shield, Save, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';

const Profile = () => {
    const navigate = useNavigate();
    const { logout: auth0Logout } = useAuth0();
    const { user, login, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        avatar: user?.avatar || ''
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await updateProfile(profileForm);
            login(response.user);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            setLoading(false);
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            setLoading(false);
            return;
        }

        try {
            await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
        } finally {
            setLoading(false);
        }
    };

        const handleLogout = () => {
        logout();
        auth0Logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
        navigate('/login');
    };

    // Animation Variants
    const tabContentVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
             {/* Ambient Background Glows */}
             <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => navigate('/')} 
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/10"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Account Settings</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* SIDEBAR NAVIGATION */}
                    <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                        {/* User Mini Profile */}
                        <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-purple-500 to-pink-500">
                                    <div className="w-full h-full rounded-full bg-[#18181b] overflow-hidden flex items-center justify-center">
                                         {user?.avatar ? (
                                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 border-4 border-[#0F0F12] rounded-full" title="Active"></div>
                            </div>
                            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                            <p className="text-sm text-gray-500 mb-4">{user?.email}</p>
                            <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-400 uppercase tracking-wide">
                                {user?.role} Account
                            </div>
                        </div>

                        {/* Navigation Menu */}
                        <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-2 overflow-hidden">
                            <TabButton 
                                id="profile" 
                                active={activeTab} 
                                onClick={setActiveTab} 
                                icon={<User size={18} />} 
                                label="Personal Info" 
                            />
                            <TabButton 
                                id="password" 
                                active={activeTab} 
                                onClick={setActiveTab} 
                                icon={<Lock size={18} />} 
                                label="Security" 
                            />
                            {/* <TabButton 
                                id="attendance" 
                                active={activeTab} 
                                onClick={setActiveTab} 
                                icon={<Calendar size={18} />} 
                                label="Attendance" 
                            /> */}
                            <button
                                onClick={handleLogout}
                                className="p-2.5 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1">
                        
                        {/* Status Message */}
                        <AnimatePresence>
                            {message.text && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                                        message.type === 'success' 
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}
                                >
                                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    <span className="font-medium">{message.text}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-6 md:p-8 min-h-[500px]">
                            <AnimatePresence mode="wait">
                                
                                {/* PROFILE TAB */}
                                {activeTab === 'profile' && (
                                    <motion.div 
                                        key="profile"
                                        variants={tabContentVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        <h3 className="text-2xl font-bold text-white mb-6">Personal Information</h3>
                                        <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-2xl">
                                            
                                            {/* Avatar Input */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Avatar URL</label>
                                                <div className="flex gap-4">
                                                    <div className="flex-1 relative group">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Camera size={18} className="text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="url"
                                                            value={profileForm.avatar}
                                                            onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                                                            placeholder="https://..."
                                                            className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">Paste a direct link to an image (e.g., from Imgur or Google Photos).</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <User size={18} className="text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={profileForm.name}
                                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Phone size={18} className="text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="tel"
                                                            value={profileForm.phone}
                                                            disabled
                                                            // onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-gray-400 cursor-not-allowed"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                                                <div className="relative opacity-75">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Mail size={18} className="text-gray-500" />
                                                    </div>
                                                    <input
                                                        type="email"
                                                        value={user?.email}
                                                        disabled
                                                        className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-gray-400 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {loading ? 'Saving...' : 'Save Changes'}
                                                    {!loading && <Save size={18} />}
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}

                                {/* SECURITY TAB */}
                                {activeTab === 'password' && (
                                    <motion.div 
                                        key="password"
                                        variants={tabContentVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        <h3 className="text-2xl font-bold text-white mb-2">Security</h3>
                                        <p className="text-gray-400 mb-8">Update your password to keep your account secure.</p>
                                        
                                        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-xl">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Shield size={18} className="text-gray-500" />
                                                    </div>
                                                    <input
                                                        type="password"
                                                        value={passwordForm.currentPassword}
                                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                        placeholder="Enter current password"
                                                    />
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/10 my-6"></div>

                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Lock size={18} className="text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="password"
                                                            value={passwordForm.newPassword}
                                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                            placeholder="Min. 6 characters"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <Lock size={18} className="text-gray-500" />
                                                        </div>
                                                        <input
                                                            type="password"
                                                            value={passwordForm.confirmPassword}
                                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                            placeholder="Re-enter new password"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
                                                >
                                                    {loading ? 'Updating...' : 'Update Password'}
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}

                                {/* ATTENDANCE TAB */}
                                {/* {activeTab === 'attendance' && (
                                    <motion.div 
                                        key="attendance"
                                        variants={tabContentVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-white">Attendance History</h3>
                                                <p className="text-gray-400 text-sm">Track your library visits over time.</p>
                                            </div>
                                            <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                                <span className="text-xs text-gray-400 uppercase font-bold mr-2">Total Visits</span>
                                                <span className="text-xl font-bold text-white">24</span>
                                            </div>
                                        </div>
                                        <div className="bg-[#18181b] rounded-xl p-4 border border-white/5">
                                            <AttendanceCalendar />
                                        </div>
                                    </motion.div>
                                )} */}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Internal Component for Sidebar Buttons
const TabButton = ({ id, active, onClick, icon, label }) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 mb-1 group ${
            active === id 
                ? 'bg-white/10 text-white font-medium' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
    >
        <div className={`p-2 rounded-lg transition-colors ${active === id ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 group-hover:bg-white/10'}`}>
            {icon}
        </div>
        <span className="text-sm">{label}</span>
        {active === id && (
            <motion.div layoutId="activeTabIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />
        )}
    </button>
);

export default Profile;