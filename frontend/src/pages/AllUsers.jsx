import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from 'react-toastify';
import * as axiosClient from "../api/users"; // Using the existing API helper we created or adaptable
import { UserUpdateSchema } from "../api/userValidationSchema";
import { useAuth } from "../context/AuthContext";
import ImageUpload from "./ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";


function AllUsers() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Pagination (Backend support required, assuming API supports it or we client-side paginate for now if not)
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

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage]);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter]);

    const fetchUsers = async (page = 1) => {
        try {
            setLoading(true);
            const response = await axiosClient.getAllUsers();
            // Our backend `allUsers` implementation DOES support page/limit (Line 253 of authController). Good.

            if (response.users) {
                setUsers(response.users);
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages);
                }
            } else {
                // Fallback if structure is different
                setUsers(Array.isArray(response) ? response : []);
            }

        } catch (error) {

            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;

        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.phone?.includes(searchTerm)
            );
        }

        if (roleFilter !== "all") {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        setFilteredUsers(filtered);
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await axiosClient.deleteUser(userToDelete._id);
            setUsers(users.filter(user => user._id !== userToDelete._id));
            setShowDeleteModal(false);
            setUserToDelete(null);
            toast.success("User deleted successfully");
        } catch (error) {

            toast.error("Failed to delete user");
        }
    };

    const handleUserClick = (user) => {
        setSelectedUser(selectedUser?._id === user._id ? null : user);
    };

    const handleUpdateClick = (user) => {
        setSelectedUser(user);
        reset();

        setValue("name", user.name || "");
        setValue("email", user.email || "");
        setValue("phone", user.phone || "");
        setValue("role", user.role || "User");
        setValue("avatar", user.avatar || "");

        // Set address fields from the first address if available
        const mainAddress = user.addresses && user.addresses.length > 0 ? user.addresses[0] : {};
        setValue("address.street", mainAddress.street || "");
        setValue("address.city", mainAddress.city || "");
        setValue("address.state", mainAddress.state || "");
        setValue("address.pincode", mainAddress.pincode || "");
        setValue("address.country", mainAddress.country || "");

        // Set Library Owner details
        if (user.role === 'library_owner' && user.libraryOwnerDetails) {
            setValue("libraryOwnerDetails.gstNumber", user.libraryOwnerDetails.gstNumber || "");
            setValue("libraryOwnerDetails.businessPan", user.libraryOwnerDetails.businessPan || "");
        }

        // Set Student/Sub details (Admin Override)
        if (user.studentDetails) {
            const sub = user.studentDetails.currentSubscription || {};
            const seat = user.studentDetails.assignedSeat || {};

            setValue("studentDetails.currentSubscription.status", sub.status || "pending");
            setValue("studentDetails.currentSubscription.planId", sub.planId ? (typeof sub.planId === 'object' ? sub.planId._id : sub.planId) : ""); // Handle populated vs raw ID

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

            // Transform address back to array format expected by backend
            const addressData = {
                ...data.address,
                label: 'home',
                isDefault: true
            };

            const updatePayload = {
                ...data,
                addresses: [addressData], // Replace/Update addresses
                avatar: avatarUrl || data.avatar
            };

            // Using api/users.js helper
            const response = await axiosClient.updateUser(selectedUser._id, updatePayload);

            toast.success('User updated successfully');
            setShowUpdateModal(false);
            fetchUsers(); // Refresh list
            setAvatarUrl('');

        } catch (error) {

            toast.error(error.response?.data?.message || "Failed to update user");
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-red-100 text-red-800 border-red-200';
            case 'co-admin': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'library_owner': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'User': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
 <LoadingSpinner/>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <ToastContainer position="top-right" theme="colored" />

            <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600 mt-2">Manage all registered users in the system</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
                            <input
                                type="text"
                                placeholder="Search by name, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="co-admin">Co-Admin</option>
                                <option value="library_owner">Library Owner</option>
                                <option value="User">User</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Results</label>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="text-gray-900 font-semibold">{filteredUsers.length} found</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No users found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <div key={user._id} className="hover:bg-gray-50 transition-colors">
                                    <div className="p-6 cursor-pointer" onClick={() => handleUserClick(user)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-shrink-0">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover border" />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-lg">
                                                            {user.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                                                            {user.role}
                                                        </span>
                                                        <span className="text-sm text-gray-500">{user.email}</span>
                                                        <span className="text-sm text-gray-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateClick(user); }}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}
                                                    className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded View */}
                                    {selectedUser?._id === user._id && (
                                        <div className="px-6 pb-6 bg-gray-50 border-t border-gray-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                                                <div>
                                                    <h4 className="font-semibold mb-2">Contact Info</h4>
                                                    <p className="text-sm text-gray-600">Phone: {user.phone || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2">Address</h4>
                                                    {user.addresses?.[0] ? (
                                                        <p className="text-sm text-gray-600">
                                                            {user.addresses[0].street}, {user.addresses[0].city}, {user.addresses[0].state} - {user.addresses[0].pincode}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-gray-600">No address provided</p>
                                                    )}
                                                </div>
                                                {user.role === 'library_owner' && user.libraryOwnerDetails && (
                                                    <div>
                                                        <h4 className="font-semibold mb-2">Business Details</h4>
                                                        <p className="text-sm text-gray-600">GST: {user.libraryOwnerDetails.gstNumber || 'N/A'}</p>
                                                        <p className="text-sm text-gray-600">PAN: {user.libraryOwnerDetails.businessPan || 'N/A'}</p>
                                                    </div>
                                                )}

                                                {/* Subscription & Seat Info (Enhanced View) */}
                                                <div>
                                                    <h4 className="font-semibold mb-2">Subscription & Access</h4>
                                                    {user.studentDetails?.currentSubscription ? (
                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <p><span className="font-medium">Library:</span> {user.studentDetails.currentSubscription.libraryId?.libraryName || 'None'}</p>
                                                            <p>
                                                                <span className="font-medium">Status:</span>
                                                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs uppercase font-bold ${user.studentDetails.currentSubscription.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                        user.studentDetails.currentSubscription.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                                                                    }`}>
                                                                    {user.studentDetails.currentSubscription.status}
                                                                </span>
                                                            </p>
                                                            <p><span className="font-medium">Expires:</span> {user.studentDetails.currentSubscription.expiryDate ? new Date(user.studentDetails.currentSubscription.expiryDate).toLocaleDateString() : 'N/A'}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-400">No active subscription</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold mb-2">Assigned Seat</h4>
                                                    {user.studentDetails?.assignedSeat?.seatNumber ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-2xl font-bold text-purple-600">{user.studentDetails.assignedSeat.seatNumber}</span>
                                                            {user.studentDetails.assignedSeat.checkInTime && (
                                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Checked In</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-400">No seat assigned</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Controls could go here */}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete {userToDelete?.name}? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Update User</h3>
                            <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit(handleUpdateSubmit)} className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input {...register("name")} className="w-full p-2 border rounded-lg" />
                                    {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input {...register("email")} className="w-full p-2 border rounded-lg" />
                                    {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input {...register("phone")} className="w-full p-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select {...register("role")} className="w-full p-2 border rounded-lg">
                                        <option value="User">User</option>
                                        <option value="co-admin">Co-Admin</option>
                                        <option value="library_owner">Library Owner</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">Address</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input {...register("address.street")} placeholder="Street" className="p-2 border rounded-lg" />
                                    <input {...register("address.city")} placeholder="City" className="p-2 border rounded-lg" />
                                    <input {...register("address.state")} placeholder="State" className="p-2 border rounded-lg" />
                                    <input {...register("address.pincode")} placeholder="Pincode" className="p-2 border rounded-lg" />
                                </div>
                            </div>

                            {/* Library Owner Details */}
                            {watchedRole === 'library_owner' && (
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3">Library Owner Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input {...register("libraryOwnerDetails.gstNumber")} placeholder="GST Number" className="p-2 border rounded-lg" />
                                        <input {...register("libraryOwnerDetails.businessPan")} placeholder="Business PAN" className="p-2 border rounded-lg" />
                                    </div>
                                </div>
                            )}

                            {/* ADMIN OVERRIDE SECTION */}
                            {(currentUser?.role === 'admin' || currentUser?.role === 'co-admin') && (
                                <div className="border-t pt-4 bg-red-50 p-4 rounded-xl border-red-100">
                                    <h4 className="font-semibold mb-3 text-red-800 flex items-center gap-2">
                                        Admin Override: Subscription & Access
                                        <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">Dangerous</span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-red-700 mb-1">Sub. Status</label>
                                            <select {...register("studentDetails.currentSubscription.status")} className="w-full p-2 border border-red-200 rounded-lg bg-white">
                                                <option value="pending">Pending</option>
                                                <option value="active">Active</option>
                                                <option value="expired">Expired</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-red-700 mb-1">Plan ID (Raw)</label>
                                            <input {...register("studentDetails.currentSubscription.planId")} placeholder="Plan Object ID" className="w-full p-2 border border-red-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-red-700 mb-1">Start Date</label>
                                            <input type="date" {...register("studentDetails.currentSubscription.startDate")} className="w-full p-2 border border-red-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-red-700 mb-1">Expiry Date</label>
                                            <input type="date" {...register("studentDetails.currentSubscription.expiryDate")} className="w-full p-2 border border-red-200 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-red-700 mb-1">Seat Number</label>
                                            <input {...register("studentDetails.assignedSeat.seatNumber")} placeholder="e.g. A-101" className="w-full p-2 border border-red-200 rounded-lg" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-red-600 mt-2">
                                        * Changing these values directly updates the DB without logic checks. Ensure Seat/Plan IDs are valid.
                                    </p>
                                </div>
                            )}

                            {/* Avatar */}
                            <div className="border-t pt-4">
                                <ImageUpload onAvatarUpdate={handleAvatarUpdate} />
                            </div>

                            <div className="flex gap-4 pt-4 border-t">
                                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                                    {isSubmitting ? "Updating..." : "Update User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AllUsers;
