// import { useState, useEffect, useRef } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { useAuth0 } from '@auth0/auth0-react';
// import { useNavigate, useParams } from 'react-router-dom';
// import SmartLibraryScanner from '../components/SmartLibraryScanner';
// import CountdownTimer from '../components/CountdownTimer';
// import UserSeatMap from '../components/UserSeatMap';
// import { getLibrarySeats } from '../api/seat';
// import axios from 'axios';
// import { toast } from 'react-toastify';
// import { 
//   LogOut, 
//   MapPin, 
//   Armchair, 
//   ArmchairIcon, 
//   Library, 
//   Home as HomeIcon,
//   Users,
//   Building,
//   Settings,
//   Bell,
//   ChevronRight,
//   QrCode,
//   Clock,
//   Calendar,
//   Shield,
//   Sparkles,
//   Zap,
//   TrendingUp,
//   ScanLine
// } from 'lucide-react';

// const Home = () => {
//     const { user, logout, checkAuth } = useAuth();
//     const { logout: auth0Logout } = useAuth0();
//     const navigate = useNavigate();
//     const [showScanner, setShowScanner] = useState(false);
//     const [checkingOut, setCheckingOut] = useState(false);
//     const [activeTab, setActiveTab] = useState('dashboard');
//     const [notifications, setNotifications] = useState(3); // Example notification count
//     const [isScrolling, setIsScrolling] = useState(false);

//     // Seat Canvas State
//     const [seats, setSeats] = useState([]);
//     const [loadingSeats, setLoadingSeats] = useState(false);
//     const [isMounted, setIsMounted] = useState(false);

//     const activeSeat = user?.studentDetails?.assignedSeat;
//     const subscription = user?.studentDetails?.currentSubscription;
//     const libraryId = subscription?.libraryId?._id || subscription?.libraryId;
//     const libraryName = subscription?.libraryId?.libraryName;

//     // Animation refs
//     const statusCardRef = useRef(null);
//     const quickActionsRef = useRef(null);

//     useEffect(() => {
//         setIsMounted(true);
        
//         // Add scroll listener for navbar effects
//         const handleScroll = () => {
//             setIsScrolling(window.scrollY > 20);
//         };
//         window.addEventListener('scroll', handleScroll);
        
//         return () => window.removeEventListener('scroll', handleScroll);
//     }, []);

//     // Fetch Seats when libraryId/activeSeat changes
//     useEffect(() => {
//         const fetchSeats = async () => {
//             if (!libraryId) return;
//             setLoadingSeats(true);
//             try {
//                 const data = await getLibrarySeats(libraryId);
//                 setSeats(data);
//             } catch (error) {
//                 console.error("Failed to load seats", error);
//             } finally {
//                 setLoadingSeats(false);
//             }
//         };

//         if (libraryId) {
//             fetchSeats();
//         }
//     }, [libraryId, activeSeat]);

//     // Intersection Observer for animations
//     useEffect(() => {
//         const observer = new IntersectionObserver(
//             (entries) => {
//                 entries.forEach(entry => {
//                     if (entry.isIntersecting) {
//                         entry.target.classList.add('animate-slide-up');
//                     }
//                 });
//             },
//             { threshold: 0.1 }
//         );

//         const elements = [
//             statusCardRef.current,
//             quickActionsRef.current
//         ].filter(Boolean);

//         elements.forEach(el => observer.observe(el));

//         return () => observer.disconnect();
//     }, []);

//     const handleLogout = () => {
//         logout();
//         auth0Logout({
//             logoutParams: {
//                 returnTo: window.location.origin + '/login'
//             }
//         });
//         navigate('/login');
//     };

//     const handleCheckOut = async () => {
//         if (!window.confirm("Are you sure you want to check out and release your seat?")) return;

//         setCheckingOut(true);
//         try {
//             const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
//             const response = await axios.post(`${API_URL}/entry/check-out`, {}, { withCredentials: true });
            
//             const { remainingTime, checkinsRemaining, maxDailyCheckins, msg } = response.data;
//             const remainingTimeStr = remainingTime ? `${remainingTime.hours}h ${remainingTime.minutes}m` : '';

