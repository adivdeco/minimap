import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { activateSubscriptionOffline } from '../api/entry';
import { getLibraryPlans } from '../api/plan';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-toastify';
import { Plus, Search, Calendar, DollarSign, Mail, Phone, Clock, User } from 'lucide-react';

// =====================================================
// USER SUBSCRIPTION MANAGEMENT - FOR OFFLINE PAYMENTS
// =====================================================
// Admin/Library Owner can manually activate subscriptions for users
// (For cash/offline payments)

const UserSubscriptionManagement = ({ libraryId }) => {
    const { user: currentUser } = useAuth();

    // State
    const [users, setUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [subscriptionForm, setSubscriptionForm] = useState({
        planId: '',
        pricePaid: '',
        startDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash'
    });
    const [activatingId, setActivatingId] = useState(null);

    // Check authorization
    const canManageSubscriptions = currentUser?.role === 'admin' ||
        currentUser?.role === 'library_owner';

    useEffect(() => {
        if (libraryId && canManageSubscriptions) {
            fetchLibraryUsers();
            fetchPlans();
        }
    }, [libraryId, canManageSubscriptions]);

    // Fetch users in library
    const fetchLibraryUsers = async () => {
        try {
            setLoading(true);
            // Get all users and filter by library subscriptions/access
            const response = await axiosClient.get(`/library/${libraryId}/users`);

            // Backend returns { users: [...], ... } with a custom structure
            const rawUsers = response.data?.users || (Array.isArray(response.data) ? response.data : []);

            // Map the response to match the User model structure expected by the component
            const mappedUsers = rawUsers.map(u => {
                // If it's already in the expected format (has _id and name), return as is
                if (u._id && u.name) return u;

                // Otherwise map from the specific getLibraryUsers structure
                return {
                    _id: u.userId,
                    name: u.userName,
                    email: u.email,
                    phone: u.phone,
                    // Map subscription details to studentDetails.currentSubscription
                    studentDetails: {
                        currentSubscription: u.subscription
                    },
                    // Preserve other fields
                    ...u
                };
            });

            setUsers(mappedUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
            // Fallback: try to get all users
            try {
                // Correct endpoint based on authRoutes.js: /api/auth/users
                const allUsersResponse = await axiosClient.get('/auth/users').catch(() => null);

                if (allUsersResponse) {
                    const fallbackList = allUsersResponse.data?.users || (Array.isArray(allUsersResponse.data) ? allUsersResponse.data : []);
                    setUsers(fallbackList);
                } else {
                    setUsers([]);
                }
            } catch (err) {
                console.error("Fallback fetch failed", err);
                toast.error("Failed to load users");
                setUsers([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch available plans
    const fetchPlans = async () => {
        try {
            const response = await getLibraryPlans(libraryId);
            setPlans(response);
        } catch (error) {
            console.error("Error fetching plans:", error);
            toast.error("Failed to load plans");
        }
    };

    // Open modal for subscription activation
    const openActivationModal = (user) => {
        setSelectedUser(user);
        setSubscriptionForm({
            planId: '',
            pricePaid: '',
            startDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'cash'
        });
        setShowModal(true);
    };

    // Handle subscription form change
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setSubscriptionForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Activate subscription offline
    const handleActivateSubscription = async (e) => {
        e.preventDefault();

        if (!subscriptionForm.planId) {
            toast.error("Please select a plan");
            return;
        }

        if (!subscriptionForm.pricePaid && subscriptionForm.pricePaid !== 0) {
            toast.error("Please enter price paid");
            return;
        }

        try {
            setActivatingId(selectedUser._id);

            const response = await activateSubscriptionOffline(
                selectedUser._id,
                libraryId,
                subscriptionForm.planId,
                parseFloat(subscriptionForm.pricePaid),
                subscriptionForm.startDate
            );

            if (response.success) {
                toast.success(`Subscription activated for ${selectedUser.name}`);
                setShowModal(false);
                fetchLibraryUsers(); // Refresh list
            } else {
                toast.error(response.msg || "Failed to activate subscription");
            }
        } catch (error) {
            console.error("Error activating subscription:", error);
            toast.error(error.response?.data?.msg || "Failed to activate subscription");
        } finally {
            setActivatingId(null);
        }
    };

    // Filter users
    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    );

    if (!canManageSubscriptions) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-red-700">
                    You don't have permission to manage subscriptions. Only admins and library owners can access this.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full p-6">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User size={28} className="text-blue-600" />
                    Manual Subscription Activation (Offline Payment)
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Activate subscriptions for users who paid offline/cash</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {users.length === 0 ? 'No users found' : 'No matching users found'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Current Subscription</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredUsers.map((user) => {
                                    const subscription = user.studentDetails?.currentSubscription;
                                    const isActive = subscription?.status === 'active' &&
                                        new Date(subscription.expiryDate) > new Date();

                                    return (
                                        <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Mail size={16} />
                                                    {user.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Phone size={16} />
                                                    {user.phone || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isActive ? (
                                                    <div>
                                                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center gap-1 w-fit">
                                                            <Clock size={14} />
                                                            Active
                                                        </span>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Expires: {new Date(subscription.expiryDate).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                                                        No Active Subscription
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {!isActive ? (
                                                    <button
                                                        onClick={() => openActivationModal(user)}
                                                        disabled={activatingId === user._id}
                                                        className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
                                                    >
                                                        <Plus size={16} />
                                                        {activatingId === user._id ? 'Activating...' : 'Activate'}
                                                    </button>
                                                ) : (
                                                    <span className="text-sm text-gray-500">Active</span>
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

            {/* Activation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Activate Subscription
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            For: <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
                        </p>

                        <form onSubmit={handleActivateSubscription} className="space-y-4">
                            {/* Plan Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Select Plan *
                                </label>
                                <select
                                    name="planId"
                                    value={subscriptionForm.planId}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                >
                                    <option value="">-- Choose a plan --</option>
                                    {plans.map(plan => (
                                        <option key={plan._id} value={plan._id}>
                                            {plan.name} - ${plan.price} ({plan.durationInDays} days)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Price Paid */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <DollarSign className="inline mr-1" size={16} />
                                    Price Paid *
                                </label>
                                <input
                                    type="number"
                                    name="pricePaid"
                                    value={subscriptionForm.pricePaid}
                                    onChange={handleFormChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Calendar className="inline mr-1" size={16} />
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={subscriptionForm.startDate}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Payment Method
                                </label>
                                <select
                                    name="paymentMethod"
                                    value={subscriptionForm.paymentMethod}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={activatingId === selectedUser?._id}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
                                >
                                    {activatingId === selectedUser?._id ? 'Activating...' : 'Activate Subscription'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserSubscriptionManagement;
