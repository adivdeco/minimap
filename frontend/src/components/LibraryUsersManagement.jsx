// import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import {
//   Users,
//   CheckCircle,
//   DollarSign,
//   Activity,
//   Clock,
//   Calendar,
//   Search,
//   Filter,
//   ChevronLeft,
//   ChevronRight,
//   X,
//   Eye,
//   ArrowUpDown,
//   Phone,
//   Mail,
//   MapPin
// } from 'lucide-react';
// import axiosClient from '../api/axiosClient';

// // ============================================
// // LIBRARY OWNER DASHBOARD - USERS MANAGEMENT
// // ============================================

// const LibraryUsersManagement = ({ libraryId: propLibraryId }) => {
//   const { id } = useParams();
//   const libraryId = propLibraryId || id;

//   const [users, setUsers] = useState([]);
//   const [statistics, setStatistics] = useState(null);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [userAnalytics, setUserAnalytics] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // Filters and Pagination
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(10);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState('all');
//   const [sortBy, setSortBy] = useState('createdAt');
//   const [sortOrder, setSortOrder] = useState('desc');

//   // Fetch all users in library
//   const fetchLibraryUsers = async () => {
//     if (!libraryId) return;

//     setLoading(true);
//     setError(null);
//     try {
//       const response = await axiosClient.get(`/library/${libraryId}/users`, {
//         params: {
//           page,
//           limit,
//           search: searchQuery,
//           status: statusFilter,
//           sortBy,
//           sortOrder
//         }
//       });
//       setUsers(response.data.users || []);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to fetch users');
//       console.error('Error fetching users:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch library statistics
//   const fetchLibraryStatistics = async () => {
//     if (!libraryId) return;
//     try {
//       const response = await axiosClient.get(`/library/${libraryId}/statistics`);
//       setStatistics(response.data);
//     } catch (err) {
//       console.error('Error fetching statistics:', err);
//     }
//   };

//   // Fetch individual user analytics
//   const fetchUserAnalytics = async (userId) => {
//     if (!libraryId) return;
//     setLoading(true);
//     try {
//       const response = await axiosClient.get(
//         `/library/${libraryId}/user/${userId}/analytics`
//       );
//       setUserAnalytics(response.data);
//       setSelectedUser(userId);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to fetch user analytics');
//       console.error('Error fetching user analytics:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Initial load
//   useEffect(() => {
//     if (libraryId) {
//       fetchLibraryUsers();
//       fetchLibraryStatistics();
//     }
//   }, [libraryId, page, limit, searchQuery, statusFilter, sortBy, sortOrder]);

//   if (!libraryId) {
//     return (
//       <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">
//         <p>No library selected.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-gray-100 font-sans pb-20 transition-colors duration-300">
      
//       {/* Background Decor */}
//       <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
//         <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
//         <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
//       </div>

//       <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

//         {/* Header */}
//         <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
//           <div>
//             <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
//               <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
//                 <Users className="w-5 h-5" />
//               </div>
//               <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
//                 User Management
//               </span>
//             </h1>
//             <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-2 ml-1">
//               Manage subscriptions, attendance & insights
//             </p>
//           </div>
//         </header>

//         {/* Statistics Grid - Scrollable on mobile */}
//         {statistics && (
//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
//             <StatCard
//               title="Total Users"
//               value={statistics.subscriptionMetrics?.totalSubscriptions || 0}
//               icon={<Users className="w-4 h-4 text-blue-500" />}
//               bg="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
//             />
//             <StatCard
//               title="Active Subs"
//               value={statistics.subscriptionMetrics?.activeSubscriptions || 0}
//               icon={<CheckCircle className="w-4 h-4 text-green-500" />}
//               bg="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"
//             />
//             <StatCard
//               title="Revenue"
//               value={`₹${statistics.financialMetrics?.totalRevenue || 0}`}
//               icon={<DollarSign className="w-4 h-4 text-purple-500" />}
//               bg="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30"
//             />
//             <StatCard
//               title="Avg Session"
//               value={`${statistics.attendanceMetrics?.last30Days?.averageSessionDuration || 0}m`}
//               icon={<Clock className="w-4 h-4 text-teal-500" />}
//               bg="bg-teal-50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/30"
//             />
//             <StatCard
//               title="Visitors Today"
//               value={statistics.attendanceMetrics?.today?.visitors || 0}
//               icon={<Activity className="w-4 h-4 text-orange-500" />}
//               bg="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30"
//             />
//             <StatCard
//               title="30-Day Active"
//               value={statistics.attendanceMetrics?.last30Days?.uniqueUsers || 0}
//               icon={<Calendar className="w-4 h-4 text-pink-500" />}
//               bg="bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/30"
//             />
//           </div>
//         )}