//             toast.success(
//                 <div className="p-2">
//                     <p className="font-bold text-lg">Checked Out Successfully! 🎉</p>
//                     <p className="text-sm opacity-90 mt-1">{msg}</p>
//                     {remainingTime && (
//                         <div className="mt-3 text-sm border-t border-white/20 pt-2">
//                             <div className="flex justify-between">
//                                 <span className="opacity-80">Remaining Today:</span>
//                                 <span className="font-semibold">{remainingTimeStr}</span>
//                             </div>
//                             <div className="flex justify-between mt-1">
//                                 <span className="opacity-80">Check-ins Left:</span>
//                                 <span className="font-semibold">{checkinsRemaining}/{maxDailyCheckins}</span>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             );

//             if (checkAuth) checkAuth();
//         } catch (error) {
//             console.error(error);
//             toast.error(error.response?.data?.msg || "Checkout failed");
//         } finally {
//             setCheckingOut(false);
//         }
//     };

//     const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';
//     const isLibraryOwner = user?.role === 'library_owner';

//     // Calculate subscription days left
//     const subscriptionDaysLeft = subscription?.expiryDate 
//         ? Math.ceil((new Date(subscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
//         : 0;

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
//             {/* Enhanced Navigation */}
//             <nav className={`sticky top-0 z-50 transition-all duration-300 ${
//                 isScrolling 
//                     ? 'backdrop-blur-xl bg-white/90 shadow-lg border-b border-slate-200/80' 
//                     : 'bg-transparent'
//             }`}>
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//                     <div className="flex items-center justify-between h-16">
//                         <div className="flex items-center gap-8">
//                             <div className="flex items-center gap-2">
//                                 <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
//                                     <Library className="w-6 h-6 text-white" />
//                                 </div>
//                                 <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
//                                     StudySpace
//                                 </span>
//                             </div>
                            
//                             <div className="hidden md:flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-2xl p-1 border border-slate-200">
//                                 <button 
//                                     onClick={() => setActiveTab('dashboard')}
//                                     className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
//                                         activeTab === 'dashboard'
//                                             ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
//                                             : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
//                                     }`}
//                                 >
//                                     <HomeIcon size={18} />
//                                     Dashboard
//                                 </button>
                                
//                                 <button 
//                                     onClick={() => navigate('/libraries')}
//                                     className="px-4 py-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all duration-200 flex items-center gap-2"
//                                 >
//                                     <Building size={18} />
//                                     Libraries
//                                 </button>
                                
//                                 {isAdmin && (
//                                     <button 
//                                         onClick={() => navigate('/users')}
//                                         className="px-4 py-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all duration-200 flex items-center gap-2"
//                                     >
//                                         <Users size={18} />
//                                         Users
//                                     </button>
//                                 )}
                                
//                                 {isLibraryOwner && (
//                                     <button 
//                                         onClick={() => navigate('/my-libraries')}
//                                         className="px-4 py-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all duration-200 flex items-center gap-2"
//                                     >
//                                         <Settings size={18} />
//                                         My Libraries
//                                     </button>
//                                 )}
//                             </div>
//                         </div>

//                         <div className="flex items-center gap-4">
//                             {/* Notifications */}
//                             <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors">
//                                 <Bell className="w-5 h-5 text-slate-600" />
//                                 {notifications > 0 && (
//                                     <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
//                                         {notifications}
//                                     </span>
//                                 )}
//                             </button>

//                             {/* Enhanced Profile */}
//                             <div className="relative group">
//                                 <button className="flex items-center gap-3 hover:bg-slate-100 px-3 py-2 rounded-2xl transition-all duration-200">
//                                     <div className="relative">
//                                         {user?.avatar ? (
//                                             <img 
//                                                 src={user.avatar} 
//                                                 alt={user.name} 
//                                                 className="w-10 h-10 rounded-xl border-2 border-white shadow-md"
//                                             />
//                                         ) : (
//                                             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-md">
//                                                 {user?.name?.charAt(0)?.toUpperCase()}
//                                             </div>
//                                         )}
//                                         <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
//                                             activeSeat ? 'bg-green-500' : 'bg-slate-400'
//                                         }`}></div>
//                                     </div>
//                                     <div className="hidden lg:block text-left">
//                                         <p className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</p>
//                                         <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
//                                     </div>
//                                     <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
//                                 </button>
                                
