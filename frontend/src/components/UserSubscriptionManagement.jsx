import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { activateSubscriptionOffline, grantGracePeriod, deleteSubscription } from '../api/entry';
import { getLibraryPlans } from '../api/plan';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-toastify';
import { Plus, Search, Calendar, DollarSign, Mail, Phone, Clock, User, X, Gift, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UserSubscriptionManagement = ({ libraryId }) => {
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activatingId, setActivatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [subscriptionForm, setSubscriptionForm] = useState({
        planId: '',
        pricePaid: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        paymentMethod: 'cash'
    });

    // Grace Period Modal State
    const [showGraceModal, setShowGraceModal] = useState(false);
    const [graceDays, setGraceDays] = useState(3);
    const [grantingGraceId, setGrantingGraceId] = useState(null);

    const canManageSubscriptions = currentUser?.role === 'admin' || currentUser?.role === 'library_owner';

    useEffect(() => {
        if (libraryId && canManageSubscriptions) {
            fetchLibraryUsers();
            fetchPlans();
        }
    }, [libraryId, canManageSubscriptions]);

    // Auto-fill price and end date when a plan is selected
    useEffect(() => {
        if (subscriptionForm.planId && plans.length > 0) {
            const selectedPlan = plans.find(p => p._id === subscriptionForm.planId);
            if (selectedPlan) {
                const start = subscriptionForm.startDate ? new Date(subscriptionForm.startDate) : new Date();
                const end = new Date(start);
                end.setDate(end.getDate() + (selectedPlan.durationInDays || 0));
                
                setSubscriptionForm(prev => ({ 
                    ...prev, 
                    pricePaid: selectedPlan.price,
                    endDate: end.toISOString().split('T')[0]
                }));
            }
        }
    }, [subscriptionForm.planId, plans, subscriptionForm.startDate]);

    const fetchLibraryUsers = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/library/${libraryId}/users`);
            const rawUsers = response.data?.users || (Array.isArray(response.data) ? response.data : []);

            const mappedUsers = rawUsers.map(u => {
                if (u._id && u.name) return u;
                return {
                    _id: u.userId,
                    name: u.userName,
                    email: u.email,
                    phone: u.phone,
                    studentDetails: { currentSubscription: u.subscription },
                    ...u
                };
            });
            setUsers(mappedUsers);
        } catch (error) {
            try {
                const allUsersResponse = await axiosClient.get('/auth/users').catch(() => null);
                if (allUsersResponse) {
                    const fallbackList = allUsersResponse.data?.users || (Array.isArray(allUsersResponse.data) ? allUsersResponse.data : []);
                    setUsers(fallbackList);
                } else {
                    setUsers([]);
                }
            } catch (err) {
                toast.error("Failed to load users");
                setUsers([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await getLibraryPlans(libraryId);
            setPlans(response);
        } catch (error) {
            toast.error("Failed to load plans");
        }
    };

    const openActivationModal = (user) => {
        setSelectedUser(user);
        setSubscriptionForm({
            planId: '',
            pricePaid: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            paymentMethod: 'cash'
        });
        setShowModal(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setSubscriptionForm(prev => ({ ...prev, [name]: value }));
    };

    const handleActivateSubscription = async (e) => {
        e.preventDefault();
        if (!subscriptionForm.planId) return toast.error("Please select a plan");
        if (!subscriptionForm.pricePaid && subscriptionForm.pricePaid !== 0) return toast.error("Please enter price paid");

        try {
            setActivatingId(selectedUser._id);
            const response = await activateSubscriptionOffline(
                selectedUser._id,
                libraryId,
                subscriptionForm.planId,
                parseFloat(subscriptionForm.pricePaid),
                subscriptionForm.startDate,
                subscriptionForm.endDate
            );

            if (response.success) {
                toast.success(`Subscription activated for ${selectedUser.name}`);
                setShowModal(false);
                fetchLibraryUsers();
            } else {
                toast.error(response.msg || "Failed to activate subscription");
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to activate subscription");
        } finally {
            setActivatingId(null);
        }
    };

    const openGraceModal = (user) => {
        if (!user.studentDetails?.currentSubscription?.subscriptionId) {
            return toast.error("User does not have a previous subscription to extend.");
        }
        setSelectedUser(user);
        const currentSub = user.studentDetails?.currentSubscription;
        setGraceDays(currentSub?.gracePeriodAllowed ? currentSub.graceDaysAllowed : 3);
        setShowGraceModal(true);
    };

    const handleGrantGracePeriod = async (e) => {
        e.preventDefault();
        if (!graceDays || graceDays <= 0) return toast.error("Please enter a valid number of days");

        try {
            setGrantingGraceId(selectedUser._id);
            const subId = selectedUser.studentDetails.currentSubscription.subscriptionId;
            const response = await grantGracePeriod(libraryId, subId, graceDays);

            if (response.success) {
                toast.success(`Granted ${graceDays} grace days to ${selectedUser.name}`);
                setShowGraceModal(false);
                fetchLibraryUsers();
            } else {
                toast.error(response.msg || "Failed to grant grace period");
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to grant grace period");
        } finally {
            setGrantingGraceId(null);
        }
    };

    const handleDeleteSubscription = async (userId, subscriptionId, userName) => {
        if (!window.confirm(`Are you sure you want to cancel ${userName}'s active subscription? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingId(userId);
            const response = await deleteSubscription(libraryId, subscriptionId);
            
            if (response.success) {
                toast.success(response.msg || "Subscription canceled successfully");
                fetchLibraryUsers();
            } else {
                toast.error(response.msg || "Failed to cancel subscription");
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to cancel subscription");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    );

    if (!canManageSubscriptions) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-center">
                <p className="text-red-700 dark:text-red-400 font-medium">You don't have permission to manage subscriptions.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <User size={24} className="text-blue-600 dark:text-blue-400" />
                        Manual Subscription Setup
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Activate plans for members paying offline or in cash.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#0F0F12] rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading members...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <User className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No members found matching your search.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {filteredUsers.map((user) => {
                                    const subscription = user.studentDetails?.currentSubscription;
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

                                    return (
                                        <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"><Mail size={14} />{user.email}</span>
                                                    {user.phone && <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"><Phone size={14} />{user.phone}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isActive ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 w-fit border border-green-200 dark:border-green-500/20">
                                                            <Clock size={12} /> Active
                                                        </span>
                                                        <span className="text-[11px] text-gray-500">Exp: {new Date(subscription.expiryDate).toLocaleDateString()}</span>
                                                        {subscription?.graceDaysUsed > 0 && (
                                                            <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                <Gift size={10} /> Used {subscription.graceDaysUsed} Grace Days
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : isInGracePeriod ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 w-fit border border-purple-200 dark:border-purple-500/20">
                                                            <Gift size={12} /> Grace Period
                                                        </span>
                                                        <span className="text-[11px] text-gray-500">Ends: {graceEndDate.toLocaleDateString()}</span>
                                                        <span className="text-[10px] text-purple-500 font-medium">{subscription.graceDaysAllowed} Extended Days</span>
                                                    </div>
                                                ) : isGracePeriodExpired ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="px-2.5 py-1 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 w-fit border border-red-200 dark:border-red-500/20">
                                                            Grace Expired
                                                        </span>
                                                        <span className="text-[11px] text-gray-500">Ended: {graceEndDate.toLocaleDateString()}</span>
                                                    </div>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-gray-200 dark:border-gray-700">
                                                        No Active Plan
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {!isActive ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {subscription?.subscriptionId && (
                                                            <button
                                                                onClick={() => openGraceModal(user)}
                                                                disabled={grantingGraceId === user._id || activatingId === user._id || deletingId === user._id}
                                                                title={subscription?.gracePeriodAllowed ? "Update Grace Period" : "Grant Grace Period"}
                                                                className="inline-flex items-center justify-center p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-800/50 disabled:opacity-50 transition-colors shadow-sm"
                                                            >
                                                                <Gift size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openActivationModal(user)}
                                                            disabled={activatingId === user._id || grantingGraceId === user._id || deletingId === user._id}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                                        >
                                                            <Plus size={14} /> {activatingId === user._id ? 'Processing...' : 'Assign Plan'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-3 mr-4">
                                                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Up to date</span>
                                                        <button 
                                                            onClick={() => handleDeleteSubscription(user._id, subscription.subscriptionId, user.name)}
                                                            disabled={deletingId === user._id}
                                                            title="Cancel Subscription"
                                                            className="inline-flex items-center justify-center p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors shadow-sm"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-white/10 overflow-hidden"
                        >
                            <div className="bg-gray-50 dark:bg-white/5 p-6 border-b border-gray-100 dark:border-white/5 relative">
                                <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Activate Plan</h3>
                                <p className="text-sm text-gray-500 mt-1">Assigning subscription to <strong className="text-gray-800 dark:text-gray-200">{selectedUser?.name}</strong></p>
                            </div>

                            <form onSubmit={handleActivateSubscription} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Select Plan *</label>
                                    <select
                                        name="planId"
                                        value={subscriptionForm.planId}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-white appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">-- Choose a package --</option>
                                        {plans.map(plan => (
                                            <option key={plan._id} value={plan._id}>
                                                {plan.name} - ₹{plan.price} ({plan.durationInDays} days)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Price Paid *</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                name="pricePaid"
                                                value={subscriptionForm.pricePaid}
                                                onChange={handleFormChange}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Start Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={subscriptionForm.startDate}
                                                onChange={handleFormChange}
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">End Date *</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={subscriptionForm.endDate || ''}
                                                onChange={handleFormChange}
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Payment Method</label>
                                        <select
                                            name="paymentMethod"
                                            value={subscriptionForm.paymentMethod}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-white appearance-none"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="upi">UPI/QR Code</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={activatingId === selectedUser?._id}
                                        className="flex-[2] py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-bold text-sm shadow-md"
                                    >
                                        {activatingId === selectedUser?._id ? 'Processing...' : 'Confirm Activation'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Grace Period Modal */}
                {showGraceModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-white/10 overflow-hidden"
                        >
                            <div className="bg-purple-50 dark:bg-purple-500/10 p-6 border-b border-purple-100 dark:border-purple-500/20 relative">
                                <button onClick={() => setShowGraceModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                                    <Gift size={20} />
                                    <h3 className="text-xl font-bold">Grace Period</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Extend access temporarily for <strong className="text-gray-900 dark:text-white">{selectedUser?.name}</strong>
                                </p>
                            </div>

                            <form onSubmit={handleGrantGracePeriod} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {selectedUser?.studentDetails?.currentSubscription?.gracePeriodAllowed ? 'Total Number of Days *' : 'Number of Days *'}
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="number"
                                            value={graceDays}
                                            onChange={(e) => setGraceDays(e.target.value)}
                                            min="1"
                                            max="30"
                                            className="w-full pl-9 pr-4 py-3 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm text-gray-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {selectedUser?.studentDetails?.currentSubscription?.gracePeriodAllowed
                                            ? `Currently set to ${selectedUser.studentDetails.currentSubscription.graceDaysAllowed} total days from initial grant.`
                                            : 'These days will be deducted from their next subscription plan automatically upon payment.'}
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowGraceModal(false)}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={grantingGraceId === selectedUser?._id}
                                        className="flex-[2] py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors font-bold text-sm shadow-md"
                                    >
                                        {grantingGraceId === selectedUser?._id ? 'Granting...' : 'Confirm'}
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

export default UserSubscriptionManagement;