//         {/* Filters Bar - Sticky */}
//         <div className="sticky top-2 z-30 mb-6 p-3 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 justify-between">
//           <div className="relative w-full md:w-96 group">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
//             <input
//               type="text"
//               placeholder="Search by name or email..."
//               value={searchQuery}
//               onChange={(e) => {
//                 setSearchQuery(e.target.value);
//                 setPage(1);
//               }}
//               className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-gray-100 transition-all"
//             />
//           </div>

//           <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
//             <div className="relative min-w-[130px]">
//               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
//               <select
//                 value={statusFilter}
//                 onChange={(e) => {
//                   setStatusFilter(e.target.value);
//                   setPage(1);
//                 }}
//                 className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
//               >
//                 <option value="all">All Status</option>
//                 <option value="active">Active</option>
//                 <option value="expired">Expired</option>
//                 <option value="cancelled">Cancelled</option>
//               </select>
//             </div>

//             <div className="relative min-w-[150px]">
//               <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
//               <select
//                 value={`${sortBy}-${sortOrder}`}
//                 onChange={(e) => {
//                   const [field, order] = e.target.value.split('-');
//                   setSortBy(field);
//                   setSortOrder(order);
//                 }}
//                 className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
//               >
//                 <option value="createdAt-desc">Newest First</option>
//                 <option value="createdAt-asc">Oldest First</option>
//                 <option value="name-asc">Name (A-Z)</option>
//                 <option value="name-desc">Name (Z-A)</option>
//                 <option value="lastSeen-desc">Recently Active</option>
//                 <option value="sessionsCount-desc">Most Sessions</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         {error && (
//           <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
//             <CheckCircle className="w-4 h-4" /> {error}
//           </div>
//         )}

//         {/* Content Area */}
//         <div className="space-y-4">
//           {loading ? (
//             <div className="flex flex-col items-center justify-center py-20">
//               <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
//               <p className="text-gray-500 text-xs">Syncing users...</p>
//             </div>
//           ) : users.length === 0 ? (
//             <div className="text-center py-20 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/5 rounded-2xl">
//               <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
//               <p className="text-gray-500 dark:text-gray-400 text-sm">No users found.</p>
//             </div>
//           ) : (
//             <>
//               {/* Desktop Table View (Hidden on Mobile) */}
//               <div className="hidden md:block bg-white dark:bg-[#18181b] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden">
//                 <table className="w-full text-left border-collapse">
//                   <thead>
//                     <tr className="bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
//                       <th className="p-4 font-semibold">User</th>
//                       <th className="p-4 font-semibold">Plan</th>
//                       <th className="p-4 font-semibold">Status</th>
//                       <th className="p-4 font-semibold text-center">Sessions</th>
//                       <th className="p-4 font-semibold text-center">Hours</th>
//                       <th className="p-4 font-semibold">Joined</th>
//                       <th className="p-4 font-semibold">Last Visit</th>
//                       <th className="p-4 font-semibold text-center">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
//                     {users.map(user => (
//                       <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
//                         <td className="p-4">
//                           <div className="flex items-center gap-3">
//                             <img
//                               src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=random`}
//                               alt=""
//                               className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
//                             />
//                             <div>
//                               <p className="font-medium text-sm text-gray-900 dark:text-white">{user.userName}</p>
//                               <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
//                             </div>
//                           </div>
//                         </td>
//                         <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
//                           {user.subscription?.planName || '-'}
//                         </td>
//                         <td className="p-4">
//                           <StatusBadge status={user.subscription?.status} />
//                         </td>
//                         <td className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
//                           {user.attendance?.totalSessions || 0}
//                         </td>
//                         <td className="p-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
//                           {user.attendance?.totalHoursUsed || 0}h
//                         </td>
//                         <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
//                           {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '-'}
//                         </td>
//                         <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
//                           {user.attendance?.lastVisit ? new Date(user.attendance.lastVisit).toLocaleDateString() : 'Never'}
//                         </td>
//                         <td className="p-4 text-center">
//                           <button
//                             onClick={() => fetchUserAnalytics(user.userId)}
//                             className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
//                           >
//                             <Eye className="w-4 h-4" />
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Mobile Card View (Hidden on Desktop) */}
//               <div className="md:hidden grid grid-cols-1 gap-3">
//                 {users.map(user => (
//                   <div
//                     key={user.userId}
//                     onClick={() => fetchUserAnalytics(user.userId)}
//                     className="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm active:scale-[0.98] transition-transform"
//                   >
//                     <div className="flex items-start justify-between mb-3">
//                       <div className="flex items-center gap-3">
//                         <img
//                           src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=random`}
//                           alt=""
//                           className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-800"
//                         />
//                         <div>
//                           <h3 className="text-sm font-bold text-gray-900 dark:text-white">{user.userName}</h3>
//                           <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
//                         </div>
//                       </div>
//                       <StatusBadge status={user.subscription?.status} />
//                     </div>