//                                 {/* Dropdown Menu */}
//                                 <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
//                                     <div className="p-3 border-b border-slate-100">
//                                         <p className="font-semibold text-slate-800">{user?.name}</p>
//                                         <p className="text-sm text-slate-500 truncate">{user?.email}</p>
//                                     </div>
//                                     <button 
//                                         onClick={() => navigate('/profile')}
//                                         className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-3 transition-colors"
//                                     >
//                                         <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
//                                             <Users className="w-4 h-4 text-indigo-600" />
//                                         </div>
//                                         <span>My Profile</span>
//                                     </button>
//                                     <button 
//                                         onClick={() => navigate('/settings')}
//                                         className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-3 transition-colors"
//                                     >
//                                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
//                                             <Settings className="w-4 h-4 text-slate-600" />
//                                         </div>
//                                         <span>Settings</span>
//                                     </button>
//                                     <div className="border-t border-slate-100 mt-2 pt-2">
//                                         <button 
//                                             onClick={handleLogout}
//                                             className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
//                                         >
//                                             <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
//                                                 <LogOut className="w-4 h-4 text-red-600" />
//                                             </div>
//                                             <span>Logout</span>
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </nav>

//             {/* Main Content */}
//             <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//                 {/* Welcome Section with Animation */}
//                 <div className="mb-8 animate-fade-in">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <h1 className="text-4xl font-bold text-slate-900 mb-2">
//                                 Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'User'}</span>!
//                             </h1>
//                             <p className="text-slate-600 text-lg">Here's what's happening with your study spaces today.</p>
//                         </div>
//                         {isMounted && (
//                             <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
//                                 <Calendar className="w-4 h-4" />
//                                 {new Date().toLocaleDateString('en-US', { 
//                                     weekday: 'long', 
//                                     year: 'numeric', 
//                                     month: 'long', 
//                                     day: 'numeric' 
//                                 })}
//                             </div>
//                         )}
//                     </div>
//                 </div>

//                 {/* Status Card - Enhanced */}
//                 <div 
//                     ref={statusCardRef}
//                     className="mb-12 opacity-0 transform translate-y-4 transition-all duration-700"
//                 >
//                     <div className="bg-gradient-to-br from-white to-indigo-50 rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
//                         <div className="p-8">
//                             <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
//                                 {/* Status Info */}
//                                 <div className="flex-1">
//                                     <div className="flex items-center gap-4 mb-6">
//                                         <div className={`relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all duration-300 ${
//                                             activeSeat 
//                                                 ? 'bg-gradient-to-br from-green-500 to-emerald-400 text-white' 
//                                                 : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'
//                                         }`}>
//                                             {activeSeat ? (
//                                                 <>
//                                                     <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
//                                                         <Zap className="w-4 h-4 text-green-500" />
//                                                     </div>
//                                                     <span className="text-xs font-semibold uppercase tracking-wider mb-1">Seat</span>
//                                                     <span className="text-4xl font-bold">{activeSeat.seatNumber}</span>
//                                                     <span className="text-xs mt-1 opacity-90">Active</span>
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <ArmchairIcon size={40} className="opacity-50" />
//                                                     <span className="text-sm font-semibold mt-2">No Seat</span>
//                                                 </>
//                                             )}
//                                         </div>
                                        
//                                         <div>
//                                             <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-2">
//                                                 <span className={`w-3 h-3 rounded-full ${
//                                                     activeSeat ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-slate-400'
//                                                 }`}></span>
//                                                 {activeSeat ? "Checked In" : "Checked Out"}
//                                             </h2>
//                                             <p className="text-slate-600 mb-4 flex items-center gap-2">
//                                                 <MapPin className="w-4 h-4" />
//                                                 {activeSeat ? `Library Access Active • ${libraryName || 'Current Library'}` : "Scan QR code to check in"}
//                                             </p>
                                            
