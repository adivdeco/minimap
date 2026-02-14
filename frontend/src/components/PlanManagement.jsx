import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, ShieldCheck } from 'lucide-react';
import { getLibraryPlans, createPlan, updatePlan, deletePlan } from '../api/plan';
import { toast } from 'react-toastify';

const PlanManagement = ({ libraryId }) => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        durationInDays: '',
        hoursPerDay: '',
        trialDays: '',
        description: '',
        features: '', // Comma separated for input
        isPopular: false
    });

    useEffect(() => {
        if (libraryId) fetchPlans();
    }, [libraryId]);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const data = await getLibraryPlans(libraryId);
            setPlans(data);
        } catch (error) {
            toast.error("Failed to load plans");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                libraryId,
                features: formData.features.split(',').map(f => f.trim()).filter(Boolean)
            };

            if (editingPlan) {
                await updatePlan(editingPlan._id, payload);
                toast.success("Plan updated successfully");
            } else {
                await createPlan(payload);
                toast.success("Plan created successfully");
            }

            closeModal();
            fetchPlans();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save plan");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this plan?")) return;
        try {
            await deletePlan(id);
            toast.success("Plan deleted");
            fetchPlans();
        } catch (error) {
            toast.error("Failed to delete plan");
        }
    };

    const openModal = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                price: plan.price,
                durationInDays: plan.durationInDays,
                hoursPerDay: plan.hoursPerDay || 24,
                trialDays: plan.trialDays || 0,
                description: plan.description || '',
                features: plan.features.join(', '),
                isPopular: plan.isPopular
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                price: '',
                durationInDays: '',
                hoursPerDay: '',
                trialDays: '',
                description: '',
                features: '',
                isPopular: false
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPlan(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Membership Plans</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage pricing and subscription options</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                    <Plus size={18} /> Add Plan
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading plans...</div>
            ) : plans.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
                    No plans created yet. Add one to start selling subscriptions.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map(plan => (
                        <div key={plan._id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-purple-200 dark:hover:border-purple-500 transition-all relative group">
                            {plan.isPopular && (
                                <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
                                    POPULAR
                                </div>
                            )}
                            {plan.trialDays > 0 && (
                                <div className="absolute top-0 right-16 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-b-lg">
                                    {plan.trialDays} Day Trial
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{plan.name}</h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(plan)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(plan._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-purple-600 mb-1 flex items-baseline gap-2">
                                ₹{plan.price}
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                                    / {plan.durationInDays} days • {plan.hoursPerDay || 24}h/day
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{plan.description}</p>
                            <div className="space-y-1">
                                {plan.features.slice(0, 3).map((feat, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Check size={12} className="text-green-500" /> {feat}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                {editingPlan ? 'Edit Plan' : 'New Plan'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                    placeholder="e.g. Monthly Pro"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (₹)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (Days)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        value={formData.durationInDays}
                                        onChange={e => setFormData({ ...formData, durationInDays: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours/Day</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="24"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        placeholder="24"
                                        value={formData.hoursPerDay}
                                        onChange={e => setFormData({ ...formData, hoursPerDay: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Days</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        placeholder="0 for no trial"
                                        value={formData.trialDays}
                                        onChange={e => setFormData({ ...formData, trialDays: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Features (comma separated)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                    placeholder="AC, WiFi, Locker"
                                    value={formData.features}
                                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPopular"
                                    checked={formData.isPopular}
                                    onChange={e => setFormData({ ...formData, isPopular: e.target.checked })}
                                    className="rounded text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="isPopular" className="text-sm text-gray-700 dark:text-gray-300 select-none">Mark as Popular / Recommended</label>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors mt-2"
                            >
                                {editingPlan ? 'Update Plan' : 'Create Plan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanManagement;
