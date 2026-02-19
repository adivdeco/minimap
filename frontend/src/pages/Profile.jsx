import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, changePassword } from '../api/users';
import { useAuth } from '../context/AuthContext';
import {
    User, Lock, ArrowLeft, Camera, LogOut,
    Mail, Phone, Shield, Save, AlertCircle, CheckCircle2,
    Loader2, Sparkles, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';

// --- Reusable Input Component for cleaner code ---
const InputField = ({ icon: Icon, label, disabled, ...props }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">
            {label}
        </label>
        <div className={`relative group transition-all duration-300 rounded-xl p-[1px] ${
            disabled ? 'bg-slate-800/50' : 'bg-slate-800 focus-within:bg-gradient-to-r focus-within:from-indigo-500 focus-within:via-purple-500 focus-within:to-blue-500'
        }`}>
            <div className={`relative rounded-[11px] h-full flex items-center overflow-hidden transition-colors ${
                disabled ? 'bg-[#050914]/50 opacity-60' : 'bg-[#0b0f19]'
            }`}>
                <div className="absolute left-4 text-slate-500">
                    <Icon size={18} className={`transition-colors duration-300 ${!disabled && 'group-focus-within:text-indigo-400'}`} />
                </div>
                <input
                    disabled={disabled}
                    className="w-full pl-11 pr-4 py-3.5 bg-transparent text-white placeholder-slate-600 focus:outline-none text-sm font-medium disabled:cursor-not-allowed"
                    {...props}
                />
            </div>
        </div>
    </div>
);

const Profile = () => {
    const navigate = useNavigate();
    const { logout: auth0Logout } = useAuth0();
    const { user, login, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const AVATAR_STYLES = ['notionists', 'toon-head', 'adventurer', 'initials'];

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

    // Auto-dismiss messages
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

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

    const generateRandomAvatar = () => {
        const randomSeed = Math.random().toString(36).substring(7);
        const currentStyle = AVATAR_STYLES.find(s => profileForm.avatar?.includes(s)) || 'notionists';
        setProfileForm({ ...profileForm, avatar: `https://api.dicebear.com/9.x/${currentStyle}/svg?seed=${randomSeed}` });
    };

    const tabContentVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
        exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 font-['Outfit'] selection:bg-indigo-500/30 relative overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-5 mb-10"
                >
                    <button
                        onClick={() => navigate('/')}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10 text-slate-400 hover:text-white transition-all backdrop-blur-md"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Account Settings</h1>
                        <p className="text-slate-400 text-sm mt-1">Manage your profile, security, and preferences.</p>
                    </div>
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* SIDEBAR NAVIGATION */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-8"
                    >
                        {/* User Mini Profile */}
                        <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 opacity-50" />
                            
                            <div className="relative mb-5">
                                <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
                                    <div className="w-full h-full rounded-full bg-[#0b0f19] overflow-hidden flex items-center justify-center">
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-[#0b0f19] rounded-full shadow-sm" title="Active"></div>
                            </div>
                            
                            <h2 className="text-xl font-bold text-white tracking-tight">{user?.name}</h2>
                            <p className="text-sm text-slate-400 mb-5">{user?.email}</p>
                            
                            <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={14} /> {user?.role || 'Member'} Account
                            </div>
                        </div>

                        {/* Navigation Menu */}
                        <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-3">
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
                                icon={<Shield size={18} />}
                                label="Security"
                            />
                            <div className="h-px bg-white/5 my-2 mx-4" />
                            <button
                                onClick={handleLogout}
                                className="w-full p-3.5 rounded-2xl flex items-center gap-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group mt-1"
                            >
                                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-rose-500/20 transition-colors">
                                    <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <span className="text-sm font-medium">Log out of account</span>
                            </button>
                        </div>
                    </motion.div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 w-full">
                        {/* Status Message Toast */}
                        <AnimatePresence>
                            {message.text && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                    className={`mb-6 p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 shadow-lg ${
                                        message.type === 'success'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/5'
                                    }`}
                                >
                                    <div className={`p-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    </div>
                                    <span className="font-medium text-sm">{message.text}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6 md:p-10 min-h-[600px]">
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
                                        <div className="mb-8">
                                            <h3 className="text-2xl font-bold text-white tracking-tight">Personal Information</h3>
                                            <p className="text-slate-400 text-sm mt-1">Update your photo and personal details here.</p>
                                        </div>

                                        <form onSubmit={handleProfileSubmit} className="space-y-8 max-w-2xl">
                                            {/* Avatar Customization Block */}
                                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 md:p-8">
                                                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                                    
                                                    {/* Avatar Preview */}
                                                    <div className="relative group shrink-0">
                                                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-slate-800 to-slate-700">
                                                            <div className="w-full h-full rounded-full bg-[#0b0f19] overflow-hidden">
                                                                <img
                                                                    src={profileForm.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${profileForm.name}`}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={generateRandomAvatar}
                                                            className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition-colors border-2 border-[#0b0f19]"
                                                        >
                                                            <RefreshCw size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Avatar Controls */}
                                                    <div className="flex-1 space-y-5 w-full">
                                                        <div>
                                                            <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3 block">Art Style Selection</label>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {AVATAR_STYLES.map((style) => (
                                                                    <button
                                                                        key={style}
                                                                        type="button"
                                                                        onClick={() => setProfileForm({ ...profileForm, avatar: `https://api.dicebear.com/9.x/${style}/svg?seed=${profileForm.name || 'user'}` })}
                                                                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border ${
                                                                            profileForm.avatar?.includes(style)
                                                                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                                                                : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                                                                        }`}
                                                                    >
                                                                        {style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' ')}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-3">
                                                            <div className="relative flex-1">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                    <Camera size={16} className="text-slate-500" />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={profileForm.avatar}
                                                                    onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                                                                    placeholder="Or paste a custom image URL..."
                                                                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <InputField
                                                    icon={User}
                                                    label="Full Name"
                                                    type="text"
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                    placeholder="John Doe"
                                                />
                                                <InputField
                                                    icon={Phone}
                                                    label="Phone Number"
                                                    type="tel"
                                                    value={profileForm.phone}
                                                    disabled
                                                    placeholder="Not provided"
                                                />
                                            </div>

                                            <InputField
                                                icon={Mail}
                                                label="Email Address"
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                            />

                                            <div className="pt-6">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="group relative px-8 py-3.5 bg-white text-black font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center gap-2"
                                                >
                                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-slate-200/50 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                                    <span className="relative flex items-center gap-2">
                                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                        {loading ? 'Saving Changes...' : 'Save Changes'}
                                                    </span>
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
                                        <div className="mb-8">
                                            <h3 className="text-2xl font-bold text-white tracking-tight">Security Settings</h3>
                                            <p className="text-slate-400 text-sm mt-1">Ensure your account is using a long, random password.</p>
                                        </div>

                                        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-xl">
                                            <InputField
                                                icon={Shield}
                                                label="Current Password"
                                                type="password"
                                                value={passwordForm.currentPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                placeholder="Enter current password"
                                            />

                                            <div className="py-2">
                                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                            </div>

                                            <InputField
                                                icon={Lock}
                                                label="New Password"
                                                type="password"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                placeholder="Minimum 6 characters"
                                            />

                                            <InputField
                                                icon={Lock}
                                                label="Confirm New Password"
                                                type="password"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                placeholder="Re-enter new password"
                                            />

                                            <div className="pt-6">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="group relative px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(79,70,229,0.3)] flex items-center gap-2"
                                                >
                                                    <span className="relative flex items-center gap-2">
                                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                                                        {loading ? 'Updating Security...' : 'Update Password'}
                                                    </span>
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reusable Internal Component for Sidebar Tabs
const TabButton = ({ id, active, onClick, icon, label }) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 mb-1.5 group relative overflow-hidden ${
            active === id
                ? 'text-white font-medium bg-white/[0.05] shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
        }`}
    >
        <div className={`p-2 rounded-xl transition-all duration-300 relative z-10 ${
            active === id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:scale-110'
        }`}>
            {icon}
        </div>
        
        <span className="text-sm tracking-wide relative z-10">{label}</span>
        
        {active === id && (
            <motion.div 
                layoutId="activeTabIndicator" 
                className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        )}
    </button>
);

export default Profile;