//                                             {subscription && (
//                                                 <div className="space-y-2">
//                                                     {libraryName && (
//                                                         <div className="flex items-center gap-2 text-sm">
//                                                             <Library className="w-4 h-4 text-indigo-500" />
//                                                             <span className="font-medium text-slate-800">{libraryName}</span>
//                                                         </div>
//                                                     )}
//                                                     <div className="flex items-center gap-2 text-sm">
//                                                         <Calendar className="w-4 h-4 text-purple-500" />
//                                                         <span className="text-slate-600">
//                                                             Pass expires in <span className="font-semibold text-purple-600">{subscriptionDaysLeft} days</span>
//                                                         </span>
//                                                     </div>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Timer & Actions */}
//                                 <div className="flex flex-col items-center gap-6">
//                                     {activeSeat ? (
//                                         <>
//                                             <div className="text-center">
//                                                 <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 inline-block">
//                                                     Time Remaining
//                                                 </span>
//                                                 {activeSeat.expectedEndTime && (
//                                                     <div className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-2xl border border-slate-200 shadow-sm">
//                                                         <CountdownTimer 
//                                                             targetDate={activeSeat.expectedEndTime}
//                                                             className="text-3xl font-bold text-slate-900"
//                                                         />
//                                                     </div>
//                                                 )}
//                                             </div>
                                            
//                                             <button
//                                                 onClick={handleCheckOut}
//                                                 disabled={checkingOut}
//                                                 className="group px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
//                                             >
//                                                 <span>{checkingOut ? 'Checking Out...' : 'Check Out'}</span>
//                                                 <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//                                             </button>
//                                         </>
//                                     ) : (
//                                         <button
//                                             onClick={() => setShowScanner(true)}
//                                             className="group px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold flex items-center gap-3 shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
//                                         >
//                                             <div className="relative">
//                                                 <QrCode className="w-6 h-6" />
//                                                 <ScanLine className="w-4 h-4 absolute -top-1 -right-1 text-green-300 animate-ping" />
//                                             </div>
//                                             <span>Scan QR Code</span>
//                                             <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//                                         </button>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Quick Stats - Enhanced */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
//                     <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-slate-500 text-sm font-medium mb-1">Your Role</p>
//                                 <p className="text-2xl font-bold text-slate-900 capitalize">{user?.role?.replace('_', ' ') || 'User'}</p>
//                             </div>
//                             <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
//                                 <Shield className="w-7 h-7 text-indigo-600" />
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-slate-500 text-sm font-medium mb-1">Member Since</p>
//                                 <p className="text-lg font-semibold text-slate-900">
//                                     {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
//                                 </p>
//                             </div>
//                             <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
//                                 <Calendar className="w-7 h-7 text-blue-600" />
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-slate-500 text-sm font-medium mb-1">Active Sessions</p>
//                                 <p className="text-2xl font-bold text-slate-900">{activeSeat ? '1' : '0'}</p>
//                             </div>
//                             <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
//                                 <TrendingUp className="w-7 h-7 text-green-600" />
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <p className="text-slate-500 text-sm font-medium mb-1">Libraries Access</p>
//                                 <p className="text-2xl font-bold text-slate-900">1</p>
//                             </div>
//                             <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
//                                 <Building className="w-7 h-7 text-amber-600" />
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Seat Map Section */}
//                 {libraryId && (
//                     <div className="mb-12">
//                         <div className="flex items-center justify-between mb-6">
//                             <h2 className="text-2xl font-bold text-slate-900">Library Floor Plan</h2>
//                             <span className="text-sm text-slate-500">Real-time seat availability</span>
//                         </div>
//                         {loadingSeats ? (
//                             <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-lg border border-slate-200 p-12 text-center animate-pulse">
//                                 <div className="inline-block p-4 bg-slate-100 rounded-xl">
//                                     <Armchair className="w-8 h-8 text-slate-300" />
//                                 </div>
//                                 <p className="mt-4 text-slate-500">Loading seat map...</p>
//                             </div>
//                         ) : (
//                             <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
//                                 <UserSeatMap
//                                     seats={seats}
//                                     activeSeatId={activeSeat?.seatId}
//                                 />
//                             </div>
//                         )}
//                     </div>
//                 )}