//                     <div className="grid grid-cols-2 gap-2 mb-3">
//                       <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-center">
//                         <p className="text-[10px] uppercase text-gray-400 font-bold">Plan</p>
//                         <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.subscription?.planName || 'N/A'}</p>
//                       </div>
//                       <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-center">
//                         <p className="text-[10px] uppercase text-gray-400 font-bold">Hours</p>
//                         <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{user.attendance?.totalHoursUsed || 0}h</p>
//                       </div>
//                     </div>

//                     <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500">
//                       <span>Joined: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}</span>
//                       <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
//                         View Details <ChevronRight className="w-3 h-3" />
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </>
//           )}
//         </div>

//         {/* Pagination */}
//         {users.length > 0 && (
//           <div className="mt-6 flex justify-center items-center gap-3">
//             <button
//               onClick={() => setPage(p => Math.max(1, p - 1))}
//               disabled={page === 1}
//               className="p-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
//             >
//               <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
//             </button>
//             <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-[#18181b] px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10">
//               Page {page}
//             </span>
//             <button
//               onClick={() => setPage(p => p + 1)}
//               className="p-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
//             >
//               <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Analytics Modal */}
//       {userAnalytics && (
//         <UserAnalyticsModal
//           analytics={userAnalytics}
//           onClose={() => {
//             setUserAnalytics(null);
//             setSelectedUser(null);
//           }}
//         />
//       )}
//     </div>
//   );
// };

// // ============================================
// // HELPER COMPONENTS
// // ============================================

// const StatusBadge = ({ status }) => {
//   const styles = {
//     active: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
//     expired: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
//     cancelled: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
//     unknown: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
//   };
  
//   return (
//     <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${styles[status] || styles.unknown}`}>
//       {status || 'Unknown'}
//     </span>
//   );
// };

// const StatCard = ({ title, value, icon, bg }) => (
//   <div className="bg-white dark:bg-[#18181b] p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
//     <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-30 group-hover:scale-125 transition-transform duration-500 ${bg.split(' ')[0]}`}></div>
//     <div className="flex justify-between items-start z-10">
//       <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</span>
//       <div className={`p-1.5 rounded-lg ${bg}`}>{icon}</div>
//     </div>
//     <span className="text-xl font-bold text-gray-900 dark:text-white z-10 mt-1">{value}</span>
//   </div>
// );

// const UserAnalyticsModal = ({ analytics, onClose }) => {
//   return (
//     <div 
//       className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
//       onClick={onClose}
//     >
//       <div 
//         className="bg-white dark:bg-[#18181b] w-full md:max-w-xl max-h-[90vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col border border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom duration-300"
//         onClick={e => e.stopPropagation()}
//       >
//         {/* Header with Gradient */}
//         <div className="relative h-24 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0 rounded-t-3xl overflow-hidden">
//           <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
//           <button 
//             onClick={onClose} 
//             className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full backdrop-blur-md transition-colors"
//           >
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Profile Content */}
//         <div className="px-6 -mt-12 mb-6 flex flex-col items-center relative z-10 shrink-0">
//           <img
//             src={analytics.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(analytics.user.name)}&background=random`}
//             alt=""
//             className="w-24 h-24 rounded-full border-4 border-white dark:border-[#18181b] shadow-xl object-cover bg-white"
//           />
//           <h2 className="mt-3 text-xl font-bold text-gray-900 dark:text-white text-center">
//             {analytics.user.name}
//           </h2>
//           <div className="flex flex-wrap justify-center gap-3 mt-2">
//             <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
//               <Mail className="w-3 h-3" /> {analytics.user.email}
//             </span>
//             {analytics.user.phone && (
//               <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
//                 <Phone className="w-3 h-3" /> {analytics.user.phone}
//               </span>
//             )}
//           </div>
//         </div>

//         {/* Scrollable Body */}
//         <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6 custom-scrollbar">
          
//           {/* Stats Row */}
//           <div className="grid grid-cols-3 gap-3">
//             <ModalStat label="Sessions" value={analytics.analytics.totalSessions} />
//             <ModalStat label="Hours" value={`${analytics.analytics.totalHoursUsed}h`} />
//             <ModalStat label="Avg Time" value={`${analytics.analytics.averageSessionDuration}m`} />
//           </div>

//           {/* Subscription Status */}
//           <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
//             <div className="flex justify-between items-center mb-3">
//               <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Current Plan</h3>
//               <StatusBadge status={analytics.subscription.status} />
//             </div>
//             <div className="flex justify-between items-end">
//               <div>
//                 <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.subscription.planName}</p>
//                 <p className="text-xs text-gray-500 mt-1">
//                   Expires: {new Date(analytics.subscription.expiryDate).toLocaleDateString()}
//                 </p>
//               </div>
//               <div className="text-right">
//                 <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.subscription.daysRemaining}</p>
//                 <p className="text-[10px] text-gray-400 uppercase font-bold">Days Left</p>
//               </div>
//             </div>
//           </div>

