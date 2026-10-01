import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users, CheckCircle, DollarSign, Activity, Clock, Calendar, Search,
  Filter, ChevronLeft, ChevronRight, X, Download, MoreVertical,
  ArrowUpRight, Plus, FileText, Gift, Edit2, Check,
  Armchair, CheckCircle2, AlertCircle, Phone, Mail, ArrowRight
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// --- UTILITIES ---
import {
  exportUsersToCSV,
  exportAnalyticsToPDF,
  formatCurrency,
  formatHours,
  getStatusColor,
  getSubscriptionInfo
} from '../api/libraryOwnerAnalytics';
import { createUser } from '../api/users';
import { jsPDF } from 'jspdf';

// Inject jsPDF into window if utility expects it there
window.jsPDF = jsPDF;

// ============================================
// DATE & ATTENDANCE HELPERS
// ============================================

const toDateKey = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayKey = () => toDateKey(new Date());

const buildAttendanceMap = (allAttendance = []) => {
  const map = new Map();

  allAttendance.forEach((record) => {
    const recordKey = toDateKey(record.date);

    const sessions = (record.sessions || []).map((s) => {
      let dur = s.durationMinutes;
      if (!dur && s.checkInTime) {
        if (s.checkOutTime) {
          dur = Math.max(0, Math.round((new Date(s.checkOutTime) - new Date(s.checkInTime)) / 60000));
        } else {
          dur = Math.max(0, Math.round((new Date() - new Date(s.checkInTime)) / 60000));
        }
      }
      return {
        ...s,
        durationMinutes: dur || 0,
        isOngoing: !s.checkOutTime
      };
    });

    if (sessions.length > 0) {
      sessions.forEach((session) => {
        const sessionKey = toDateKey(session.checkInTime) || recordKey;
        if (!sessionKey) return;

        if (!map.has(sessionKey)) {
          map.set(sessionKey, {
            dateKey: sessionKey,
            sessionCount: 0,
            totalDurationMinutes: 0,
            sessions: []
          });
        }
        const entry = map.get(sessionKey);
        const exists = entry.sessions.some(
          (es) => (es._id && session._id && es._id === session._id) || (es.checkInTime === session.checkInTime)
        );
        if (!exists) {
          entry.sessions.push(session);
          entry.sessionCount += 1;
          entry.totalDurationMinutes += session.durationMinutes || 0;
        }
      });
    } else if (recordKey) {
      if (!map.has(recordKey)) {
        map.set(recordKey, {
          dateKey: recordKey,
          sessionCount: record.sessionCount || 0,
          totalDurationMinutes: record.totalDurationMinutes || 0,
          sessions: []
        });
      }
    }
  });

  return map;
};

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
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Direct Student Creation State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '', phone: '' });
  const [addingStudent, setAddingStudent] = useState(false);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email || !newStudent.password) {
      toast.error("Name, email and password are required");
      return;
    }
    if (newStudent.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setAddingStudent(true);
    try {
      const res = await createUser({ ...newStudent, role: 'User' });
      toast.success(res.message || "Student created successfully!");
      setShowAddModal(false);
      setNewStudent({ name: '', email: '', password: '', phone: '' });
      fetchLibraryUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create student");
    } finally {
      setAddingStudent(false);
    }
  };

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
      // Silently fail if stats optional
    }
  };

  // 3. Fetch Single User Profile & Attendance
  const fetchUserAnalytics = async (userId) => {
    if (!libraryId) return;
    setAnalyticsLoading(true);
    try {
      const response = await axiosClient.get(`/library/${libraryId}/user/${userId}/analytics`);
      setUserAnalytics(response.data);
      setSelectedUser(userId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch member details');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (libraryId) {
      fetchLibraryUsers();
      fetchLibraryStatistics();
    }
  }, [libraryId, page, limit, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleExportCSV = () => {
    if (users.length > 0) {
      exportUsersToCSV(users, statistics?.library?.name || 'Library');
    } else {
      toast.info("No members available to export.");
    }
  };

  if (!libraryId) {
    return <div className="flex h-[50vh] items-center justify-center text-gray-500">No library selected.</div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white transition-colors duration-300 relative pb-20">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[380px] h-[380px] bg-purple-500/10 dark:bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[380px] h-[380px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* --- HEADER & ACTIONS --- */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/20 text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Members Console</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Manage member attendance, seat history, and subscriptions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#121215] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-sm font-semibold shadow-sm"
            >
              <Download className="w-4 h-4 text-gray-500" /> Export CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/25 transition-all text-sm font-semibold active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </motion.header>

        {/* --- STATISTICS ROW --- */}
        {statistics && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8"
          >
            <StatCard
              title="Total Members"
              value={summary?.totalUsers || statistics.subscriptionMetrics?.totalSubscriptions || 0}
              icon={<Users className="w-4 h-4 text-blue-500" />}
              bg="bg-blue-50 dark:bg-blue-500/10"
              border="border-blue-100 dark:border-blue-500/20"
            />
            <StatCard
              title="Active Plans"
              value={statistics.subscriptionMetrics?.activeSubscriptions || 0}
              icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
              bg="bg-emerald-50 dark:bg-emerald-500/10"
              border="border-emerald-100 dark:border-emerald-500/20"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(statistics.financialMetrics?.totalRevenue || 0)}
              icon={<DollarSign className="w-4 h-4 text-purple-500" />}
              bg="bg-purple-50 dark:bg-purple-500/10"
              border="border-purple-100 dark:border-purple-500/20"
            />
            <StatCard
              title="Today's Visitors"
              value={statistics.attendanceMetrics?.today?.visitors || 0}
              icon={<Activity className="w-4 h-4 text-amber-500" />}
              bg="bg-amber-50 dark:bg-amber-500/10"
              border="border-amber-100 dark:border-amber-500/20"
            />
            <StatCard
              title="30-Day Sessions"
              value={statistics.attendanceMetrics?.last30Days?.totalSessions || 0}
              icon={<Calendar className="w-4 h-4 text-pink-500" />}
              bg="bg-pink-50 dark:bg-pink-500/10"
              border="border-pink-100 dark:border-pink-500/20"
            />
          </motion.div>
        )}

        {/* --- FILTERS & SEARCH --- */}
        <div className="bg-white dark:bg-[#111114] p-3.5 rounded-2xl shadow-sm border border-gray-200/80 dark:border-white/10 mb-6 flex flex-col md:flex-row gap-3.5 justify-between sticky top-20 z-20 backdrop-blur-xl bg-opacity-90 dark:bg-opacity-90">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              placeholder="Search member name, email or phone..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm transition-all"
            />
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <div className="relative min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
              >
                <option value="all">All Plans</option>
                <option value="active">Active Only</option>
                <option value="expired">Expired Only</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative min-w-[160px]">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split('-');
                  setSortBy(f);
                  setSortOrder(o);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
              >
                <option value="createdAt-desc">Newest Joined</option>
                <option value="createdAt-asc">Oldest Joined</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="lastSeen-desc">Recently Active</option>
              </select>
              <ArrowUpRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* --- USERS GRID --- */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="min-h-[400px]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-52 bg-white dark:bg-[#111114] border border-gray-200/70 dark:border-white/5 rounded-2xl p-5 animate-pulse flex flex-col justify-between">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="h-3 w-40 bg-gray-100 dark:bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-xl" />
                  <div className="h-8 bg-gray-100 dark:bg-white/5 rounded-xl" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-[#111114] border border-gray-200/80 dark:border-white/10 rounded-3xl p-8">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-800 dark:text-gray-200 text-lg font-bold">No members found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <UserCard
                  key={user.userId}
                  user={user}
                  onClick={() => fetchUserAnalytics(user.userId)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* --- PAGINATION --- */}
        {users.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2.5 rounded-xl bg-white dark:bg-[#121215] border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-4 py-2.5 bg-white dark:bg-[#121215] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2.5 rounded-xl bg-white dark:bg-[#121215] border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* --- MEMBER PROFILE & ATTENDANCE WORKSPACE MODAL --- */}
      <AnimatePresence>
        {(userAnalytics || analyticsLoading) && (
          <MemberProfileModal
            isLoading={analyticsLoading}
            analytics={userAnalytics}
            libraryName={statistics?.library?.name || 'Library'}
            libraryId={libraryId}
            onUpdateUser={(updatedUser) => {
              setUserAnalytics((prev) => (prev ? { ...prev, user: { ...prev.user, ...updatedUser } } : null));
              setUsers((prev) =>
                prev.map((u) => (u.userId === updatedUser._id ? { ...u, phone: updatedUser.phone } : u))
              );
            }}
            onClose={() => {
              setUserAnalytics(null);
              setSelectedUser(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* --- ADD STUDENT DIRECT MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-6 text-gray-900 dark:text-white"
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-xl font-extrabold flex items-center gap-2">
                    <Plus className="text-purple-500 w-5 h-5" /> Add New Student
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Direct onboarding: Bypasses OTP and creates account immediately
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateStudent} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Password * (Min 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Create student password..."
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingStudent}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-purple-500/25"
                  >
                    {addingStudent ? 'Creating...' : 'Create Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPONENT: STAT CARD
// ============================================

const StatCard = ({ title, value, icon, bg, border }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="bg-white dark:bg-[#111114] p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden"
  >
    <div className="flex justify-between items-start">
      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</span>
      <div className={`p-2 rounded-xl border ${bg} ${border}`}>{icon}</div>
    </div>
    <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white mt-1">{value}</span>
  </motion.div>
);

// ============================================
// COMPONENT: MEMBER CARD (Console Primary Element)
// ============================================

const UserCard = ({ user, onClick }) => {
  const subscription = user.subscription;
  const isActive = subscription?.status === 'active' && new Date(subscription.expiryDate) > new Date();

  let isInGracePeriod = false;
  let isGracePeriodExpired = false;

  if (!isActive && subscription?.gracePeriodAllowed) {
    const graceStart = new Date(subscription?.graceStartDate || new Date());
    const graceEndDate = new Date(graceStart.getTime() + (subscription.graceDaysAllowed || 0) * 24 * 60 * 60 * 1000);
    if (new Date() <= graceEndDate) {
      isInGracePeriod = true;
    } else {
      isGracePeriodExpired = true;
    }
  }

  // Subscription label & style
  let subStatusLabel = subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : 'No Plan';
  let subStatusBadge = 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border-gray-200 dark:border-white/10';

  if (isActive) {
    subStatusLabel = 'Active';
    subStatusBadge = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/40';
  } else if (isInGracePeriod) {
    subStatusLabel = 'Grace Period';
    subStatusBadge = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/40';
  } else if (isGracePeriodExpired || subscription?.status === 'expired') {
    subStatusLabel = 'Expired';
    subStatusBadge = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/40';
  }

  const subInfo = subscription ? getSubscriptionInfo(subscription) : null;

  // Presence logic: strictly from attendance records, distinct from subscription
  const isPresent = Boolean(user.attendance?.isPresentToday);
  const hasEverVisited = Boolean(user.attendance?.lastVisit || (user.attendance?.totalSessions && user.attendance.totalSessions > 0));
  const presenceLabel = isPresent ? 'Present' : (hasEverVisited ? 'Absent' : 'No recent activity');

  return (
    <motion.div
      layout
      onClick={onClick}
      whileHover={{ y: -3 }}
      className="group relative bg-white dark:bg-[#111114] border border-gray-200/80 dark:border-white/10 rounded-2xl p-5 cursor-pointer hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all active:scale-[0.99] flex flex-col justify-between h-full"
    >
      <div>
        {/* Top Header: Avatar + Identity + Presence Indicator */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=random`}
                alt={user.userName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-white/10 shadow-sm"
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#111114] ${
                  isPresent ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'
                }`}
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {user.userName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {user.phone && user.phone !== 'N/A' ? user.phone : user.email}
              </p>
            </div>
          </div>

          {/* Simple presence indicator: ● Present / ● Absent / No recent activity */}
          <div className="shrink-0">
            {isPresent ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Present
              </span>
            ) : hasEverVisited ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Absent
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500">
                No activity
              </span>
            )}
          </div>
        </div>

        {/* Middle: Current Subscription Information */}
        <div className="bg-gray-50/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
              {subscription?.planName || 'No Active Plan'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${subStatusBadge}`}>
              {subStatusLabel}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
            <span>Paid: <strong className="text-gray-900 dark:text-white font-semibold">{formatCurrency(subscription?.pricePaid || 0)}</strong></span>
            {isActive && subInfo && (
              <span className={subInfo.isExpiringSoon ? 'text-rose-600 font-semibold' : 'text-purple-600 dark:text-purple-400 font-medium'}>
                {subInfo.daysRemaining} days left
              </span>
            )}
            {isInGracePeriod && (
              <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                <Gift size={11} /> {subscription.graceDaysAllowed} grace days
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Quick Attendance Summary */}
      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-purple-500" />
          {formatHours(user.attendance?.totalMinutesUsed || 0)}
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          {user.attendance?.totalSessions || 0} sessions
        </span>
      </div>
    </motion.div>
  );
};

// ============================================
// COMPONENT: MEMBER PROFILE WORKSPACE MODAL
// ============================================

const MemberProfileModal = ({
  isLoading,
  analytics,
  libraryName,
  libraryId,
  onUpdateUser,
  onClose
}) => {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getTodayKey());

  useEffect(() => {
    if (analytics?.user?.phone) {
      setEditPhoneValue(analytics.user.phone);
    }
  }, [analytics]);

  // Attendance Map: Indexed by YYYY-MM-DD
  const attendanceMap = useMemo(() => {
    if (!analytics?.allAttendance) return new Map();
    return buildAttendanceMap(analytics.allAttendance);
  }, [analytics]);

  // Default selected date: today or latest session date
  useEffect(() => {
    if (analytics) {
      const today = getTodayKey();
      if (attendanceMap.has(today)) {
        setSelectedDate(today);
      } else if (analytics.allAttendance && analytics.allAttendance.length > 0) {
        const latestKey = toDateKey(analytics.allAttendance[0].date);
        setSelectedDate(latestKey || today);
      }
    }
  }, [analytics, attendanceMap]);

  if (isLoading || !analytics) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div className="bg-white dark:bg-[#111114] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-gray-500">Loading member profile...</p>
        </div>
      </div>
    );
  }

  const { user, subscription, subscriptionHistory = [], analytics: stats } = analytics;

  // Subscription state
  const isSubActive = subscription?.status === 'active' && new Date(subscription.expiryDate) > new Date();
  let isInGracePeriod = false;
  let graceDaysRemaining = 0;

  if (!isSubActive && subscription?.gracePeriodAllowed && subscription.graceStartDate) {
    const graceStart = new Date(subscription.graceStartDate);
    const graceEndDate = new Date(graceStart.getTime() + (subscription.graceDaysAllowed || 0) * 24 * 60 * 60 * 1000);
    const now = new Date();
    if (now <= graceEndDate) {
      isInGracePeriod = true;
      graceDaysRemaining = Math.max(0, Math.ceil((graceEndDate - now) / (1000 * 60 * 60 * 24)));
    }
  }

  // Presence status
  const isPresentToday = Boolean(analytics.presence?.isPresentToday || stats.isPresentToday);
  const isCurrentlyInside = Boolean(analytics.presence?.isCurrentlyInside || stats.isCurrentlyInside);
  const hasHistory = stats.totalVisitDays > 0 || stats.totalSessions > 0;

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  // Month navigation boundary: do not navigate beyond current real-world month
  const realNow = new Date();
  const isCurrentMonthOrFuture =
    year > realNow.getFullYear() || (year === realNow.getFullYear() && month >= realNow.getMonth());

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    if (!isCurrentMonthOrFuture) {
      setCurrentMonth(new Date(year, month + 1, 1));
    }
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monthly summary stats for current visible month
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  let monthPresentDays = 0;
  let monthTotalMinutes = 0;

  attendanceMap.forEach((entry, key) => {
    if (key.startsWith(currentMonthPrefix) && (entry.totalDurationMinutes > 0 || entry.sessionCount > 0)) {
      monthPresentDays += 1;
      monthTotalMinutes += entry.totalDurationMinutes;
    }
  });

  // Selected Day Details
  const selectedDayRecord = attendanceMap.get(selectedDate);
  const isSelectedDayPresent = Boolean(
    selectedDayRecord && (selectedDayRecord.totalDurationMinutes > 0 || (selectedDayRecord.sessions && selectedDayRecord.sessions.length > 0))
  );

  // Group seat usage for selected day
  const seatUsageMap = new Map();
  if (selectedDayRecord?.sessions) {
    selectedDayRecord.sessions.forEach((s) => {
      const seat = s.seatNumber || 'Unassigned';
      seatUsageMap.set(seat, (seatUsageMap.get(seat) || 0) + (s.durationMinutes || 0));
    });
  }

  // Format selected date title
  let formattedSelectedDate = selectedDate;
  try {
    const [y, m, d] = selectedDate.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    formattedSelectedDate = dt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    // fallback
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0E0E11] w-full max-w-5xl max-h-[92vh] rounded-3xl overflow-hidden flex flex-col border border-gray-200 dark:border-white/10 shadow-2xl relative my-auto"
      >
        {/* Modal Top Actions */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => exportAnalyticsToPDF(analytics, libraryName)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/70 border border-gray-200 dark:border-white/10 rounded-xl backdrop-blur-md transition-all text-xs font-bold text-purple-600 dark:text-purple-400 shadow-sm"
          >
            <FileText size={14} /> PDF
          </button>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/70 border border-gray-200 dark:border-white/10 rounded-full backdrop-blur-md transition-all text-gray-500 hover:text-gray-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-7">

          {/* 1. MEMBER IDENTITY HEADER */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2 pb-2 border-b border-gray-100 dark:border-white/5">
            <div className="relative shrink-0">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 dark:border-white/10 shadow-lg"
              />
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0E0E11] ${
                  isPresentToday ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">{user.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {/* Attendance Presence Badge */}
                  {isCurrentlyInside ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Inside Now
                    </span>
                  ) : isPresentToday ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present Today
                    </span>
                  ) : hasHistory ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                      <span className="w-2 h-2 rounded-full bg-gray-400" /> Absent Today
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500">
                      No Activity
                    </span>
                  )}

                  {/* Subscription Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      isSubActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/40'
                        : isInGracePeriod
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/40'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/40'
                    }`}
                  >
                    {isSubActive ? 'Active Plan' : isInGracePeriod ? 'Grace Period' : 'Expired Plan'}
                  </span>
                </div>
              </div>

              {/* Contact Information & Inline Phone Edit */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" /> {user.email}
                </span>

                {isEditingPhone ? (
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-lg border border-gray-200 dark:border-white/10">
                    <input
                      autoFocus
                      type="text"
                      value={editPhoneValue}
                      onChange={(e) => setEditPhoneValue(e.target.value)}
                      placeholder="Phone number"
                      className="px-2 py-1 text-xs bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-md focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        setIsUpdatingPhone(true);
                        try {
                          const res = await axiosClient.put(`/library/${libraryId}/user/${user._id}/contact`, {
                            phone: editPhoneValue
                          });
                          toast.success('Contact updated');
                          onUpdateUser({ _id: user._id, phone: res.data.phone });
                          setIsEditingPhone(false);
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Failed to update phone');
                        } finally {
                          setIsUpdatingPhone(false);
                        }
                      }}
                      disabled={isUpdatingPhone}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-bold"
                    >
                      {isUpdatingPhone ? '...' : <Check size={12} />}
                    </button>
                    <button
                      onClick={() => setIsEditingPhone(false)}
                      className="px-2 py-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-md text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 group">
                    <Phone size={13} className="text-gray-400" />
                    <span>{user.phone && user.phone !== 'N/A' ? user.phone : 'No phone'}</span>
                    <button
                      onClick={() => setIsEditingPhone(true)}
                      className="text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 ml-1"
                      title="Edit phone number"
                    >
                      <Edit2 size={11} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. ATTENDANCE METRICS SUMMARY */}
          <div className="grid grid-cols-3 gap-3.5">
            <div className="p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-2xl text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Total Sessions
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {stats.totalSessions || 0}
              </span>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-2xl text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Study Hours
              </span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {stats.totalHoursUsed || 0}h
              </span>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-2xl text-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Avg Session
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {formatHours(stats.averageSessionDuration || 0)}
              </span>
            </div>
          </div>

          {/* 3. MAIN WORKSPACE: ATTENDANCE CALENDAR + SELECTED DAY SESSIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT (7 cols): Attendance Calendar */}
            <div className="lg:col-span-7 bg-white dark:bg-[#121216] border border-gray-200/90 dark:border-white/10 rounded-3xl p-5 shadow-xs">
              {/* Calendar Navigation & Month Title */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{monthName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {monthPresentDays} Days Present · {formatHours(monthTotalMinutes)} Studied
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    disabled={isCurrentMonthOrFuture}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayStr) => (
                  <span key={dayStr} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider py-1">
                    {dayStr}
                  </span>
                ))}
              </div>

              {/* Calendar Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty prefix slots */}
                {[...Array(firstDayOfWeek)].map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 sm:h-11 rounded-xl bg-transparent" />
                ))}

                {/* Actual day cells */}
                {[...Array(daysInMonth)].map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayEntry = attendanceMap.get(dateStr);
                  const isPresent = Boolean(
                    dayEntry && (dayEntry.totalDurationMinutes > 0 || (dayEntry.sessions && dayEntry.sessions.length > 0))
                  );
                  const isToday = dateStr === getTodayKey();
                  const isSelected = dateStr === selectedDate;

                  return (
                    <motion.button
                      key={dateStr}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`h-10 sm:h-11 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-bold border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/30 z-10'
                          : isPresent
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300/80 dark:border-emerald-800/40 hover:border-emerald-400'
                          : 'bg-gray-50/60 dark:bg-white/[0.02] text-gray-400 dark:text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
                      } ${isToday && !isSelected ? 'ring-2 ring-purple-500/60' : ''}`}
                    >
                      <span>{dayNum}</span>
                      {isPresent && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-5 pt-3 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" /> Absent
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Click any date to inspect</span>
              </div>
            </div>

            {/* RIGHT (5 cols): Selected Day Attendance & Seats Used */}
            <div className="lg:col-span-5 bg-white dark:bg-[#121216] border border-gray-200/90 dark:border-white/10 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-100 dark:border-white/5">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {formattedSelectedDate}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">Selected Date Activity</p>
                </div>
                <div>
                  {isSelectedDayPresent ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
                      <CheckCircle2 size={13} /> Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                      Absent
                    </span>
                  )}
                </div>
              </div>

              {isSelectedDayPresent ? (
                <div className="space-y-4">
                  {/* Selected Day Stats Row */}
                  <div className="grid grid-cols-2 gap-2.5 bg-gray-50 dark:bg-white/[0.03] p-3 rounded-2xl border border-gray-100 dark:border-white/5 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Study Time</span>
                      <span className="text-base font-black text-purple-600 dark:text-purple-400">
                        {formatHours(selectedDayRecord.totalDurationMinutes || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sessions</span>
                      <span className="text-base font-black text-gray-900 dark:text-white">
                        {selectedDayRecord.sessions?.length || selectedDayRecord.sessionCount || 1}
                      </span>
                    </div>
                  </div>

                  {/* Seats Used Section */}
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Armchair size={13} className="text-purple-500" /> Seats Used
                    </h5>
                    {seatUsageMap.size > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from(seatUsageMap.entries()).map(([seatNum, dur]) => (
                          <div
                            key={seatNum}
                            className="p-3 bg-gradient-to-br from-purple-500/[0.04] to-indigo-500/[0.04] border border-purple-500/20 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Seat</span>
                              <span className="text-base font-black text-gray-900 dark:text-white">#{seatNum}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                              {formatHours(dur)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Seat details not recorded for this session.</p>
                    )}
                  </div>

                  {/* Chronological Session Timeline */}
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock size={13} className="text-blue-500" /> Session Timeline
                    </h5>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                      {selectedDayRecord.sessions && selectedDayRecord.sessions.length > 0 ? (
                        selectedDayRecord.sessions.map((session, idx) => {
                          const checkInStr = session.checkInTime
                            ? new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Start';
                          const checkOutStr = session.checkOutTime
                            ? new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Active Now';

                          return (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300">
                                  #{session.seatNumber || '-'}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                                    {checkInStr} — {checkOutStr}
                                  </span>
                                  {session.isOngoing && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Currently Inside
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-gray-600 dark:text-gray-400 bg-white dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200/50 dark:border-white/5">
                                {formatHours(session.durationMinutes || 0)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400">
                          {selectedDayRecord.sessionCount || 1} session ({formatHours(selectedDayRecord.totalDurationMinutes || 0)})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 px-4 text-center bg-gray-50/50 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                  <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">Absent</h5>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                    No attendance records or study sessions were recorded for this date.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4. SUBSCRIPTIONS & TIMELINE (Separate & Prominent) */}
          <div className="bg-white dark:bg-[#121216] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Subscriptions & Timeline
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Current plan details and historical subscription records
                </p>
              </div>
            </div>

            {/* Current Active Plan Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/[0.04] to-indigo-500/[0.04] border border-purple-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-0.5">
                    Current Plan
                  </span>
                  <h4 className="text-xl font-black text-gray-900 dark:text-white">
                    {subscription?.planName || 'No Plan'}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      isSubActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300'
                        : isInGracePeriod
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300'
                    }`}
                  >
                    {isSubActive ? 'Active' : isInGracePeriod ? 'Grace Period' : 'Expired'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-purple-500/10">
                <div>
                  <span className="text-gray-400 block">Duration</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'} →{' '}
                    {subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Amount Paid</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(subscription?.pricePaid || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Time Remaining</span>
                  {isSubActive ? (
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {subscription?.daysRemaining || 0} days left
                    </span>
                  ) : isInGracePeriod ? (
                    <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Gift size={12} /> {graceDaysRemaining} grace days left
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-600">Expired</span>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription History Timeline */}
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Subscription History
              </h5>
              {subscriptionHistory.length > 0 ? (
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-white/10">
                  {subscriptionHistory.map((sub, idx) => {
                    const isSubEntryActive = sub.status === 'active';
                    return (
                      <div key={idx} className="relative group">
                        <span
                          className={`absolute -left-[23px] top-3.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#121216] ${
                            isSubEntryActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                        <div className="p-3.5 bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">{sub.planName}</span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                  isSubEntryActive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 mt-0.5 block">
                              {new Date(sub.startDate).toLocaleDateString()} — {new Date(sub.expiryDate).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(sub.pricePaid || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No prior subscription history recorded.</p>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

export default LibraryUsersManagement;