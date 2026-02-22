import React, { useState, useEffect } from 'react';
import { getNotices, createNotice, updateNotice, deleteNotice } from '../api/notice';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Power, AlertCircle, Clock, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NoticeManagement = ({ libraryId }) => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        priority: 'normal',
        isActive: true
    });

    useEffect(() => {
        fetchNotices();
    }, [libraryId]);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            const data = await getNotices(libraryId);
            setNotices(data.notices);
        } catch (error) {
            toast.error("Failed to load notices");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingNotice) {
                await updateNotice(editingNotice._id, formData);
                toast.success("Notice updated successfully");
            } else {
                await createNotice({ ...formData, libraryId });
                toast.success("Notice created successfully");
            }
            fetchNotices();
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.msg || "Failed to save notice");
        }
    };

    const handleToggleStatus = async (noticeId, currentStatus) => {
        try {
            await updateNotice(noticeId, { isActive: !currentStatus });
            setNotices(notices.map(n => n._id === noticeId ? { ...n, isActive: !currentStatus } : n));
            toast.success(`Notice marked as ${!currentStatus ? 'Active' : 'Inactive'}`);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (noticeId) => {
        if (!window.confirm("Are you sure you want to delete this notice?")) return;
        try {
            await deleteNotice(noticeId);
            setNotices(notices.filter(n => n._id !== noticeId));
            toast.success("Notice deleted successfully");
        } catch (error) {
            toast.error("Failed to delete notice");
        }
    };

    const openEditModal = (notice) => {
        setEditingNotice(notice);
        setFormData({
            title: notice.title,
            message: notice.message,
            priority: notice.priority,
            isActive: notice.isActive
        });
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setEditingNotice(null);
        setFormData({ title: '', message: '', priority: 'normal', isActive: true });
        setIsAddModalOpen(false);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500/10 text-red-600 border-red-500/20';
            case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
            case 'low': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
            default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        }
    };

    const filteredNotices = notices.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-[#0F0F12] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search notices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                </div>
                <button
                    onClick={() => { closeModal(); setIsAddModalOpen(true); }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                >
                    <Plus size={18} /> Create Notice
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredNotices.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#0F0F12] rounded-3xl border border-dashed border-gray-300 dark:border-white/10">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Notices Found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Create an announcement to keep your students informed.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {filteredNotices.map((notice) => (
                            <motion.div
                                key={notice._id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`bg-white dark:bg-[#0F0F12] p-5 rounded-2xl border transition-all ${notice.isActive ? 'border-gray-200 dark:border-white/10 shadow-sm' : 'border-dashed border-gray-300 dark:border-white/5 opacity-75'
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <h3 className={`text-lg font-bold ${notice.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 line-through'}`}>
                                                {notice.title}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${getPriorityColor(notice.priority)}`}>
                                                {notice.priority}
                                            </span>
                                            {!notice.isActive && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{notice.message}</p>
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-400 dark:text-gray-500">
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={14} /> {new Date(notice.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-white/5 pt-4 sm:pt-0 sm:pl-4">
                                        <button
                                            onClick={() => handleToggleStatus(notice._id, notice.isActive)}
                                            className={`p-2 rounded-xl flex items-center justify-center transition-colors ${notice.isActive
                                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20'
                                                : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20'
                                                }`}
                                            title={notice.isActive ? "Deactivate" : "Activate"}
                                        >
                                            <Power size={18} />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(notice)}
                                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors flex items-center justify-center"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(notice._id)}
                                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#18181B] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/10">
                                <h2 className="text-xl font-bold">{editingNotice ? 'Edit Notice' : 'Create New Notice'}</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                        placeholder="E.g., Library closed tomorrow"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                        rows="4"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                                        placeholder="Detailed description of the announcement..."
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                                        <select
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                        >
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-center pt-6">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="isActive"
                                                checked={formData.isActive}
                                                onChange={handleInputChange}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Active Status</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
                                    >
                                        {editingNotice ? 'Save Changes' : 'Post Notice'}
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

export default NoticeManagement;