//           {/* Recent Activity */}
//           <div>
//             <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-3">Recent Sessions</h3>
//             <div className="space-y-2">
//               {analytics.recentSessions.length > 0 ? (
//                 analytics.recentSessions.map((session, i) => (
//                   <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-sm">
//                     <div className="flex items-center gap-3">
//                       <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
//                         {session.seatNumber}
//                       </div>
//                       <div>
//                         <p className="text-xs font-semibold text-gray-900 dark:text-white">
//                           {new Date(session.date).toLocaleDateString()}
//                         </p>
//                         <p className="text-[10px] text-gray-500">
//                           {new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                         </p>
//                       </div>
//                     </div>
//                     <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-black/20 px-2 py-1 rounded">
//                       {session.durationMinutes}m
//                     </span>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-center text-gray-500 text-xs py-4">No recent activity found.</p>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ModalStat = ({ label, value }) => (
//   <div className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
//     <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
//     <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
//   </div>
// );

// export default LibraryUsersManagement;



// import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import {
//   Users,
//   CheckCircle,
//   DollarSign,
//   Activity,
//   Clock,
//   Calendar,
//   Search,
//   Filter,
//   ChevronLeft,
//   ChevronRight,
//   X,
//   Download,
//   Eye,
//   MoreVertical,
//   ArrowUpRight
// } from 'lucide-react';
// import axiosClient from '../api/axiosClient';
// import { motion, AnimatePresence } from 'framer-motion';

// // ============================================
// // LIBRARY OWNER DASHBOARD - USERS MANAGEMENT
// // ============================================

// const LibraryUsersManagement = ({ libraryId: propLibraryId }) => {
//   const { id } = useParams();
//   const libraryId = propLibraryId || id;

//   const [users, setUsers] = useState([]);
//   const [statistics, setStatistics] = useState(null);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [userAnalytics, setUserAnalytics] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // Filters and Pagination
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(10);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState('all');
//   const [sortBy, setSortBy] = useState('createdAt');
//   const [sortOrder, setSortOrder] = useState('desc');

//   // Fetch all users in library
//   const fetchLibraryUsers = async () => {
//     if (!libraryId) return;

//     setLoading(true);
//     setError(null);
//     try {
//       const response = await axiosClient.get(`/library/${libraryId}/users`, {
//         params: {
//           page,
//           limit,
//           search: searchQuery,
//           status: statusFilter,
//           sortBy,
//           sortOrder
//         }
//       });
//       setUsers(response.data.users || []);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to fetch users');
//       console.error('Error fetching users:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch library statistics
//   const fetchLibraryStatistics = async () => {
//     if (!libraryId) return;
//     try {
//       const response = await axiosClient.get(`/library/${libraryId}/statistics`);
//       setStatistics(response.data);
//     } catch (err) {
//       console.error('Error fetching statistics:', err);
//     }
//   };

//   // Fetch individual user analytics
//   const fetchUserAnalytics = async (userId) => {
//     if (!libraryId) return;
//     setLoading(true);
//     try {
//       const response = await axiosClient.get(
//         `/library/${libraryId}/user/${userId}/analytics`
//       );
//       setUserAnalytics(response.data);
//       setSelectedUser(userId);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to fetch user analytics');
//       console.error('Error fetching user analytics:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Initial load
//   useEffect(() => {
//     if (libraryId) {
//       fetchLibraryUsers();
//       fetchLibraryStatistics();
//     }
//   }, [libraryId, page, limit, searchQuery, statusFilter, sortBy, sortOrder]);

//   if (!libraryId) {
//     return (
//       <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">
//         <p>No library selected.</p>
//       </div>
//     );
//   }

//   // Animation Variants
//   const containerVariants = {
//     hidden: { opacity: 0 },
//     visible: {
//       opacity: 1,
//       transition: { staggerChildren: 0.05 }
//     }
//   };

//   const itemVariants = {
//     hidden: { y: 10, opacity: 0 },
//     visible: {
//       y: 0,
//       opacity: 1,
//       transition: { type: "spring", stiffness: 100 }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-300 overflow-hidden relative pb-20">

//       {/* Ambient Background Glows */}
//       <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
//         <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-purple-500/10 dark:bg-purple-900/10 rounded-full blur-[100px]" />
//         <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[100px]" />
//       </div>

//       <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

//         {/* Header */}
//         <motion.header
//           initial={{ opacity: 0, y: -20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="mb-8"
//         >
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
//             <div>
//               <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
//                 <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
//                   <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
//                 </div>
//                 User Management
//               </h1>
//               <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 ml-1">
//                 Track subscriptions, attendance & analytics
//               </p>
//             </div>
//           </div>
//         </motion.header>