//                 {/* Quick Actions - Enhanced */}
//                 <div ref={quickActionsRef} className="opacity-0 transform translate-y-4 transition-all duration-700">
//                     <div className="flex items-center justify-between mb-6">
//                         <h2 className="text-2xl font-bold text-slate-900">Quick Actions</h2>
//                         <span className="text-sm text-indigo-600 font-medium">Get things done faster</span>
//                     </div>
                    
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                         {/* Scan QR */}
//                         <button
//                             onClick={() => setShowScanner(true)}
//                             className="group bg-gradient-to-br from-white to-indigo-50 rounded-2xl border border-slate-200 p-6 text-left hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1"
//                         >
//                             <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/25">
//                                 <ScanLine className="w-7 h-7 text-white" />
//                             </div>
//                             <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
//                                 Scan QR Code
//                             </h3>
//                             <p className="text-slate-600 text-sm mb-4">Quick check-in to any library</p>
//                             <div className="flex items-center text-indigo-600 text-sm font-medium">
//                                 <span>Open Scanner</span>
//                                 <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
//                             </div>
//                         </button>

//                         {/* View Libraries */}
//                         <button
//                             onClick={() => navigate('/libraries')}
//                             className="group bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 text-left hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
//                         >
//                             <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
//                                 <Building className="w-7 h-7 text-white" />
//                             </div>
//                             <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
//                                 Browse Libraries
//                             </h3>
//                             <p className="text-slate-600 text-sm mb-4">Discover available study spaces</p>
//                             <div className="flex items-center text-blue-600 text-sm font-medium">
//                                 <span>Explore</span>
//                                 <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
//                             </div>
//                         </button>

//                         {/* Admin Actions */}
//                         {isAdmin && (
//                             <button
//                                 onClick={() => navigate('/users')}
//                                 className="group bg-gradient-to-br from-white to-amber-50 rounded-2xl border border-slate-200 p-6 text-left hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1"
//                             >
//                                 <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/25">
//                                     <Users className="w-7 h-7 text-white" />
//                                 </div>
//                                 <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">
//                                     Manage Users
//                                 </h3>
//                                 <p className="text-slate-600 text-sm mb-4">View and manage all users</p>
//                                 <div className="flex items-center text-amber-600 text-sm font-medium">
//                                     <span>Get Started</span>
//                                     <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
//                                 </div>
//                             </button>
//                         )}

//                         {/* Library Owner */}
//                         {isLibraryOwner && (
//                             <button
//                                 onClick={() => navigate('/my-libraries')}
//                                 className="group bg-gradient-to-br from-white to-emerald-50 rounded-2xl border border-slate-200 p-6 text-left hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1"
//                             >
//                                 <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/25">
//                                     <Settings className="w-7 h-7 text-white" />
//                                 </div>
//                                 <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
//                                     My Libraries
//                                 </h3>
//                                 <p className="text-slate-600 text-sm mb-4">Manage your library details</p>
//                                 <div className="flex items-center text-emerald-600 text-sm font-medium">
//                                     <span>Manage</span>
//                                     <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
//                                 </div>
//                             </button>
//                         )}

//                         {/* Fallback action if not admin/owner */}
//                         {!isAdmin && !isLibraryOwner && (
//                             <button
//                                 onClick={() => navigate('/profile')}
//                                 className="group bg-gradient-to-br from-white to-purple-50 rounded-2xl border border-slate-200 p-6 text-left hover:border-purple-300 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1"
//                             >
//                                 <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/25">
//                                     <Sparkles className="w-7 h-7 text-white" />
//                                 </div>
//                                 <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
//                                     My Profile
//                                 </h3>
//                                 <p className="text-slate-600 text-sm mb-4">Update your profile settings</p>
//                                 <div className="flex items-center text-purple-600 text-sm font-medium">
//                                     <span>View Profile</span>
//                                     <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
//                                 </div>
//                             </button>
//                         )}
//                     </div>
//                 </div>
//             </main>

//             {/* Scanner Overlay */}
//             {showScanner && (
//                 <div className="fixed inset-0 z-50 animate-in fade-in duration-300">
//                     <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowScanner(false)} />
//                     <div className="absolute inset-0 flex items-center justify-center p-4">
//                         <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in">
//                             <SmartLibraryScanner onClose={() => setShowScanner(false)} />
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Add CSS animations */}
//             <style jsx>{`
//                 @keyframes fade-in {
//                     from { opacity: 0; }
//                     to { opacity: 1; }
//                 }
                
