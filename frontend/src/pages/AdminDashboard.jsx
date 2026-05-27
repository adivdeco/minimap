import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from 'react-toastify';
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, Settings, Activity, ShieldAlert, Cpu, Database, 
    Clock, HardDrive, RefreshCw, Save, Trash2, Edit, AlertTriangle, 
    ArrowUpRight, BarChart2, ShieldCheck, Server, Globe, Search, Plus, X,
    Lock, Unlock
} from 'lucide-react';

import * as userApi from "../api/users";
import * as adminApi from "../api/admin";
import { UserUpdateSchema } from "../api/userValidationSchema";
import { useAuth } from "../context/AuthContext";
import ImageUpload from "./ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";

function AdminDashboard() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState("users");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ==========================================
    // TAB 1: USERS STATE & FUNCTIONS
    // ==========================================
    const [users, setUsers] = useState([]);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch,
        reset
    } = useForm({
        resolver: zodResolver(UserUpdateSchema)
    });

    const watchedRole = watch("role");

    // ==========================================
    // TAB 2: CONFIGURATION STATE
    // ==========================================
    const [configUpdates, setConfigUpdates] = useState({});
    const [configDescription, setConfigDescription] = useState({});
    const [newAmenity, setNewAmenity] = useState("");

    // ==========================================
    // TAB 3: SYSTEM HEALTH STATE
    // ==========================================
    const [dbStats, setDbStats] = useState(null);
    const [systemMetrics, setSystemMetrics] = useState(null);

    // ==========================================
    // TAB 4: API & RATE LIMITING STATE
    // ==========================================
    const [summary24h, setSummary24h] = useState(null);
    const [topIPs, setTopIPs] = useState([]);
    const [routePerformance, setRoutePerformance] = useState([]);
    const [recentViolations, setRecentViolations] = useState([]);
    const [hourlyTimeline, setHourlyTimeline] = useState([]);
    const [blockedIPs, setBlockedIPs] = useState([]);

    // ==========================================
    // SIDE EFFECTS & FETCHING
    // ==========================================
    useEffect(() => {
        if (activeTab === "users") {
            fetchUsers(currentPage);
        } else if (activeTab === "config") {
            fetchConfigs();
        } else if (activeTab === "health") {
            fetchHealth();
        } else if (activeTab === "rate-limits") {
            fetchRateLimits();
        }
    }, [activeTab, currentPage]);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter]);

    // ==========================================
    // API CALLS
    // ==========================================
    const fetchUsers = async (page = 1) => {
        try {
            setLoading(page === 1);
            const response = await userApi.getAllUsers({ page, limit: 10 });
            if (response.users) {
                setUsers(response.users);
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages);
                }
            } else {
                setUsers(Array.isArray(response) ? response : []);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getSystemConfig();
            if (response.success && response.configs) {
                const vals = {};
                const descs = {};
                Object.keys(response.configs).forEach(key => {
                    vals[key] = response.configs[key].value;
                    descs[key] = response.configs[key].description;
                });
                setConfigUpdates(vals);
                setConfigDescription(descs);
            }
        } catch (error) {
            toast.error("Failed to fetch configurations");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchHealth = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getSystemHealth();
            if (response.success) {
                setDbStats(response.dbStats);
                setSystemMetrics(response.system);
            }
        } catch (error) {
            toast.error("Failed to fetch system health details");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchRateLimits = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getRateLimitAnalytics();
            if (response.success) {
                setSummary24h(response.summary);
                setTopIPs(response.topIPs);
                setRoutePerformance(response.routePerformance);
                setRecentViolations(response.recentViolations);
                setHourlyTimeline(response.hourlyTimeline);
            }
            const configResponse = await adminApi.getSystemConfig();
            if (configResponse.success && configResponse.configs) {
                setBlockedIPs(configResponse.configs.blockedIPs?.value || []);
            }
        } catch (error) {
            toast.error("Failed to fetch rate limiting analytics");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        if (activeTab === "users") fetchUsers(currentPage);
        if (activeTab === "config") fetchConfigs();
        if (activeTab === "health") fetchHealth();
        if (activeTab === "rate-limits") fetchRateLimits();
    };

    const handleBlockIP = async (ip) => {
        try {
            const response = await adminApi.blockIP(ip);
            if (response.success) {
                toast.success(response.message);
                setBlockedIPs(response.blockedIPs || []);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to block IP address");
        }
    };

    const handleUnblockIP = async (ip) => {
        try {
            const response = await adminApi.unblockIP(ip);
            if (response.success) {
                toast.success(response.message);
                setBlockedIPs(response.blockedIPs || []);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to unblock IP address");
        }
    };

    const handleToggleUserLock = async (u) => {
        try {
            if (u.isLocked) {
                const res = await adminApi.unlockUser(u._id);
                if (res.success) {
                    toast.success(res.message);
                    setUsers(prev => prev.map(usr => usr._id === u._id ? { ...usr, isLocked: false } : usr));
                    setRecentViolations(prev => prev.map(v => {
                        if (v.user && v.user.id === u._id) {
                            return { ...v, user: { ...v.user, isLocked: false } };
                        }
                        return v;
                    }));
                }
            } else {
                const res = await adminApi.lockUser(u._id);
                if (res.success) {
                    toast.success(res.message);
                    setUsers(prev => prev.map(usr => usr._id === u._id ? { ...usr, isLocked: true } : usr));
                    setRecentViolations(prev => prev.map(v => {
                        if (v.user && v.user.id === u._id) {
                            return { ...v, user: { ...v.user, isLocked: true } };
                        }
                        return v;
                    }));
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to toggle account lock status");
        }
    };

    const handleClearLogs = async () => {
        if (window.confirm("Are you sure you want to purge all API traffic and security logs? This will free up database storage but delete all historical access charts/timeline.")) {
            try {
                const res = await adminApi.clearApiLogs();
                if (res.success) {
                    toast.success(res.message);
                    setSummary24h({
                        totalRequests24h: 0,
                        rateLimitedCount24h: 0,
                        serverErrors24h: 0,
                        rateLimitedRatio24h: 0
                    });
                    setTopIPs([]);
                    setRoutePerformance([]);
                    setRecentViolations([]);
                    setHourlyTimeline([]);
                }
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to clear logs");
            }
        }
    };

    // ==========================================
    // USER CRUDS ACTIONS
    // ==========================================
    const filterUsers = () => {
        let filtered = users;
        if (searchTerm) {
            filtered = filtered.filter(u =>
                u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.phone?.includes(searchTerm)
            );
        }
        if (roleFilter !== "all") {
            filtered = filtered.filter(u => u.role === roleFilter);
        }
        setFilteredUsers(filtered);
    };

    const handleDeleteClick = (u) => {
        setUserToDelete(u);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await userApi.deleteUser(userToDelete._id);
            setUsers(users.filter(u => u._id !== userToDelete._id));
            setShowDeleteModal(false);
            setUserToDelete(null);
            toast.success("User deleted successfully");
        } catch (error) {
            toast.error("Failed to delete user");
        }
    };

    const handleUpdateClick = (u) => {
        setSelectedUser(u);
        reset();

        setValue("name", u.name || "");
        setValue("email", u.email || "");
        setValue("phone", u.phone || "");
        setValue("role", u.role || "User");
        setValue("avatar", u.avatar || "");

        const mainAddress = u.addresses && u.addresses.length > 0 ? u.addresses[0] : {};
        setValue("address.street", mainAddress.street || "");
        setValue("address.city", mainAddress.city || "");
        setValue("address.state", mainAddress.state || "");
        setValue("address.pincode", mainAddress.pincode || "");
        setValue("address.country", mainAddress.country || "");

        if (u.role === 'library_owner' && u.libraryOwnerDetails) {
            setValue("libraryOwnerDetails.gstNumber", u.libraryOwnerDetails.gstNumber || "");
            setValue("libraryOwnerDetails.businessPan", u.libraryOwnerDetails.businessPan || "");
        }

        if (u.studentDetails) {
            const sub = u.studentDetails.currentSubscription || {};
            const seat = u.studentDetails.assignedSeat || {};
            setValue("studentDetails.currentSubscription.status", sub.status || "pending");
            setValue("studentDetails.currentSubscription.planId", sub.planId ? (typeof sub.planId === 'object' ? sub.planId._id : sub.planId) : "");
            if (sub.startDate) setValue("studentDetails.currentSubscription.startDate", new Date(sub.startDate).toISOString().split('T')[0]);
            if (sub.expiryDate) setValue("studentDetails.currentSubscription.expiryDate", new Date(sub.expiryDate).toISOString().split('T')[0]);
            setValue("studentDetails.assignedSeat.seatNumber", seat.seatNumber || "");
        }

        setShowUpdateModal(true);
    };

    const handleAvatarUpdate = (url) => {
        setAvatarUrl(url);
        setValue('avatar', url);
    };

    const handleUpdateSubmit = async (data) => {
        try {
            if (!selectedUser || !selectedUser._id) {
                toast.error("User ID is missing.");
                return;
            }
            const addressData = {
                ...data.address,
                label: 'home',
                isDefault: true
            };
            const updatePayload = {
                ...data,
                addresses: [addressData],
                avatar: avatarUrl || data.avatar
            };
            await userApi.updateUser(selectedUser._id, updatePayload);
            toast.success('User updated successfully');
            setShowUpdateModal(false);
            fetchUsers(currentPage);
            setAvatarUrl('');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update user");
        }
    };

    // ==========================================
    // CONFIGURATION ACTIONS
    // ==========================================
    const handleConfigChange = (key, val) => {
        setConfigUpdates(prev => ({
            ...prev,
            [key]: val
        }));
    };

    const handleAmenityAdd = (e) => {
        e.preventDefault();
        if (!newAmenity.trim()) return;
        const currentAmenities = configUpdates.defaultAmenities || [];
        if (currentAmenities.includes(newAmenity.trim())) {
            toast.warn("Amenity already exists");
            return;
        }
        handleConfigChange('defaultAmenities', [...currentAmenities, newAmenity.trim()]);
        setNewAmenity("");
    };

    const handleAmenityRemove = (amenity) => {
        const currentAmenities = configUpdates.defaultAmenities || [];
        handleConfigChange('defaultAmenities', currentAmenities.filter(a => a !== amenity));
    };

    const saveConfigs = async () => {
        try {
            setLoading(true);
            const response = await adminApi.updateSystemConfig(configUpdates);
            if (response.success) {
                toast.success("Configurations updated successfully");
                fetchConfigs();
            }
        } catch (error) {
            toast.error("Failed to save configurations");
            setLoading(false);
        }
    };

    // ==========================================
    // RENDERING UTILITIES
    // ==========================================
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'co-admin': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'library_owner': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'User': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-[#070709] text-gray-100 font-sans selection:bg-purple-500 selection:text-white">
            <Navbar />
            <ToastContainer position="top-right" theme="dark" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 pb-6 border-b border-white/5">
                    <div>
                        <motion.h1 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-indigo-500"
                        >
                            Admin Control Center
                        </motion.h1>
                        <p className="text-gray-400 mt-2 text-sm">Monitor system resources, override user configurations, and track API logs.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === "rate-limits" && (
                            <button
                                onClick={handleClearLogs}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95"
                            >
                                <Trash2 size={16} />
                                <span className="text-sm font-medium">Clear Logs</span>
                            </button>
                        )}
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={refreshing ? "animate-spin text-purple-400" : "text-gray-400"} />
                            <span className="text-sm font-medium">Refresh Data</span>
                        </button>
                    </div>
                </div>

                {/* Dashboard Tabs */}
                <div className="flex border-b border-white/5 mb-8 overflow-x-auto gap-2 scrollbar-none">
                    <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users size={16} />} label="User Management" />
                    <TabButton active={activeTab === "config"} onClick={() => setActiveTab("config")} icon={<Settings size={16} />} label="Platform Settings" />
                    <TabButton active={activeTab === "health"} onClick={() => setActiveTab("health")} icon={<Activity size={16} />} label="System Health" />
                    <TabButton active={activeTab === "rate-limits"} onClick={() => setActiveTab("rate-limits")} icon={<ShieldAlert size={16} />} label="API & Security Logs" />
                </div>

                {/* Loading State Overlay */}
                {loading && (
                    <div className="min-h-[400px] flex items-center justify-center">
                        <LoadingSpinner />
                    </div>
                )}

                {/* Tab Contents */}
                {!loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* ==========================================
                            TAB 1: USER MANAGEMENT
                           ========================================== */}
                        {activeTab === "users" && (
                            <div className="space-y-6">
                                {/* Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-xl">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Search Accounts</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3.5 text-gray-500" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Name, email or phone..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Filter Roles</label>
                                        <select
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm text-gray-300"
                                        >
                                            <option value="all">All Roles</option>
                                            <option value="admin">Admin</option>
                                            <option value="co-admin">Co-Admin</option>
                                            <option value="library_owner">Library Owner</option>
                                            <option value="User">User</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Users Found</label>
                                        <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                                            <span className="text-white font-bold text-sm">{filteredUsers.length} Users</span>
                                        </div>
                                    </div>
                                </div>

                                {/* User Cards Grid */}
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredUsers.length === 0 ? (
                                        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/5">
                                            <p className="text-gray-400 text-sm">No accounts found matching the criteria.</p>
                                        </div>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <div 
                                                key={u._id} 
                                                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 hover:bg-white/[0.08] transition-all group"
                                            >
                                                <div 
                                                    className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                    onClick={() => setSelectedUser(selectedUser?._id === u._id ? null : u)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {u.avatar ? (
                                                            <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                                        ) : (
                                                            <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                                {u.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div>
                                                            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">{u.name}</h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(u.role)}`}>
                                                                    {u.role}
                                                                </span>
                                                                {u.isLocked && (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-red-500/20 bg-red-500/10 text-red-400 font-semibold">
                                                                        Locked
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-gray-400">{u.email}</span>
                                                                <span className="text-[11px] text-gray-500">Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end md:self-auto">
                                                        <button
                                                            disabled={u._id === currentUser?._id || ((u.role === 'admin' || u.role === 'co-admin') && currentUser?.role !== 'admin')}
                                                            onClick={(e) => { e.stopPropagation(); handleToggleUserLock(u); }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold border disabled:opacity-40 disabled:cursor-not-allowed ${
                                                                u.isLocked 
                                                                    ? 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-400' 
                                                                    : 'border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-400'
                                                            }`}
                                                            title={u._id === currentUser?._id ? "You cannot lock your own account" : ""}
                                                        >
                                                            {u.isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                                                            {u.isLocked ? 'Unlock' : 'Lock'}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateClick(u); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold text-gray-300"
                                                        >
                                                            <Edit size={13} />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(u); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-all text-xs font-semibold text-red-300"
                                                        >
                                                            <Trash2 size={13} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expandable Section */}
                                                {selectedUser?._id === u._id && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        className="px-5 pb-5 pt-4 bg-black/40 border-t border-white/5 text-sm text-gray-300 grid grid-cols-1 md:grid-cols-3 gap-6"
                                                    >
                                                        <div className="space-y-1">
                                                            <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">User Details</h4>
                                                            <p><span className="text-gray-400">Phone:</span> {u.phone || 'N/A'}</p>
                                                            <p><span className="text-gray-400">Provider:</span> {u.loginProvider || 'email'}</p>
                                                            <p><span className="text-gray-400">Verified:</span> {u.emailVerified ? 'Yes' : 'No'}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Billing Address</h4>
                                                            {u.addresses?.[0] ? (
                                                                <p className="text-gray-400">
                                                                    {u.addresses[0].street}<br/>
                                                                    {u.addresses[0].city}, {u.addresses[0].state} - {u.addresses[0].pincode}
                                                                </p>
                                                            ) : (
                                                                <p className="text-gray-500 italic">No address provided</p>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Access & Subscription</h4>
                                                            {u.studentDetails?.currentSubscription ? (
                                                                <>
                                                                    <p>
                                                                        <span className="text-gray-400 text-xs">Status:</span>
                                                                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] uppercase font-bold ${u.studentDetails.currentSubscription.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                            {u.studentDetails.currentSubscription.status}
                                                                        </span>
                                                                    </p>
                                                                    <p><span className="text-gray-400">Expiry:</span> {new Date(u.studentDetails.currentSubscription.expiryDate).toLocaleDateString()}</p>
                                                                    <p><span className="text-gray-400">Assigned Seat:</span> <span className="font-extrabold text-purple-400">{u.studentDetails?.assignedSeat?.seatNumber || 'None'}</span></p>
                                                                </>
                                                            ) : (
                                                                <p className="text-gray-500 italic">No active membership</p>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-8">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs disabled:opacity-30 disabled:pointer-events-none transition"
                                        >
                                            Prev
                                        </button>
                                        <span className="text-xs text-gray-400">Page {currentPage} of {totalPages}</span>
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs disabled:opacity-30 disabled:pointer-events-none transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ==========================================
                            TAB 2: PLATFORM CONFIGURATION
                           ========================================== */}
                        {activeTab === "config" && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Form Left/Center */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
                                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                            <Settings className="text-purple-400" size={18} />
                                            Platform Operations Config
                                        </h2>

                                        <div className="space-y-6">
                                            {/* Max Daily Checkins */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Max Daily Check-ins</label>
                                                <input
                                                    type="number"
                                                    value={configUpdates.maxDailyCheckins || ""}
                                                    onChange={(e) => handleConfigChange('maxDailyCheckins', Number(e.target.value))}
                                                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{configDescription.maxDailyCheckins}</p>
                                            </div>

                                            {/* Grace Period Default */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Grace Period Days (Default)</label>
                                                <input
                                                    type="number"
                                                    value={configUpdates.gracePeriodDefaultDays || ""}
                                                    onChange={(e) => handleConfigChange('gracePeriodDefaultDays', Number(e.target.value))}
                                                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{configDescription.gracePeriodDefaultDays}</p>
                                            </div>

                                            {/* OTP Expiry Minutes */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">OTP Expiry (Minutes)</label>
                                                <input
                                                    type="number"
                                                    value={configUpdates.otpExpiryMinutes || ""}
                                                    onChange={(e) => handleConfigChange('otpExpiryMinutes', Number(e.target.value))}
                                                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{configDescription.otpExpiryMinutes}</p>
                                            </div>

                                            {/* Attendance TTL Days */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Attendance Retention (Days)</label>
                                                <input
                                                    type="number"
                                                    value={configUpdates.attendanceTtlDays || ""}
                                                    onChange={(e) => handleConfigChange('attendanceTtlDays', Number(e.target.value))}
                                                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{configDescription.attendanceTtlDays}</p>
                                            </div>

                                            {/* Rate Limit Max */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-1">Rate Limit Threshold (Requests per 15 min)</label>
                                                <input
                                                    type="number"
                                                    value={configUpdates.apiRateLimitMax || ""}
                                                    onChange={(e) => handleConfigChange('apiRateLimitMax', Number(e.target.value))}
                                                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition text-sm"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{configDescription.apiRateLimitMax}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={saveConfigs}
                                            className="mt-8 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition active:scale-95 text-sm"
                                        >
                                            <Save size={16} />
                                            Save System Settings
                                        </button>
                                    </div>
                                </div>

                                {/* Amenities list Right */}
                                <div className="space-y-6">
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
                                        <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">Amenities Library</h3>
                                        <p className="text-xs text-gray-400 mb-4">Add or remove system-wide amenities allowed for library profiles.</p>

                                        <form onSubmit={handleAmenityAdd} className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                placeholder="New Amenity..."
                                                value={newAmenity}
                                                onChange={(e) => setNewAmenity(e.target.value)}
                                                className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs focus:border-purple-500 focus:outline-none"
                                            />
                                            <button 
                                                type="submit"
                                                className="px-3 py-1.5 bg-white/10 text-white border border-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold"
                                            >
                                                Add
                                            </button>
                                        </form>

                                        <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                                            {(configUpdates.defaultAmenities || []).map((amenity, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-white/5 border border-white/5 text-[11px] text-gray-300 font-medium"
                                                >
                                                    {amenity}
                                                    <button 
                                                        onClick={() => handleAmenityRemove(amenity)}
                                                        className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-red-400 transition"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ==========================================
                            TAB 3: SYSTEM HEALTH
                           ========================================== */}
                        {activeTab === "health" && (
                            <div className="space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <MetricCard icon={<Users className="text-purple-400" />} label="Total Accounts" value={dbStats?.users} />
                                    <MetricCard icon={<Server className="text-blue-400" />} label="Total Libraries" value={dbStats?.libraries} />
                                    <MetricCard 
                                        icon={<ShieldCheck className="text-emerald-400" />} 
                                        label="Active Subscriptions" 
                                        value={`${dbStats?.subscriptions?.active} / ${dbStats?.subscriptions?.total}`} 
                                    />
                                    <MetricCard 
                                        icon={<HardDrive className="text-yellow-400" />} 
                                        label="Seats Claimed" 
                                        value={`${dbStats?.seats?.occupied} / ${dbStats?.seats?.total}`} 
                                    />
                                </div>

                                {/* Detailed System Health / Resource monitoring */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* DB stats */}
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
                                        <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                                            <Database className="text-purple-400" size={16} />
                                            Database Collection Diagnostics
                                        </h2>
                                        
                                        <div className="space-y-4">
                                            <HealthStatRow label="Mongoose Schemas Count" value="11 Models" status="OK" />
                                            <HealthStatRow label="Active Check-in Count" value={`${dbStats?.seats?.occupied || 0} users`} status="ACTIVE" />
                                            <HealthStatRow label="Seats Under Maintenance" value={`${dbStats?.seats?.maintenance || 0} seats`} status="WARNING" />
                                            <HealthStatRow label="Total Attendance Entries" value={`${dbStats?.attendances || 0} records`} status="OK" />
                                            <HealthStatRow label="Active Platform Bulletins" value={`${dbStats?.notices || 0} notices`} status="OK" />
                                            <HealthStatRow label="Competitive Mock Tests" value={`${dbStats?.quizzes || 0} templates`} status="OK" />
                                        </div>
                                    </div>

                                    {/* OS Resource status */}
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
                                        <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                                            <Cpu className="text-indigo-400" size={16} />
                                            Server Node.js Uptime & Platform
                                        </h2>

                                        <div className="space-y-4">
                                            <HealthStatRow label="Node Process Uptime" value={systemMetrics?.uptimeFormatted} status="OK" />
                                            <HealthStatRow label="Host Memory (RAM) Available" value={`${systemMetrics?.os?.freeMemory} / ${systemMetrics?.os?.totalMemory}`} status="OK" />
                                            <HealthStatRow label="Resident Set Size (RSS)" value={systemMetrics?.memory?.rss} status="OK" />
                                            <HealthStatRow label="Heap memory (Used / Total)" value={`${systemMetrics?.memory?.heapUsed} / ${systemMetrics?.memory?.heapTotal}`} status="OK" />
                                            <HealthStatRow label="System Process Platform" value={`${systemMetrics?.platform} (${systemMetrics?.nodeVersion})`} status="OK" />
                                            <HealthStatRow label="OS CPU Core Count" value={`${systemMetrics?.os?.cpuCores} Cores`} status="OK" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ==========================================
                            TAB 4: RATE LIMITS & SECURITY
                           ========================================== */}
                        {activeTab === "rate-limits" && (
                            <div className="space-y-6">
                                {/* Traffic summary cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <MetricCard icon={<Globe className="text-indigo-400" />} label="Traffic Total (24h)" value={summary24h?.totalRequests24h} />
                                    <MetricCard 
                                        icon={<ShieldAlert className="text-red-400" />} 
                                        label="Rate Limited (24h)" 
                                        value={`${summary24h?.rateLimitedCount24h} hits`} 
                                    />
                                    <MetricCard 
                                        icon={<AlertTriangle className="text-yellow-400" />} 
                                        label="Internal Errors (24h)" 
                                        value={`${summary24h?.serverErrors24h} calls`} 
                                    />
                                    <MetricCard 
                                        icon={<BarChart2 className="text-purple-400" />} 
                                        label="Block Ratio" 
                                        value={`${summary24h?.rateLimitedRatio24h}%`} 
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Route performance latency */}
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
                                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <Clock className="text-indigo-400" size={14} />
                                            API Route Average Latency
                                        </h3>
                                        <div className="max-h-[350px] overflow-y-auto pr-1 space-y-3">
                                            {routePerformance.map((rp, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-black/40 border border-white/5 rounded-xl text-xs">
                                                    <div>
                                                        <span className="font-mono text-purple-400 mr-2 uppercase">{rp.method}</span>
                                                        <span className="font-medium text-gray-200">{rp.path}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-white">{rp.averageLatencyMs} ms</p>
                                                        <p className="text-[10px] text-gray-500">{rp.totalCalls} requests • {rp.errorCount} err</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Top Client IPs */}
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                                <Globe className="text-purple-400" size={14} />
                                                Top IP Address Violators / Volume
                                            </h3>
                                            <div className="max-h-[230px] overflow-y-auto pr-1 space-y-3">
                                                {topIPs.map((ip, idx) => {
                                                    const isBlocked = blockedIPs.includes(ip.ip);
                                                    return (
                                                        <div key={idx} className="flex justify-between items-center p-3 bg-black/40 border border-white/5 rounded-xl text-xs">
                                                            <div>
                                                                <p className="font-mono text-gray-200 font-semibold">{ip.ip}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right">
                                                                    <p className="font-bold text-white">{ip.totalRequests} reqs</p>
                                                                    {ip.rateLimitedRequests > 0 && (
                                                                        <p className="text-[10px] text-red-400 font-semibold">{ip.rateLimitedRequests} limited blocks</p>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => isBlocked ? handleUnblockIP(ip.ip) : handleBlockIP(ip.ip)}
                                                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all active:scale-95 border ${
                                                                        isBlocked 
                                                                            ? 'border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-400' 
                                                                            : 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-400'
                                                                    }`}
                                                                >
                                                                    {isBlocked ? 'Unblock' : 'Block IP'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-6 border-t border-white/5 pt-6">
                                            <h3 className="text-xs font-bold text-red-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                                                <ShieldAlert size={12} className="text-red-400" />
                                                Currently Blacklisted IPs
                                            </h3>
                                            <div className="max-h-[140px] overflow-y-auto pr-1 space-y-2">
                                                {blockedIPs.length === 0 ? (
                                                    <p className="text-xs text-gray-500 italic">No IP addresses are currently blacklisted.</p>
                                                ) : (
                                                    blockedIPs.map((ip, idx) => (
                                                        <div key={idx} className="flex justify-between items-center p-2.5 bg-black/40 border border-white/5 rounded-xl text-xs">
                                                            <span className="font-mono text-gray-200 font-semibold">{ip}</span>
                                                            <button
                                                                onClick={() => handleUnblockIP(ip)}
                                                                className="px-2.5 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 text-[10px] font-bold uppercase text-red-300 transition-all active:scale-95"
                                                            >
                                                                Unblock
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Rate Limit Violations log */}
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
                                    <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <ShieldAlert className="text-red-400" size={14} />
                                        Rate Limit Block Violations Timeline
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/10 text-gray-500 font-bold uppercase tracking-wider">
                                                    <th className="pb-3 pr-4">Timestamp</th>
                                                    <th className="pb-3 pr-4">IP Address</th>
                                                    <th className="pb-3 pr-4">Request Endpoint</th>
                                                    <th className="pb-3 pr-4">User</th>
                                                    <th className="pb-3">User-Agent</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-gray-300">
                                                {recentViolations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-4 text-center text-gray-500 italic">No rate limit violations logged.</td>
                                                    </tr>
                                                ) : (
                                                    recentViolations.map((v, idx) => {
                                                        const isIpBlocked = blockedIPs.includes(v.ip);
                                                        return (
                                                            <tr key={idx} className="hover:bg-white/[0.02]">
                                                                <td className="py-3 pr-4 text-gray-400 font-mono">
                                                                    {new Date(v.timestamp).toLocaleString('en-GB')}
                                                                </td>
                                                                <td className="py-3 pr-4 font-mono">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold">{v.ip}</span>
                                                                        <button
                                                                            onClick={() => isIpBlocked ? handleUnblockIP(v.ip) : handleBlockIP(v.ip)}
                                                                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border ${
                                                                                isIpBlocked
                                                                                    ? 'border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300'
                                                                                    : 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                                                                            }`}
                                                                        >
                                                                            {isIpBlocked ? 'Unblock' : 'Block'}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 pr-4">
                                                                    <span className="font-mono text-red-400 mr-2 uppercase">{v.method}</span>
                                                                    <span className="font-mono">{v.path}</span>
                                                                </td>
                                                                <td className="py-3 pr-4">
                                                                    {v.user ? (
                                                                        <div className="flex items-center justify-between gap-2 max-w-[200px]">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-bold text-white">{v.user.name}</span>
                                                                                <span className="text-[10px] text-gray-500">{v.user.email}</span>
                                                                            </div>
                                                                            <button
                                                                                disabled={v.user.id === currentUser?._id}
                                                                                onClick={() => handleToggleUserLock({ _id: v.user.id, isLocked: v.user.isLocked, name: v.user.name })}
                                                                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
                                                                                    v.user.isLocked
                                                                                        ? 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                                                                                        : 'border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                                                                                }`}
                                                                            >
                                                                                {v.user.isLocked ? 'Unlock' : 'Lock'}
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-500 italic">Anonymous</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-3 text-gray-400 max-w-[200px] truncate" title={v.userAgent}>
                                                                    {v.userAgent}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* User Edit Modal */}
            <AnimatePresence>
                {showUpdateModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0F0F12] border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full my-8 p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Update Account Settings</h3>
                                <button onClick={() => setShowUpdateModal(false)} className="text-gray-500 hover:text-white transition">✕</button>
                            </div>

                            <form onSubmit={handleSubmit(handleUpdateSubmit)} className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Account Name</label>
                                        <input {...register("name")} className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Email Address</label>
                                        <input {...register("email")} className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Phone Number</label>
                                        <input {...register("phone")} className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Access Role</label>
                                        <select {...register("role")} className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-gray-300">
                                            <option value="User">User</option>
                                            <option value="co-admin">Co-Admin</option>
                                            <option value="library_owner">Library Owner</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="border-t border-white/5 pt-4">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Address Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input {...register("address.street")} placeholder="Street" className="p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                        <input {...register("address.city")} placeholder="City" className="p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                        <input {...register("address.state")} placeholder="State" className="p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                        <input {...register("address.pincode")} placeholder="Pincode" className="p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                    </div>
                                </div>

                                {/* Library Owner details override */}
                                {watchedRole === 'library_owner' && (
                                    <div className="border-t border-white/5 pt-4">
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Verification Info</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input {...register("libraryOwnerDetails.gstNumber")} placeholder="GST Number" className="p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                            <input {...register("libraryOwnerDetails.businessPan")} placeholder="Business PAN" className="p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                        </div>
                                    </div>
                                )}

                                {/* Admin Force override access limits */}
                                {(currentUser?.role === 'admin' || currentUser?.role === 'co-admin') && (
                                    <div className="border-t border-white/5 pt-4 bg-red-500/5 p-4 rounded-xl border-red-500/10">
                                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            Administrative Overrides
                                            <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">DB Write</span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Membership Status</label>
                                                <select {...register("studentDetails.currentSubscription.status")} className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-gray-300">
                                                    <option value="pending">Pending</option>
                                                    <option value="active">Active</option>
                                                    <option value="expired">Expired</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Plan ObjectId</label>
                                                <input {...register("studentDetails.currentSubscription.planId")} placeholder="Plan ID" className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Membership Start Date</label>
                                                <input type="date" {...register("studentDetails.currentSubscription.startDate")} className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Membership Expiry Date</label>
                                                <input type="date" {...register("studentDetails.currentSubscription.expiryDate")} className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Assigned Seat Code</label>
                                                <input {...register("studentDetails.assignedSeat.seatNumber")} placeholder="e.g. G-1" className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Image Avatar details */}
                                <div className="border-t border-white/5 pt-4">
                                    <ImageUpload onAvatarUpdate={handleAvatarUpdate} />
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                    <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                                        {isSubmitting ? "Saving changes..." : "Save Configuration"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Account Delete Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0F0F12] border border-white/10 rounded-2xl shadow-xl max-w-sm w-full p-6"
                        >
                            <h3 className="text-lg font-bold text-white mb-2">Evict Account?</h3>
                            <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete the account for <span className="text-white font-semibold">{userToDelete?.name}</span>? This action is irreversible.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Permanently Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ==========================================
// INDIVIDUAL DISPLAY COMPONENTS
// ==========================================

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap active:scale-95 ${
            active 
                ? "border-purple-500 text-purple-400 bg-white/[0.02]" 
                : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10"
        }`}
    >
        {icon}
        {label}
    </button>
);

const MetricCard = ({ icon, label, value }) => (
    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-xl flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
            {icon}
        </div>
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{value !== undefined ? value : '--'}</p>
        </div>
    </div>
);

const HealthStatRow = ({ label, value, status }) => (
    <div className="flex justify-between items-center p-3 bg-black/40 border border-white/5 rounded-xl text-xs">
        <div>
            <p className="font-semibold text-gray-200">{label}</p>
        </div>
        <div className="flex items-center gap-3">
            <span className="font-bold text-white font-mono">{value}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                status === "OK" ? "bg-emerald-500/10 text-emerald-400" :
                status === "WARNING" ? "bg-yellow-500/10 text-yellow-400" :
                status === "ACTIVE" ? "bg-purple-500/10 text-purple-400" : "bg-gray-500/10 text-gray-400"
            }`}>
                {status}
            </span>
        </div>
    </div>
);

export default AdminDashboard;