//         {/* Statistics Cards - Horizontal Scroll on Mobile */}
//         {statistics && (
//           <motion.div
//             variants={containerVariants}
//             initial="hidden"
//             animate="visible"
//             className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
//           >
//             <StatCard
//               title="Total Users"
//               value={statistics.subscriptionMetrics?.totalSubscriptions || 0}
//               icon={<Users className="w-4 h-4 text-blue-400" />}
//               bg="bg-blue-500/10 border-blue-500/20"
//             />
//             <StatCard
//               title="Active"
//               value={statistics.subscriptionMetrics?.activeSubscriptions || 0}
//               icon={<CheckCircle className="w-4 h-4 text-green-400" />}
//               bg="bg-green-500/10 border-green-500/20"
//             />
//             <StatCard
//               title="Revenue"
//               value={`₹${statistics.financialMetrics?.totalRevenue || 0}`}
//               icon={<DollarSign className="w-4 h-4 text-purple-400" />}
//               bg="bg-purple-500/10 border-purple-500/20"
//             />
//             <StatCard
//               title="Visitors Today"
//               value={statistics.attendanceMetrics?.today?.visitors || 0}
//               icon={<Activity className="w-4 h-4 text-orange-400" />}
//               bg="bg-orange-500/10 border-orange-500/20"
//             />
//             <StatCard
//               title="30-Day Active"
//               value={statistics.attendanceMetrics?.last30Days?.uniqueUsers || 0}
//               icon={<Calendar className="w-4 h-4 text-pink-400" />}
//               bg="bg-pink-500/10 border-pink-500/20"
//             />
//           </motion.div>
//         )}

//         {/* Filters & Search */}
//         <div className="bg-white dark:bg-[#0F0F12] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-6 flex flex-col md:flex-row gap-4 justify-between sticky top-24 z-20 backdrop-blur-xl bg-opacity-80 dark:bg-opacity-80">
//           <div className="relative w-full md:w-96 group">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-purple-500 transition-colors" />
//             <input
//               type="text"
//               placeholder="Search users..."
//               value={searchQuery}
//               onChange={(e) => {
//                 setSearchQuery(e.target.value);
//                 setPage(1);
//               }}
//               className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm text-gray-900 dark:text-gray-100 transition-all"
//             />
//           </div>

//           <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
//             <div className="relative min-w-[120px]">
//               <select
//                 value={statusFilter}
//                 onChange={(e) => {
//                   setStatusFilter(e.target.value);
//                   setPage(1);
//                 }}
//                 className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
//               >
//                 <option value="all">All Status</option>
//                 <option value="active">Active</option>
//                 <option value="expired">Expired</option>
//                 <option value="cancelled">Cancelled</option>
//               </select>
//               <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
//             </div>

//             <div className="relative min-w-[140px]">
//               <select
//                 value={`${sortBy}-${sortOrder}`}
//                 onChange={(e) => {
//                   const [field, order] = e.target.value.split('-');
//                   setSortBy(field);
//                   setSortOrder(order);
//                 }}
//                 className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
//               >
//                 <option value="createdAt-desc">Newest First</option>
//                 <option value="createdAt-asc">Oldest First</option>
//                 <option value="name-asc">Name (A-Z)</option>
//                 <option value="lastSeen-desc">Last Active</option>
//               </select>
//               <ArrowUpRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
//             </div>
//           </div>
//         </div>

//         {error && (
//           <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm text-center">
//             {error}
//           </div>
//         )}

//         {/* Users Content - Responsive Grid/Table */}
//         <motion.div
//           variants={containerVariants}
//           initial="hidden"
//           animate="visible"
//           className="space-y-4"
//         >
//           {loading ? (
//             <div className="flex flex-col items-center justify-center py-20">
//               <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
//               <p className="text-gray-500 text-sm">Loading users...</p>
//             </div>
//           ) : users.length === 0 ? (
//             <div className="text-center py-20 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl">
//               <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
//               <p className="text-gray-500 dark:text-gray-400">No users found.</p>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 gap-3">
//               {users.map((user) => (
//                 <UserCard
//                   key={user.userId}
//                   user={user}
//                   onClick={() => fetchUserAnalytics(user.userId)}
//                 />
//               ))}
//             </div>
//           )}
//         </motion.div>

//         {/* Pagination */}
//         {users.length > 0 && (
//           <div className="mt-8 flex justify-center items-center gap-4">
//             <button
//               onClick={() => setPage(p => Math.max(1, p - 1))}
//               disabled={page === 1}
//               className="p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
//             >
//               <ChevronLeft className="w-5 h-5" />
//             </button>
//             <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
//               Page {page}
//             </span>
//             <button
//               onClick={() => setPage(p => p + 1)}
//               className="p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
//             >
//               <ChevronRight className="w-5 h-5" />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Analytics Modal */}
//       <AnimatePresence>
//         {userAnalytics && (
//           <UserAnalyticsModal
//             analytics={userAnalytics}
//             onClose={() => {
//               setUserAnalytics(null);
//               setSelectedUser(null);
//             }}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// };

// // ============================================
// // HELPER COMPONENTS
// // ============================================