//                 @keyframes slide-up {
//                     from { 
//                         opacity: 0;
//                         transform: translateY(20px);
//                     }
//                     to { 
//                         opacity: 1;
//                         transform: translateY(0);
//                     }
//                 }
                
//                 @keyframes scale-in {
//                     from { 
//                         opacity: 0;
//                         transform: scale(0.95);
//                     }
//                     to { 
//                         opacity: 1;
//                         transform: scale(1);
//                     }
//                 }
                
//                 .animate-fade-in {
//                     animation: fade-in 0.6s ease-out;
//                 }
                
//                 .animate-slide-up {
//                     animation: slide-up 0.6s ease-out forwards;
//                 }
                
//                 .animate-scale-in {
//                     animation: scale-in 0.3s ease-out;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default Home;


import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import SmartLibraryScanner from '../components/SmartLibraryScanner';
import CountdownTimer from '../components/CountdownTimer';
import UserSeatMap from '../components/UserSeatMap';
import AttendanceCalendar from '../components/AttendanceCalendar'; // Import the calendar
import { getLibrarySeats } from '../api/seat';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
    LogOut, MapPin, Armchair, Library, QrCode, 
    LayoutDashboard, Users, PlusCircle, BookOpen, 
    ChevronRight, CreditCard, Clock, CalendarDays,
    History, BarChart3, Activity, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animations ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
        y: 0, 
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const Home = () => {
    const { user, logout, checkAuth } = useAuth();
    const { logout: auth0Logout } = useAuth0();
    const navigate = useNavigate();
    const [showScanner, setShowScanner] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);

    // Seat Canvas State
    const [seats, setSeats] = useState([]);
    const [loadingSeats, setLoadingSeats] = useState(false);

    const activeSeat = user?.studentDetails?.assignedSeat;
    const subscription = user?.studentDetails?.currentSubscription;
    const libraryId = subscription?.libraryId?._id || subscription?.libraryId;
    const libraryName = subscription?.libraryId?.libraryName;
    const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    useEffect(() => {
        const fetchSeats = async () => {
            if (!libraryId) return;
            setLoadingSeats(true);
            try {
                const data = await getLibrarySeats(libraryId);
                setSeats(data);
            } catch (error) {
                console.error("Failed to load seats", error);
            } finally {
                setLoadingSeats(false);
            }
        };

        if (libraryId) {
            fetchSeats();
        }
    }, [libraryId, activeSeat]);

    const handleLogout = () => {
        logout();
        auth0Logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
        navigate('/login');
    };

    const handleCheckOut = async () => {
        if (!window.confirm("Are you sure you want to check out and release your seat?")) return;

        setCheckingOut(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
            const response = await axios.post(`${API_URL}/entry/check-out`, {}, { withCredentials: true });
            
            const { remainingTime, checkinsRemaining, maxDailyCheckins, msg } = response.data;
            const remainingTimeStr = remainingTime ? `${remainingTime.hours}h ${remainingTime.minutes}m` : '';

            toast.success(
                <div>
                    <p className="font-bold">Checked Out Successfully!</p>
                    <p className="text-sm opacity-90">{msg}</p>
                    {remainingTime && (
                        <div className="mt-2 text-xs opacity-80 border-t border-white/20 pt-1">
                            <p>Remaining: {remainingTimeStr}</p>
                            <p>Check-ins: {checkinsRemaining}/{maxDailyCheckins}</p>
                        </div>
                    )}
                </div>
            );

            if (checkAuth) checkAuth();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Checkout failed");
        } finally {
            setCheckingOut(false);
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';
    const hasSubscription = !!subscription;
    const showFloorPlan = libraryId && hasSubscription;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
            
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Library className="text-white" size={20} />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">
                                Study<span className="text-purple-400">Space</span>
                            </span>
                        </motion.div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-2">
                            <NavLink onClick={() => navigate('/libraries')} icon={<LayoutDashboard size={16} />} text="Libraries" />
                            {hasSubscription && <NavLink onClick={() => setShowAttendance(true)} icon={<CalendarDays size={16} />} text="History" />}
                            {isAdmin && <NavLink onClick={() => navigate('/users')} icon={<Users size={16} />} text="Users" />}
                        </div>

                        {/* Profile & Logout (Right Corner) */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4"
                        >
                            {/* Quick Actions Bar */}
                            <div className="hidden md:flex items-center gap-3 mr-4">
                                {hasSubscription && (
                                    <button
                                        onClick={() => setShowAttendance(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all group"
                                    >
                                        <CalendarDays size={16} className="text-purple-400" />
                                        <span className="text-sm font-medium text-gray-200">Attendance</span>
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all cursor-pointer group"
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full object-cover border-2 border-purple-500/50 group-hover:border-purple-400" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-inner">
                                            {user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start leading-none gap-1">
                                        <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                            {user?.name?.split(' ')[0]}
                                        </span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                            {user?.role === 'student' ? 'Member' : user?.role}
                                        </span>
                                    </div>
                                </button>
                            </div>

                            {/* Mobile Profile */}
                            <div className="md:hidden flex items-center gap-3">
                                {hasSubscription && (
                                    <button
                                        onClick={() => setShowAttendance(true)}
                                        className="p-2.5 rounded-full bg-white/5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                        title="Attendance"
                                    >
                                        <CalendarDays size={18} />
                                    </button>
                                )}
                                
                                <button
                                    onClick={handleLogout}
                                    className="p-2.5 rounded-full bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Welcome Header */}
                    <motion.div variants={itemVariants} className="mb-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                                    Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">{user?.name?.split(' ')[0] || 'User'}</span>
                                </h1>
                                <p className="text-gray-400 text-lg">{hasSubscription ? "Your study space is ready." : "Ready to start studying?"}</p>
                            </div>
                            
                            {/* Quick Stats */}
                            {hasSubscription && (
                                <div className="flex gap-4">
                                    <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Days Left</p>
                                        <p className="text-2xl font-bold text-white">{daysLeft}</p>
                                    </div>
                                    <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${activeSeat ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                            <span className="text-lg font-semibold text-white">
                                                {activeSeat ? 'Active' : 'Available'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Main Dashboard Grid */}
                    {hasSubscription ? (
                        <>
                            {/* STATUS CARD */}
                            <motion.div variants={itemVariants} className="mb-8">
                                <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-8 overflow-hidden relative">
                                    {/* Glow Effect */}
                                    <div className="absolute top-0 right-0 p-64 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                    
                                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                                        {/* Left: Seat Info */}
                                        <div className="flex items-center gap-6">
                                            <div className={`relative w-28 h-28 rounded-2xl flex items-center justify-center border-2 shadow-2xl ${activeSeat ? 'bg-gradient-to-br from-green-900/20 to-green-600/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                                {activeSeat ? (
                                                    <>
                                                        <div className="text-center">
                                                            <div className="text-xs text-green-400 uppercase font-bold tracking-wider mb-2">Seat</div>
                                                            <div className="text-5xl font-bold text-white">{activeSeat.seatNumber}</div>
                                                            <div className="text-xs text-green-400 mt-2">Active Session</div>
                                                        </div>
                                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                                            <Activity size={14} className="text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Armchair size={40} className="text-gray-600" />
                                                        <div className="absolute bottom-3 text-xs text-gray-500">No Active Seat</div>
                                                    </>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    {activeSeat ? "You're checked in" : "Ready to check in"}
                                                </h2>
                                                <p className="text-gray-400 mb-4 flex items-center gap-2">
                                                    <MapPin size={16} className="text-purple-400" />
                                                    {libraryName || "No library selected"}
                                                </p>
                                                
                                                {activeSeat?.expectedEndTime && (
                                                    <div className="flex items-center gap-4">
                                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                                            <p className="text-xs text-gray-500 mb-1">Time Remaining</p>
                                                            <div className="text-lg font-mono text-white">
                                                                <CountdownTimer targetDate={activeSeat.expectedEndTime} />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowAttendance(true)}
                                                            className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                                                        >
                                                            <History size={14} />
                                                            View History
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex flex-col gap-3 min-w-[200px]">
                                            {activeSeat ? (
                                                <button
                                                    onClick={handleCheckOut}
                                                    disabled={checkingOut}
                                                    className="px-6 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/30 transition-all group"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {checkingOut ? 'Processing...' : 'Check Out'}
                                                        <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                                                    </span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setShowScanner(true)}
                                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <QrCode size={20} />
                                                    Scan QR Code
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* FLOOR PLAN SECTION - Only show if user has active library */}
                            {showFloorPlan && (
                                <motion.div variants={itemVariants} className="mb-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Live Floor Plan</h3>
                                            <p className="text-gray-400">Real-time seat availability in {libraryName}</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-600"></span> Occupied</span>
                                            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-gray-600"></span> Available</span>
                                            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-600"></span> Your Seat</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#0F0F12] border border-white/10 rounded-3xl p-1 overflow-hidden">
                                        {loadingSeats ? (
                                            <div className="h-64 flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-4"></div>
                                                <p className="text-gray-400">Loading floor plan...</p>
                                            </div>
                                        ) : (
                                            <div className="bg-[#1a1a20] rounded-[20px] overflow-hidden">
                                                <UserSeatMap seats={seats} activeSeatId={activeSeat?.seatId} />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* QUICK ACTIONS */}
                            <motion.div variants={itemVariants}>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Crown size={20} className="text-yellow-500" />
                                    Quick Actions
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <ActionCard 
                                        icon={<CalendarDays size={24} className="text-purple-400" />}
                                        title="Attendance"
                                        subtitle="View history & stats"
                                        onClick={() => setShowAttendance(true)}
                                    />
                                    
                                    <ActionCard 
                                        icon={<LayoutDashboard size={24} className="text-blue-400" />}
                                        title="Libraries"
                                        subtitle="Browse all spaces"
                                        onClick={() => navigate('/libraries')}
                                    />
                                    
                                    <ActionCard 
                                        icon={<BarChart3 size={24} className="text-green-400" />}
                                        title="Analytics"
                                        subtitle="Usage insights"
                                        onClick={() => navigate('/analytics')}
                                    />
                                    
                                    <ActionCard 
                                        icon={<CreditCard size={24} className="text-yellow-400" />}
                                        title="Subscription"
                                        subtitle="Manage your plan"
                                        onClick={() => navigate('/subscription')}
                                    />
                                </div>
                            </motion.div>
                        </>
                    ) : (
                        /* EMPTY STATE - No subscription */
                        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20">
                            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-8">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center">
                                    <Library size={64} className="text-purple-400 opacity-50" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">Welcome to StudySpace</h2>
                            <p className="text-gray-400 text-lg text-center max-w-md mb-8">
                                Get started by subscribing to a library and unlock access to premium study spaces.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => navigate('/libraries')}
                                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all"
                                >
                                    Browse Libraries
                                </button>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-8 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
                                >
                                    Try Demo Scan
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </main>

            {/* SCANNER MODAL */}
            <AnimatePresence>
                {showScanner && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowScanner(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            <SmartLibraryScanner onClose={() => setShowScanner(false)} />
                        </motion.div>
                    </motion.div>
                )}

                {/* ATTENDANCE CALENDAR MODAL */}
                {showAttendance && hasSubscription && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm overflow-y-auto"
                    >
                        <div className="min-h-screen p-4">
                            <div className="max-w-6xl mx-auto">
                                <div className="flex items-center justify-between mb-8 pt-4">
                                    <button
                                        onClick={() => setShowAttendance(false)}
                                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ChevronRight size={20} className="rotate-180" />
                                        Back to Dashboard
                                    </button>
                                    <button
                                        onClick={() => setShowAttendance(false)}
                                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <LogOut size={20} className="text-gray-400" />
                                    </button>
                                </div>
                                
                                {/* Attendance Calendar Component */}
                                <div className="bg-[#0F0F12] border border-white/10 rounded-3xl overflow-hidden">
                                    <AttendanceCalendar />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Helper Components ---
const NavLink = ({ icon, text, onClick }) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/5"
    >
        {icon}
        <span className="font-medium text-sm">{text}</span>
    </button>
);

const ActionCard = ({ icon, title, subtitle, onClick }) => (
    <motion.button
        whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.08)" }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white/5 border border-white/10 p-6 rounded-2xl text-left transition-all group"
    >
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <h4 className="font-bold text-white mb-2 flex items-center justify-between">
            {title}
            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-gray-400" />
        </h4>
        <p className="text-sm text-gray-400">{subtitle}</p>
    </motion.button>
);

export default Home;