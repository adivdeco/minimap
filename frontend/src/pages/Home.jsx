import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useParams } from 'react-router-dom';
import SmartLibraryScanner from '../components/SmartLibraryScanner';
import CountdownTimer from '../components/CountdownTimer';
import UserSeatMap from '../components/UserSeatMap';
import { getLibrarySeats } from '../api/seat';
import axios from 'axios';
import { toast } from 'react-toastify';
import { LogOut, MapPin, Armchair, ArmchairIcon, Library } from 'lucide-react';

const Home = () => {
    const { user, logout, checkAuth } = useAuth(); // Assuming checkAuth refreshes user data
    const { logout: auth0Logout } = useAuth0();
    const navigate = useNavigate();
    const [showScanner, setShowScanner] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);

    // Seat Canvas State
    const [seats, setSeats] = useState([]);
    const [loadingSeats, setLoadingSeats] = useState(false);

    const activeSeat = user?.studentDetails?.assignedSeat;
    // Safely extract libraryId and libraryName (handles both populated object and raw ID)
    const subscription = user?.studentDetails?.currentSubscription;
    const libraryId = subscription?.libraryId?._id || subscription?.libraryId;
    const libraryName = subscription?.libraryId?.libraryName;



    // Fetch Seats when libraryId/activeSeat changes
    useState(() => {
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
        auth0Logout({
            logoutParams: {
                returnTo: window.location.origin + '/login'
            }
        });
        navigate('/login');
    };

    const handleCheckOut = async () => {
        if (!window.confirm("Are you sure you want to check out and release your seat?")) return;

        setCheckingOut(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
            const response = await axios.post(`${API_URL}/entry/check-out`, {}, { withCredentials: true });
            
            // Show detailed feedback
            const { remainingTime, checkinsRemaining, maxDailyCheckins, msg } = response.data;
            const remainingTimeStr = remainingTime ? `${remainingTime.hours}h ${remainingTime.minutes}m` : '';

            toast.success(
                <div>
                    <p className="font-bold">Checked Out Successfully!</p>
                    <p className="text-sm opacity-90">{msg}</p>
                    {remainingTime && (
                        <div className="mt-2 text-xs opacity-80 border-t border-white/20 pt-1">
                            <p>Remaining Today: {remainingTimeStr}</p>
                            <p>Check-ins Left: {checkinsRemaining}/{maxDailyCheckins}</p>
                        </div>
                    )}
                </div>
            );

            // Refresh user data to clear the seat from context
            if (checkAuth) checkAuth();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Checkout failed");
        } finally {
            setCheckingOut(false);
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation */}
            <nav className="backdrop-blur-xl bg-white/5 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-6">
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                LibraryManager
                            </span>
                            <div className="hidden md:flex items-center gap-4">
                                <button onClick={() => navigate('/libraries')} className="text-gray-300 hover:text-white transition-colors">
                                    Libraries
                                </button>
                                {isAdmin && (
                                    <button onClick={() => navigate('/users')} className="text-gray-300 hover:text-white transition-colors">
                                        Users
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/profile')}
                                className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                            >
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-purple-400" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                                        {user?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                <span className="text-gray-300 hidden sm:block">{user?.name || user?.email}</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/10"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Welcome back, <span className="text-purple-400">{user?.name || 'User'}</span>!
                    </h1>
                    <p className="text-gray-400">Manage your libraries and users from the dashboard below.</p>
                </div>

                {/* --- DASHBOARD STATUS CARD --- */}
                <div className="mb-12 p-1 rounded-3xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-2xl shadow-purple-900/50">
                    <div className="bg-slate-900/90 backdrop-blur-md rounded-[22px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">

                        {/* Status Info */}
                        <div className="flex items-center gap-6">
                            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border ${activeSeat ? 'bg-purple-500/20 border-purple-500/50' : 'bg-gray-700/20 border-gray-600/50'}`}>
                                {activeSeat ? (
                                    <>
                                        <span className="text-xs text-purple-300 uppercase font-bold tracking-wider mb-1">Seat</span>
                                        <span className="text-3xl font-bold text-white">{activeSeat.seatNumber}</span>
                                    </>
                                ) : (
                                    <ArmchairIcon size={32} className="text-gray-500" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${activeSeat ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                    {activeSeat ? "Checked In" : "Checked Out"}
                                </h2>
                                <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
                                    {activeSeat ? (
                                        <><MapPin size={16} /> Library Access Active</>
                                    ) : (
                                        "Scan QR to check in"
                                    )}
                                </p>

                                {user?.studentDetails?.currentSubscription?.expiryDate && (
                                    <div className="mt-3 space-y-1">
                                         {libraryName && (
                                            <p className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                                                <Library size={14} />
                                                {libraryName}
                                            </p>
                                        )}
                                        <p className="text-xs text-purple-300 font-medium">
                                            Pass Expires: {new Date(user.studentDetails.currentSubscription.expiryDate).toLocaleDateString()}
                                            <span className="ml-1 opacity-75">
                                                ({Math.ceil((new Date(user.studentDetails.currentSubscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days left)
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timer & Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">

                            {activeSeat ? (
                                <>
                                    {activeSeat.expectedEndTime && (
                                        <div className="flex flex-col items-center sm:items-end">
                                            <span className="text-xs text-gray-400 uppercase font-semibold mb-2">Time Remaining</span>
                                            <CountdownTimer targetDate={activeSeat.expectedEndTime} />
                                        </div>
                                    )}

                                    <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>

                                    <button
                                        onClick={handleCheckOut}
                                        disabled={checkingOut}
                                        className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {checkingOut ? 'Checking Out...' : 'Check Out'}
                                        <LogOut size={20} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 flex items-center gap-2"
                                >
                                    Scan QR Code
                                </button>
                            )}
                        </div>

                    </div>
                </div>
                {/* --- SEAT MAP --- */}
                {
                    libraryId && (
                        <div className="mb-12">
                            {/* <h2 className="text-2xl font-bold text-white mb-6">Library Floor Plan</h2> */}
                            {loadingSeats ? (
                                <div className="text-white text-center p-8 bg-white/5 rounded-2xl animate-pulse">Loading Map...</div>
                            ) : (
                                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/10">
                                    <UserSeatMap
                                        seats={seats}
                                        activeSeatId={activeSeat?.seatId}
                                    />
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Your Role</p>
                                <p className="text-2xl font-bold text-white capitalize">{user?.role || 'User'}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Email</p>
                                <p className="text-lg font-medium text-white truncate max-w-[180px]">{user?.email}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Member Since</p>
                                <p className="text-lg font-medium text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/* 1. SCAN QR ACCESS (New) */}
                    <button
                        onClick={() => setShowScanner(true)}
                        className="backdrop-blur-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl border border-purple-500/30 p-6 text-left hover:bg-white/10 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1 relative z-10">Scan For Entry</h3>
                        <p className="text-gray-300 text-sm relative z-10">Scan QR to check-in or start trial</p>
                    </button>

                    {/* View Libraries */}
                    <button
                        onClick={() => navigate('/libraries')}
                        className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 text-left hover:bg-white/15 transition-all group"
                    >
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">All Libraries</h3>
                        <p className="text-gray-400 text-sm">Browse and manage libraries</p>
                    </button>

                    {/* Edit Profile */}
                    {/* <button
                        onClick={() => navigate('/profile')}
                        className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 text-left hover:bg-white/15 transition-all group"
                    >
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Edit Profile</h3>
                        <p className="text-gray-400 text-sm">Update your account info</p>
                    </button> */}

                    {/* Admin: Add Library */}
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/add-library')}
                            className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 text-left hover:bg-white/15 transition-all group"
                        >
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">Add Library</h3>
                            <p className="text-gray-400 text-sm">Register a new library</p>
                        </button>
                    )}

                    {/* Library Owner: My Libraries */}
                    {user?.role === 'library_owner' && (
                        <button
                            onClick={() => navigate('/my-libraries')}
                            className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 text-left hover:bg-white/15 transition-all group"
                        >
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">My Libraries</h3>
                            <p className="text-gray-400 text-sm">Update your library details</p>
                        </button>
                    )}

                    {/* Admin: Manage Users */}
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/users')}
                            className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6 text-left hover:bg-white/15 transition-all group"
                        >
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors">
                                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">Manage Users</h3>
                            <p className="text-gray-400 text-sm">View and edit all users</p>
                        </button>
                    )}

                </div>
            </main>

            {/* SCANNER OVERLAY */}
            {
                showScanner && (
                    <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-200">
                        <SmartLibraryScanner onClose={() => setShowScanner(false)} />
                    </div>
                )
            }

        </div >
    );
};

export default Home;



// import { useState, useEffect } from 'react'; // Added useEffect to imports
// import { useAuth } from '../context/AuthContext';
// import { useAuth0 } from '@auth0/auth0-react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { toast } from 'react-toastify';
// import { 
//     LogOut, 
//     MapPin, 
//     Armchair, 
//     QrCode, 
//     Library, 
//     Users, 
//     PlusCircle, 
//     Settings,
//     ChevronRight,
//     Clock
// } from 'lucide-react';

// // Components
// import SmartLibraryScanner from '../components/SmartLibraryScanner';
// import CountdownTimer from '../components/CountdownTimer';
// import UserSeatMap from '../components/UserSeatMap';
// import { getLibrarySeats } from '../api/seat';

// const Home = () => {
//     const { user, logout, checkAuth } = useAuth();
//     const { logout: auth0Logout } = useAuth0();
//     const navigate = useNavigate();
//     const [showScanner, setShowScanner] = useState(false);
//     const [checkingOut, setCheckingOut] = useState(false);

//     // Seat Canvas State
//     const [seats, setSeats] = useState([]);
//     const [loadingSeats, setLoadingSeats] = useState(false);

//     const activeSeat = user?.studentDetails?.assignedSeat;
//     const libraryId = user?.studentDetails?.currentSubscription?.libraryId;

//     // Fetch Seats
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
//     }, [libraryId, activeSeat]); // Removed useState wrapper, used standard useEffect

//     const handleLogout = () => {
//         logout();
//         auth0Logout({
//             logoutParams: { returnTo: window.location.origin + '/login' }
//         });
//         navigate('/login');
//     };

//     const handleCheckOut = async () => {
//         if (!window.confirm("Are you sure you want to release your seat?")) return;
//         setCheckingOut(true);
//         try {
//             const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
//             await axios.post(`${API_URL}/entry/check-out`, {}, { withCredentials: true });
//             toast.success("Checked out successfully");
//             if (checkAuth) checkAuth();
//         } catch (error) {
//             toast.error(error.response?.data?.msg || "Checkout failed");
//         } finally {
//             setCheckingOut(false);
//         }
//     };

//     const isAdmin = user?.role === 'admin' || user?.role === 'co-admin';

//     return (
//         <div className="min-h-screen bg-[#0B0F19] text-slate-200 selection:bg-indigo-500/30">
            
//             {/* Background Ambient Glow */}
//             <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

//             {/* --- Navigation --- */}
//             <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F19]/80 border-b border-white/5">
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//                     <div className="flex items-center justify-between h-20">
//                         {/* Logo */}
//                         <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
//                             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
//                                 <Library className="text-white" size={20} />
//                             </div>
//                             <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
//                                 Library<span className="font-light">Manager</span>
//                             </span>
//                         </div>

//                         {/* User Profile & Logout */}
//                         <div className="flex items-center gap-4">
//                             <div className="hidden md:flex flex-col items-end mr-2">
//                                 <span className="text-sm font-medium text-white">{user?.name}</span>
//                                 <span className="text-xs text-slate-400 capitalize">{user?.role}</span>
//                             </div>
//                             <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
//                                 {user?.avatar ? (
//                                     <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
//                                 ) : (
//                                     <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
//                                         {user?.name?.charAt(0)}
//                                     </div>
//                                 )}
//                             </div>
//                             <button
//                                 onClick={handleLogout}
//                                 className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
//                                 title="Logout"
//                             >
//                                 <LogOut size={20} />
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </nav>

//             {/* --- Main Content --- */}
//             <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
//                 {/* 1. Dashboard Status Card (Hero) */}
//                 <div className="mb-12">
//                     <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
//                         {/* Decorative Top Line */}
//                         <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${activeSeat ? 'from-emerald-500 via-teal-500 to-emerald-500' : 'from-indigo-500 via-purple-500 to-pink-500'}`} />
                        
//                         <div className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            
//                             {/* Left: Status Info */}
//                             <div className="flex items-center gap-8 w-full md:w-auto">
//                                 <div className={`relative w-24 h-24 rounded-2xl flex items-center justify-center border-2 ${activeSeat ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}>
//                                     {activeSeat ? (
//                                         <>
//                                             <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
//                                             <span className="relative text-4xl font-black tracking-tighter z-10">{activeSeat.seatNumber}</span>
//                                         </>
//                                     ) : (
//                                         <Armchair size={40} strokeWidth={1.5} />
//                                     )}
//                                 </div>
                                
//                                 <div>
//                                     <div className="flex items-center gap-3 mb-2">
//                                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${activeSeat ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-700/30 border-slate-600/30 text-slate-400'}`}>
//                                             {activeSeat ? 'Active Session' : 'Not Checked In'}
//                                         </span>
//                                     </div>
//                                     <h1 className="text-3xl font-bold text-white mb-1">
//                                         {activeSeat ? "You are checked in." : "Ready to study?"}
//                                     </h1>
//                                     <p className="text-slate-400 flex items-center gap-2 text-sm">
//                                         {activeSeat ? (
//                                             <><MapPin size={14} className="text-emerald-400" /> Access granted to Library Zone A</>
//                                         ) : (
//                                             "Scan the QR code at the desk to begin your session."
//                                         )}
//                                     </p>
//                                 </div>
//                             </div>

//                             {/* Right: Actions & Timer */}
//                             <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
//                                 {activeSeat ? (
//                                     <>
//                                         <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 min-w-[160px] text-center">
//                                             <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold uppercase mb-1">
//                                                 <Clock size={12} /> Remaining
//                                             </div>
//                                             <CountdownTimer targetDate={activeSeat.expectedEndTime} />
//                                         </div>
//                                         <button
//                                             onClick={handleCheckOut}
//                                             disabled={checkingOut}
//                                             className="h-full px-8 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl font-semibold transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
//                                         >
//                                             {checkingOut ? 'Processing...' : 'End Session'}
//                                         </button>
//                                     </>
//                                 ) : (
//                                     <button
//                                         onClick={() => setShowScanner(true)}
//                                         className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold shadow-xl shadow-indigo-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3"
//                                     >
//                                         <QrCode size={20} />
//                                         <span>Scan QR Code</span>
//                                     </button>
//                                 )}
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* 2. Interactive Map Section */}
//                 {libraryId && (
//                     <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
//                         <div className="flex items-center justify-between mb-6">
//                             <h2 className="text-xl font-semibold text-white tracking-tight">Live Floor Plan</h2>
//                             <div className="text-xs text-slate-500 font-mono bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
//                                 LIVE UPDATES ON
//                             </div>
//                         </div>
                        
//                         {loadingSeats ? (
//                             <div className="h-[400px] w-full bg-slate-900/30 rounded-3xl animate-pulse border border-white/5 flex items-center justify-center">
//                                 <span className="text-slate-500 font-medium">Retrieving spatial data...</span>
//                             </div>
//                         ) : (
//                             <UserSeatMap seats={seats} activeSeatId={activeSeat?.seatId} />
//                         )}
//                     </div>
//                 )}

//                 {/* 3. Quick Actions Grid */}
//                 <div>
//                     <h2 className="text-xl font-semibold text-white tracking-tight mb-6">Management & Tools</h2>
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        
//                         {/* Card Component for Reusability */}
//                         <ActionCard 
//                             onClick={() => navigate('/libraries')}
//                             icon={<Library size={24} className="text-violet-400" />}
//                             title="Libraries"
//                             desc="Browse available spaces"
//                             color="violet"
//                         />
                        
//                         {user?.role === 'library_owner' && (
//                             <ActionCard 
//                                 onClick={() => navigate('/my-libraries')}
//                                 icon={<Settings size={24} className="text-pink-400" />}
//                                 title="My Venues"
//                                 desc="Manage your libraries"
//                                 color="pink"
//                             />
//                         )}

//                         {isAdmin && (
//                             <>
//                                 <ActionCard 
//                                     onClick={() => navigate('/add-library')}
//                                     icon={<PlusCircle size={24} className="text-emerald-400" />}
//                                     title="Add Library"
//                                     desc="Register new venue"
//                                     color="emerald"
//                                 />
//                                 <ActionCard 
//                                     onClick={() => navigate('/users')}
//                                     icon={<Users size={24} className="text-amber-400" />}
//                                     title="Users"
//                                     desc="Administer accounts"
//                                     color="amber"
//                                 />
//                             </>
//                         )}

//                         {/* Profile (Available to all) */}
//                         {/* <ActionCard 
//                             onClick={() => navigate('/profile')}
//                             icon={<UserIcon size={24} className="text-blue-400" />}
//                             title="Profile"
//                             desc="Account settings"
//                             color="blue"
//                         /> */}
//                     </div>
//                 </div>

//             </main>

//             {/* Scanner Overlay */}
//             {showScanner && (
//                 <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 flex items-center justify-center">
//                     <SmartLibraryScanner onClose={() => setShowScanner(false)} />
//                 </div>
//             )}
//         </div>
//     );
// };

// // Sub-component for clean grid items
// const ActionCard = ({ icon, title, desc, onClick, color }) => {
//     // Dynamic color classes map
//     const bgColors = {
//         violet: 'group-hover:bg-violet-500/10 group-hover:border-violet-500/30',
//         pink: 'group-hover:bg-pink-500/10 group-hover:border-pink-500/30',
//         emerald: 'group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30',
//         amber: 'group-hover:bg-amber-500/10 group-hover:border-amber-500/30',
//         blue: 'group-hover:bg-blue-500/10 group-hover:border-blue-500/30',
//     };

//     return (
//         <button 
//             onClick={onClick}
//             className={`
//                 group relative p-6 rounded-2xl bg-slate-900/40 border border-white/5 text-left transition-all duration-300
//                 hover:-translate-y-1 hover:shadow-xl
//                 ${bgColors[color] || 'hover:bg-white/5'}
//             `}
//         >
//             <div className="flex items-start justify-between mb-4">
//                 <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5 group-hover:scale-110 transition-transform duration-300">
//                     {icon}
//                 </div>
//                 <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={18} />
//             </div>
//             <h3 className="text-lg font-bold text-slate-200 group-hover:text-white mb-1">{title}</h3>
//             <p className="text-sm text-slate-500 group-hover:text-slate-400">{desc}</p>
//         </button>
//     );
// };

// export default Home;