// const UserCard = ({ user, onClick }) => {
//   // Determine status color
//   const statusColors = {
//     active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
//     expired: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
//     cancelled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
//     default: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
//   };
//   const statusStyle = statusColors[user.subscription?.status] || statusColors.default;

//   return (
//     <motion.div
//       layout
//       onClick={onClick}
//       className="group relative bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/5 rounded-2xl p-4 cursor-pointer hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all active:scale-[0.99]"
//     >
//       <div className="flex items-center gap-4">
//         {/* Avatar */}
//         <div className="relative">
//           <img
//             src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=random`}
//             alt="avatar"
//             className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-[#0F0F12] shadow-sm"
//           />
//           <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0F0F12] ${user.subscription?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
//         </div>

//         {/* Info */}
//         <div className="flex-1 min-w-0">
//           <div className="flex justify-between items-start">
//             <div>
//               <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">
//                 {user.userName}
//               </h3>
//               <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
//                 {user.email}
//               </p>
//             </div>
//             <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${statusStyle}`}>
//               {user.subscription?.status || 'Unknown'}
//             </div>
//           </div>

//           <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
//             <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
//               <Clock size={10} />
//               {user.attendance?.totalHoursUsed || 0}h
//             </span>
//             <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
//               <Activity size={10} />
//               {user.attendance?.totalSessions || 0} sessions
//             </span>
//             {user.attendance?.lastVisit && (
//               <span className="truncate ml-auto">
//                 {new Date(user.attendance.lastVisit).toLocaleDateString()}
//               </span>
//             )}
//           </div>
//         </div>

//         <ChevronRight className="text-gray-300 dark:text-gray-700 group-hover:text-purple-500 transition-colors" size={16} />
//       </div>
//     </motion.div>
//   );
// };

// const StatCard = ({ title, value, icon, bg }) => (
//   <motion.div
//     whileHover={{ y: -2 }}
//     className="bg-white dark:bg-[#0F0F12] p-3 md:p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between h-24 md:h-28 relative overflow-hidden group"
//   >
//     <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500 ${bg.split(' ')[0]}`}></div>

//     <div className="flex justify-between items-start">
//       <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</span>
//       <div className={`p-1.5 rounded-lg ${bg}`}>
//         {icon}
//       </div>
//     </div>

//     <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 z-10">{value}</span>
//   </motion.div>
// );

// const UserAnalyticsModal = ({ analytics, onClose }) => {
//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
//       onClick={onClose}
//     >
//       <motion.div
//         initial={{ scale: 0.95, opacity: 0, y: 20 }}
//         animate={{ scale: 1, opacity: 1, y: 0 }}
//         exit={{ scale: 0.95, opacity: 0, y: 20 }}
//         className="bg-white dark:bg-[#18181b] w-full max-w-lg max-h-[85vh] rounded-3xl overflow-hidden flex flex-col border border-gray-200 dark:border-white/10 shadow-2xl relative"
//         onClick={e => e.stopPropagation()}
//       >
//         {/* Header */}
//         <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 z-0"></div>

//         <div className="relative z-10 p-6 flex flex-col items-center pt-10">
//           <button
//             onClick={onClose}
//             className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors text-gray-500 dark:text-gray-400"
//           >
//             <X size={20} />
//           </button>

//           <img
//             src={analytics.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(analytics.user.name)}&background=random`}
//             alt="user"
//             className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-[#18181b] shadow-xl mb-3"
//           />
//           <h2 className="text-xl font-bold text-gray-900 dark:text-white">{analytics.user.name}</h2>
//           <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{analytics.user.email}</p>

//           {/* Quick Stats Row */}
//           <div className="flex gap-4 w-full justify-center mb-6">
//             <div className="text-center px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
//               <p className="text-xs text-gray-500 uppercase">Sessions</p>
//               <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.analytics.totalSessions}</p>
//             </div>
//             <div className="text-center px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
//               <p className="text-xs text-gray-500 uppercase">Hours</p>
//               <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.analytics.totalHoursUsed}</p>
//             </div>
//             <div className="text-center px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
//               <p className="text-xs text-gray-500 uppercase">Days</p>
//               <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.analytics.totalVisitDays}</p>
//             </div>
//           </div>
//         </div>

//         {/* Scrollable Content */}
//         <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-6">

//           {/* Active Plan */}
//           <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/[0.03] to-indigo-500/[0.03] border border-purple-500/10">
//             <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">Current Plan</h3>
//             <div className="flex justify-between items-center mb-2">
//               <span className="font-bold text-gray-900 dark:text-white text-lg">{analytics.subscription.planName}</span>
//               <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
//                     ${analytics.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
//                 {analytics.subscription.status}
//               </span>
//             </div>
//             <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
//               <span>Expires: {new Date(analytics.subscription.expiryDate).toLocaleDateString()}</span>
//               <span className="text-purple-600 dark:text-purple-400 font-medium">{analytics.subscription.daysRemaining} days left</span>
//             </div>
//           </div>

