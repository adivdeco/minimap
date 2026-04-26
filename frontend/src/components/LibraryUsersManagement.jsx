import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users, CheckCircle, DollarSign, Activity, Clock, Calendar, Search,
  Filter, ChevronLeft, ChevronRight, X, Download, MoreVertical,
  ArrowUpRight, MapPin, Plus, TrendingUp, AlertTriangle, FileText, Gift, Edit2, Check
} from 'lucide-react';
import axiosClient from '../api/axiosClient'; // Assuming you use this for auth interceptors
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// --- IMPORT YOUR UTILITIES HERE ---
import {
  exportUsersToCSV,
  exportAnalyticsToPDF,
  formatCurrency,
  formatHours,
  getStatusColor,
  getSubscriptionInfo,
  calculateEngagementScore,
  getEngagementLevel,
  generateUserInsights
} from '../api/libraryOwnerAnalytics';
import { jsPDF } from 'jspdf'; // Ensure jsPDF is imported for the utility

// Inject jsPDF into window if your utility expects it there
window.jsPDF = jsPDF;

// ============================================
// LIBRARY OWNER DASHBOARD - USERS MANAGEMENT
// ============================================

const LibraryUsersManagement = ({ libraryId: propLibraryId }) => {
  const { id } = useParams();
  const libraryId = propLibraryId || id;

  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // 1. Fetch Users List
  const fetchLibraryUsers = async () => {
    if (!libraryId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axiosClient.get(`/library/${libraryId}/users`, {
        params: { page, limit, search: searchQuery, status: statusFilter, sortBy, sortOrder }
      });
      setUsers(response.data.users || []);
      setSummary(response.data.summary);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Dashboard Statistics
  const fetchLibraryStatistics = async () => {
    if (!libraryId) return;
    try {
      const response = await axiosClient.get(`/library/${libraryId}/statistics`);
      setStatistics(response.data);
    } catch (err) {

    }
  };

  // 3. Fetch Single User Analytics
  const fetchUserAnalytics = async (userId) => {
    if (!libraryId) return;
    setLoading(true);
    try {
      const response = await axiosClient.get(`/library/${libraryId}/user/${userId}/analytics`);
      setUserAnalytics(response.data);
      setSelectedUser(userId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user analytics');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetches on dependency change
  useEffect(() => {
    if (libraryId) {
      fetchLibraryUsers();
      fetchLibraryStatistics();
    }
  }, [libraryId, page, limit, searchQuery, statusFilter, sortBy, sortOrder]);

  // Handlers
  const handleExportCSV = () => {
    if (users.length > 0) {
      exportUsersToCSV(users, statistics?.library?.name || 'Library');
    }
  };

  if (!libraryId) {
    return <div className="flex h-[50vh] items-center justify-center text-gray-500">No library selected.</div>;
  }

  // Animation Variants
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-300 overflow-hidden relative pb-20">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-purple-500/10 dark:bg-purple-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* --- HEADER & ACTIONS --- */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl shadow-lg shadow-purple-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              Members & Analytics
            </h1>
            {/* <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Manage library subscriptions, track attendance, and analyze engagement.</p> */}
          </div>

          {/* <div className="flex items-center gap-3">
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all text-sm font-medium active:scale-95">
              <Plus className="w-4 h-4" /> Add Member
            </button>
          </div> */}
        </motion.header>

        {/* --- STATISTICS ROW --- */}
        {statistics && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <StatCard title="Total Members" value={summary?.totalUsers || statistics.subscriptionMetrics?.totalSubscriptions || 0} icon={<Users className="w-5 h-5 text-blue-500" />} bg="bg-blue-50 dark:bg-blue-500/10" border="border-blue-100 dark:border-blue-500/20" />
            <StatCard title="Active Plans" value={statistics.subscriptionMetrics?.activeSubscriptions || 0} icon={<CheckCircle className="w-5 h-5 text-green-500" />} bg="bg-green-50 dark:bg-green-500/10" border="border-green-100 dark:border-green-500/20" />
            <StatCard title="Total Revenue" value={formatCurrency(statistics.financialMetrics?.totalRevenue || 0)} icon={<DollarSign className="w-5 h-5 text-purple-500" />} bg="bg-purple-50 dark:bg-purple-500/10" border="border-purple-100 dark:border-purple-500/20" />
            <StatCard title="Today's Visitors" value={statistics.attendanceMetrics?.today?.visitors || 0} icon={<Activity className="w-5 h-5 text-orange-500" />} bg="bg-orange-50 dark:bg-orange-500/10" border="border-orange-100 dark:border-orange-500/20" />
            <StatCard title="30-Day Sessions" value={statistics.attendanceMetrics?.last30Days?.totalSessions || 0} icon={<Calendar className="w-5 h-5 text-pink-500" />} bg="bg-pink-50 dark:bg-pink-500/10" border="border-pink-100 dark:border-pink-500/20" />
          </motion.div>
        )}

        {/* --- FILTERS & SEARCH --- */}
        <div className="bg-white dark:bg-[#0F0F12] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-6 flex flex-col md:flex-row gap-4 justify-between sticky top-24 z-20 backdrop-blur-xl bg-opacity-80 dark:bg-opacity-80">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <div className="relative min-w-[130px]">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="expired">Expired Only</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>

            <div className="relative min-w-[150px]">
              <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); }} className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
                <option value="createdAt-desc">Newest Joined</option>
                <option value="createdAt-asc">Oldest Joined</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="lastSeen-desc">Recently Active</option>
              </select>
              <ArrowUpRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm text-center">{error}</div>}

        {/* --- USERS GRID --- */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Loading members data...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No members found.</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <UserCard key={user.userId} user={user} onClick={() => fetchUserAnalytics(user.userId)} />
              ))}
            </div>
          )}
        </motion.div>

        {/* --- PAGINATION --- */}
        {users.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
              Page {page} of {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* --- USER ANALYTICS MODAL --- */}
      <AnimatePresence>
        {userAnalytics && (
          <UserAnalyticsModal
            analytics={userAnalytics}
            libraryName={statistics?.library?.name || "Library"}
            libraryId={libraryId}
            onUpdateUser={(updatedUser) => {
              setUserAnalytics(prev => ({ ...prev, user: { ...prev.user, ...updatedUser } }));
              // Update user object in the list
              setUsers(prev => prev.map(u => u.userId === updatedUser._id ? { ...u, phone: updatedUser.phone } : u));
            }}
            onClose={() => { setUserAnalytics(null); setSelectedUser(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

const StatCard = ({ title, value, icon, bg, border }) => (
  <motion.div whileHover={{ y: -3 }} className={`bg-white dark:bg-[#0F0F12] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group`}>
    <div className="flex justify-between items-start">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
      <div className={`p-2 rounded-xl border ${bg} ${border}`}>{icon}</div>
    </div>
    <span className="text-lg font-black text-gray-900 dark:text-white mt-1">{value}</span>
  </motion.div>
);

const UserCard = ({ user, onClick }) => {
  // Use utility for engagement
  const engagementScore = calculateEngagementScore(user);
  const engagementLevel = getEngagementLevel(engagementScore);

  const subscription = user.subscription;
  const isActive = subscription?.status === 'active' && new Date(subscription.expiryDate) > new Date();

  let isInGracePeriod = false;
  let graceEndDate = null;
  let isGracePeriodExpired = false;

  if (!isActive && subscription?.gracePeriodAllowed) {
    const graceStart = new Date(subscription?.graceStartDate || new Date());
    graceEndDate = new Date(graceStart.getTime() + (subscription.graceDaysAllowed || 0) * 24 * 60 * 60 * 1000);
    if (new Date() <= graceEndDate) {
      isInGracePeriod = true;
    } else {
      isGracePeriodExpired = true;
    }
  }

  // Use utility for color
  const statusColor = isInGracePeriod ? '#9333ea' : isGracePeriodExpired ? '#dc2626' : getStatusColor(subscription?.status);

  // Update status label dynamically based on grace
  let displayStatus = subscription?.status || 'Unknown';
  if (isInGracePeriod) displayStatus = 'Grace Period';
  else if (isGracePeriodExpired) displayStatus = 'Grace Expired';

  // Compute subscription timeline
  const subInfo = subscription ? getSubscriptionInfo(subscription) : null;

  return (
    <motion.div layout onClick={onClick} className="group relative bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl p-5 cursor-pointer hover:border-purple-500/50 hover:shadow-lg transition-all active:scale-[0.98] flex flex-col justify-between h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=random`} alt="avatar" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 dark:border-white/5" />
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0F0F12]" style={{ backgroundColor: statusColor }}></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="pr-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{user.userName}</h3>
              <p className="text-xs text-gray-500 truncate mt-0.5">{user.phone || user.email}</p>
            </div>
            <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
          <div className="flex justify-between items-center text-xs border-t border-purple-500/10 pt-3 mt-3">
            <span className="text-gray-500">Paid: <strong className="text-gray-900 dark:text-white">{formatCurrency(user.subscription?.pricePaid || 0)}</strong></span>
            {user.subscription?.status === 'active' && subInfo && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${subInfo.isExpiringSoon ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                {subInfo.daysRemaining} days left
              </span>
            )}
            {isInGracePeriod && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                <Gift size={10} /> {subscription.graceDaysAllowed} Grace Days
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto border-t border-gray-100 dark:border-white/5 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Clock size={12} /> {formatHours(user.attendance?.totalMinutesUsed || 0)} used</span>
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Activity size={12} /> {user.attendance?.totalSessions || 0} sessions</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase" style={{ backgroundColor: `${engagementLevel.color}15`, color: engagementLevel.color, borderColor: `${engagementLevel.color}30` }}>
            <TrendingUp size={12} /> {engagementLevel.label} User
          </span>
          <span className="px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider" style={{ color: statusColor, borderColor: `${statusColor}40`, backgroundColor: `${statusColor}10` }}>
            {displayStatus}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const UserAnalyticsModal = ({ analytics, libraryName, libraryId, onUpdateUser, onClose }) => {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState(analytics.user.phone || '');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // Utilize helper functions
  const insights = generateUserInsights(analytics);
  const subInfo = getSubscriptionInfo(analytics.subscription);

  const subscription = analytics.subscription;
  const isActive = subscription?.status === 'active' && new Date(subscription.expiryDate) > new Date();

  let isInGracePeriod = false;
  let graceEndDate = null;
  let isGracePeriodExpired = false;

  if (!isActive && subscription?.gracePeriodAllowed) {
    const graceStart = new Date(subscription.graceStartDate || new Date());
    graceEndDate = new Date(graceStart.getTime() + (subscription.graceDaysAllowed || 0) * 24 * 60 * 60 * 1000);
    if (new Date() <= graceEndDate) {
      isInGracePeriod = true;
    } else {
      isGracePeriodExpired = true;
    }
  }

  let displayStatusModal = subscription?.status || 'Unknown';
  if (isInGracePeriod) displayStatusModal = 'Grace Period';
  else if (isGracePeriodExpired) displayStatusModal = 'Grace Expired';

  let statusBgClass = subscription?.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
  if (isInGracePeriod) statusBgClass = 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400';
  else if (isGracePeriodExpired) statusBgClass = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';

  // Group Sessions by Date for UI list
  const groupedSessions = (analytics.recentSessions || []).reduce((groups, session) => {
    const dateStr = new Date(session.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(session);
    return groups;
  }, {});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#121214] w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-3xl overflow-hidden flex flex-col border border-gray-200 dark:border-white/10 shadow-2xl relative">

        {/* Decorative Header BG */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 z-0"></div>

        {/* PDF Download Button */}
        <div className="absolute top-4 left-4 z-20">
          <button onClick={() => exportAnalyticsToPDF(analytics, libraryName)} className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-gray-200 dark:border-white/10 rounded-lg backdrop-blur-md transition-all text-xs font-bold shadow-sm">
            <FileText size={14} className="text-purple-600 dark:text-purple-400" /> Export PDF
          </button>
        </div>

        {/* User Profile Info */}
        <div className="relative z-10 p-6 flex flex-col items-center pt-8">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/60 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 rounded-full backdrop-blur-md transition-colors text-gray-500">
            <X size={18} />
          </button>

          <img src={analytics.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(analytics.user.name)}&background=random`} alt="user" referrerPolicy="no-referrer" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-[#121214] shadow-xl mb-3" />
          <h2 className="text-xl font-bold">{analytics.user.name}</h2>

          <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-xs">
            {isEditingPhone ? (
              <div className="flex flex-col w-full gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in duration-200">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Update Phone Number</label>
                <input
                  autoFocus
                  type="text"
                  value={editPhoneValue}
                  onChange={(e) => setEditPhoneValue(e.target.value)}
                  className="w-full text-sm text-center bg-white dark:bg-[#1A1A1C] border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none placeholder-gray-400"
                  placeholder="Enter new phone number"
                  disabled={isUpdatingPhone}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      setIsUpdatingPhone(true);
                      try {
                        const res = await axiosClient.put(`/library/${libraryId}/user/${analytics.user._id}/contact`, { phone: editPhoneValue });
                        toast.success('Contact updated successfully');
                        onUpdateUser({ _id: analytics.user._id, phone: res.data.phone });
                        setIsEditingPhone(false);
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Failed to update contact');
                      } finally {
                        setIsUpdatingPhone(false);
                      }
                    } else if (e.key === 'Escape') {
                      setEditPhoneValue(analytics.user.phone || '');
                      setIsEditingPhone(false);
                    }
                  }}
                />
                <div className="flex gap-2.5 mt-1 relative z-10 w-full justify-between items-center text-sm font-medium">
                  <button
                    onClick={() => { setEditPhoneValue(analytics.user.phone || ''); setIsEditingPhone(false); }}
                    disabled={isUpdatingPhone}
                    className="flex-1 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsUpdatingPhone(true);
                      try {
                        const res = await axiosClient.put(`/library/${libraryId}/user/${analytics.user._id}/contact`, { phone: editPhoneValue });
                        toast.success('Contact updated successfully');
                        onUpdateUser({ _id: analytics.user._id, phone: res.data.phone });
                        setIsEditingPhone(false);
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Failed to update contact');
                      } finally {
                        setIsUpdatingPhone(false);
                      }
                    }}
                    disabled={isUpdatingPhone || !editPhoneValue.trim()}
                    className="flex-1 flex justify-center items-center py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors shadow-sm"
                  >
                    {isUpdatingPhone ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                      <span className="flex items-center gap-1"><Check size={14} /> Save</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 py-1.5 px-3 rounded-full border border-gray-100 dark:border-white/5 group transition-colors hover:border-purple-200 dark:hover:border-purple-500/30">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {analytics.user.phone ? analytics.user.phone : <span className="text-gray-400 italic">No Phone Added</span>}
                  </p>
                  <button
                    onClick={() => setIsEditingPhone(true)}
                    className="flex justify-center items-center w-6 h-6 bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 text-purple-600 dark:text-purple-400 rounded-full shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-200 transition-all focus:outline-none"
                    title="Edit phone number"
                  >
                    <Edit2 size={10} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{analytics.user.email}</p>
              </div>
            )}
            {!isEditingPhone && editPhoneValue !== analytics.user.phone && <span className="hidden"></span> /* Spacer */}
          </div>

          <div className="flex flex-wrap gap-3 w-full justify-center mt-6">
            <div className="flex-1 min-w-[100px] text-center px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Sessions</p>
              <p className="text-xl font-black">{analytics.analytics.totalSessions}</p>
            </div>
            <div className="flex-1 min-w-[100px] text-center px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hours</p>
              <p className="text-xl font-black">{analytics.analytics.totalHoursUsed}h</p>
            </div>
            <div className="flex-1 min-w-[100px] text-center px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Avg Time</p>
              <p className="text-xl font-black">{analytics.analytics.averageSessionDuration}m</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content (Insights, Subs, History) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-6">

          {/* AI Insights Engine Output */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Behavior Insights</h3>
              {insights.map((insight, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm font-medium
                      ${insight.type === 'positive' ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400' :
                    insight.type === 'warning' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400' :
                      'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'}`}
                >
                  {insight.type === 'warning' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <Activity size={18} className="mt-0.5 shrink-0" />}
                  <p>{insight.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Current Subscription Block */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/[0.03] to-indigo-500/[0.03] border border-purple-500/20">
            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4">Current Plan Overview</h3>
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-lg">{analytics.subscription.planName}</span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                  ${statusBgClass}`}>
                {displayStatusModal}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-t border-purple-500/10 pt-3 mt-1">
              <span className="text-gray-500">Paid: <strong className="text-gray-900 dark:text-white">{formatCurrency(analytics.subscription.pricePaid)}</strong></span>
              {subInfo.isActive && (
                <span className={`font-medium px-2 py-0.5 rounded-md ${subInfo.isExpiringSoon ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                  {subInfo.daysRemaining} days left
                </span>
              )}
              {isInGracePeriod && (
                <span className="font-medium px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                  <Gift size={14} /> {subscription.graceDaysAllowed} Grace Days
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition-all active:scale-95">
                Renew Plan
              </button>
              <button className="flex-1 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-sm font-bold transition-all active:scale-95">
                Manage Details
              </button>
            </div>
          </div>

          {/* Recent Attendance Log */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Latest Attendance</h3>
            <div className="space-y-3">
              {Object.keys(groupedSessions).length > 0 ? (
                Object.entries(groupedSessions).map(([date, sessions], idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3.5 border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={14} className="text-purple-500" />
                      <span className="text-xs font-bold uppercase tracking-wide">{date}</span>
                    </div>
                    <div className="space-y-2">
                      {sessions.map((session, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white dark:bg-black/20 shadow-sm border border-gray-100 dark:border-white/5 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">#{session.seatNumber}</span>
                            </div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              {new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                              {new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">{session.durationMinutes}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <p className="text-sm text-gray-500 font-medium">No recent sessions found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Complete Subscription History */}
          {analytics.subscriptionHistory?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Subscription History</h3>
              <div className="space-y-2">
                {analytics.subscriptionHistory.map((sub, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-4 bg-white dark:bg-[#1A1A1C] rounded-2xl border border-gray-200 dark:border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">{sub.planName}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                        ${sub.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          sub.status === 'expired' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>{new Date(sub.startDate).toLocaleDateString()} — {new Date(sub.expiryDate).toLocaleDateString()}</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(sub.pricePaid || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
};

export default LibraryUsersManagement;