//           {/* Recent History */}
//           <div>
//             <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Recent Sessions</h3>
//             <div className="space-y-2">
//               {analytics.recentSessions.length > 0 ? (
//                 analytics.recentSessions.slice(0, 5).map((session, i) => (
//                   <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-sm">
//                     <div className="flex items-center gap-3">
//                       <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
//                         {session.seatNumber}
//                       </div>
//                       <div>
//                         <p className="text-gray-900 dark:text-white font-medium">{new Date(session.date).toLocaleDateString()}</p>
//                         <p className="text-xs text-gray-500">{new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
//                       </div>
//                     </div>
//                     <span className="font-mono font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black/20 px-2 py-1 rounded">
//                       {session.durationMinutes}m
//                     </span>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-sm text-gray-500 text-center py-4">No recent sessions.</p>
//               )}
//             </div>
//           </div>

//         </div>
//       </motion.div>
//     </motion.div>
//   );
// };

// export default LibraryUsersManagement;


import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  DollarSign,
  Activity,
  Clock,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Eye,
  MoreVertical,
  ArrowUpRight,
  MapPin
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// LIBRARY OWNER DASHBOARD - USERS MANAGEMENT
// ============================================

const LibraryUsersManagement = ({ libraryId: propLibraryId }) => {
  const { id } = useParams();
  const libraryId = propLibraryId || id;

  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters and Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch all users in library
  const fetchLibraryUsers = async () => {
    if (!libraryId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axiosClient.get(`/library/${libraryId}/users`, {
        params: {
          page,
          limit,
          search: searchQuery,
          status: statusFilter,
          sortBy,
          sortOrder
        }
      });
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch library statistics
  const fetchLibraryStatistics = async () => {
    if (!libraryId) return;
    try {
      const response = await axiosClient.get(`/library/${libraryId}/statistics`);
      setStatistics(response.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Fetch individual user analytics
  const fetchUserAnalytics = async (userId) => {
    if (!libraryId) return;
    setLoading(true);
    try {
      const response = await axiosClient.get(
        `/library/${libraryId}/user/${userId}/analytics`
      );
      setUserAnalytics(response.data);
      setSelectedUser(userId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user analytics');
      console.error('Error fetching user analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (libraryId) {
      fetchLibraryUsers();
      fetchLibraryStatistics();
    }
  }, [libraryId, page, limit, searchQuery, statusFilter, sortBy, sortOrder]);

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">
        <p>No library selected.</p>
      </div>
    );
  }

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-300 overflow-hidden relative pb-20">
      
      {/* Ambient Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-purple-500/10 dark:bg-purple-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                User Management
              </h1>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 ml-1">
                Track subscriptions, attendance & analytics
              </p>
            </div>
          </div>
        </motion.header>

        {/* Statistics Cards - Horizontal Scroll on Mobile */}
        {statistics && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
          >
            <StatCard
              title="Total Users"
              value={statistics.subscriptionMetrics?.totalSubscriptions || 0}
              icon={<Users className="w-4 h-4 text-blue-400" />}
              bg="bg-blue-500/10 border-blue-500/20"
            />
            <StatCard
              title="Active"
              value={statistics.subscriptionMetrics?.activeSubscriptions || 0}
              icon={<CheckCircle className="w-4 h-4 text-green-400" />}
              bg="bg-green-500/10 border-green-500/20"
            />
             <StatCard
              title="Revenue"
              value={`₹${statistics.financialMetrics?.totalRevenue || 0}`}
              icon={<DollarSign className="w-4 h-4 text-purple-400" />}
              bg="bg-purple-500/10 border-purple-500/20"
            />
            <StatCard
              title="Visitors Today"
              value={statistics.attendanceMetrics?.today?.visitors || 0}
              icon={<Activity className="w-4 h-4 text-orange-400" />}
              bg="bg-orange-500/10 border-orange-500/20"
            />
            <StatCard
              title="30-Day Active"
              value={statistics.attendanceMetrics?.last30Days?.uniqueUsers || 0}
              icon={<Calendar className="w-4 h-4 text-pink-400" />}
              bg="bg-pink-500/10 border-pink-500/20"
            />
          </motion.div>
        )}

        {/* Filters & Search */}
        <div className="bg-white dark:bg-[#0F0F12] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-6 flex flex-col md:flex-row gap-4 justify-between sticky top-24 z-20 backdrop-blur-xl bg-opacity-80 dark:bg-opacity-80">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm text-gray-900 dark:text-gray-100 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
             <div className="relative min-w-[120px]">
                <select
                value={statusFilter}
                onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>

            <div className="relative min-w-[140px]">
                <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="lastSeen-desc">Last Active</option>
                </select>
                <ArrowUpRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {/* Users Content - Responsive Grid/Table */}
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
        >
            {loading ? (
                 <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 text-sm">Loading users...</p>
                 </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-2xl">
                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No users found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
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

        {/* Pagination */}
        {users.length > 0 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Page {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Analytics Modal */}
      <AnimatePresence>
        {userAnalytics && (
            <UserAnalyticsModal
            analytics={userAnalytics}
            onClose={() => {
                setUserAnalytics(null);
                setSelectedUser(null);
            }}
            />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

const UserCard = ({ user, onClick }) => {
    // Determine status color
    const statusColors = {
        active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
        expired: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        cancelled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
        default: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
    };
    const statusStyle = statusColors[user.subscription?.status] || statusColors.default;
    
    // Check if user has an assigned seat (assuming it might be in user object, otherwise fallback)
    const assignedSeat = user.assignedSeat || user.currentSeat || (user.subscription?.status === 'active' ? user.seatNumber : null);
    
    return (
        <motion.div 
            layout
            onClick={onClick}
            className="group relative bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/5 rounded-2xl p-4 cursor-pointer hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all active:scale-[0.99]"
        >
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                    <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=random`}
                        alt="avatar"
                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-[#0F0F12] shadow-sm"
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0F0F12] ${user.subscription?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2 flex items-center gap-2">
                                {user.userName}
                                {assignedSeat && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-[10px] text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                        <MapPin size={8} /> Seat {assignedSeat}
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                            </p>
                        </div>
                        <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${statusStyle}`}>
                            {user.subscription?.status || 'Unknown'}
                        </div>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                            <Clock size={10} />
                            {user.attendance?.totalHoursUsed || 0}h
                        </span>
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                            <Activity size={10} />
                            {user.attendance?.totalSessions || 0} sessions
                        </span>
                    </div>
                </div>
                
                <ChevronRight className="text-gray-300 dark:text-gray-700 group-hover:text-purple-500 transition-colors" size={16} />
            </div>
        </motion.div>
    );
};

const StatCard = ({ title, value, icon, bg }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-white dark:bg-[#0F0F12] p-3 md:p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between h-24 md:h-28 relative overflow-hidden group"
  >
    <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500 ${bg.split(' ')[0]}`}></div>
    
    <div className="flex justify-between items-start">
        <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-lg ${bg}`}>
            {icon}
        </div>
    </div>
    
    <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 z-10">{value}</span>
  </motion.div>
);

const UserAnalyticsModal = ({ analytics, onClose }) => {
    
  // Group sessions by Date
  const groupedSessions = analytics.recentSessions.reduce((groups, session) => {
    const date = new Date(session.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(session);
    return groups;
  }, {});

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-[#18181b] w-full max-w-lg max-h-[85vh] rounded-3xl overflow-hidden flex flex-col border border-gray-200 dark:border-white/10 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header content same as before ... */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 z-0"></div>
        
        <div className="relative z-10 p-6 flex flex-col items-center pt-10">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors text-gray-500 dark:text-gray-400"
            >
                <X size={20} />
            </button>

            <img
              src={analytics.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(analytics.user.name)}&background=random`}
              alt="user"
              className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-[#18181b] shadow-xl mb-3"
            />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{analytics.user.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{analytics.user.email}</p>

            {/* Quick Stats Row */}
            <div className="flex gap-4 w-full justify-center mb-6">
                 <div className="text-center px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-gray-500 uppercase">Sessions</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.analytics.totalSessions}</p>
                 </div>
                 <div className="text-center px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-gray-500 uppercase">Hours</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.analytics.totalHoursUsed}</p>
                 </div>
                 <div className="text-center px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-gray-500 uppercase">Days</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics.analytics.totalVisitDays}</p>
                 </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-6">
          
          {/* Active Plan */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/[0.03] to-indigo-500/[0.03] border border-purple-500/10">
            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">Current Plan</h3>
            <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-900 dark:text-white text-lg">{analytics.subscription.planName}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                    ${analytics.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {analytics.subscription.status}
                </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Expires: {new Date(analytics.subscription.expiryDate).toLocaleDateString()}</span>
                <span className="text-purple-600 dark:text-purple-400 font-medium">{analytics.subscription.daysRemaining} days left</span>
            </div>
          </div>

          {/* Recent History - Grouped by Day */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Recent Sessions</h3>
            <div className="space-y-4">
                {Object.keys(groupedSessions).length > 0 ? (
                    Object.entries(groupedSessions).map(([date, sessions], groupIndex) => (
                        <div key={groupIndex} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 border border-gray-100 dark:border-white/5">
                            {/* Date Header */}
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <Calendar size={14} className="text-purple-500" />
                                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">{date}</span>
                            </div>

                            {/* Sessions for this date */}
                            <div className="space-y-2">
                                {sessions.map((session, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                                                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                                                    {session.seatNumber}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(session.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(session.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                                            {session.durationMinutes}m
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent sessions.</p>
                )}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

export default LibraryUsersManagement;
