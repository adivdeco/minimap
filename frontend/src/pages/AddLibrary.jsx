import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addLibrary } from '../api/library';
import { useAuth } from '../context/AuthContext';
import MapLocationPicker from '../components/MapLocationPicker';
import ImageUpload from './ImageUpload';

const AMENITIES_OPTIONS = [
    'High-Speed WiFi', 'AC', 'Non-AC', 'Personal Cabin',
    'CCTV', 'Power Backup', 'RO Water', 'Cafeteria',
    'Locker', 'Newspaper', 'Parking', 'Discussion Room'
];

const AddLibrary = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        libraryName: '',
        description: '',
        image: '',
        totalSeats: '',
        // Location
        longitude: '',
        latitude: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
        // Contact
        email: '',
        phone: '',
        website: '',
        // Owner
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',
        // Business Hours
        openTime: '06:00',
        closeTime: '22:00',
        is24x7: false,
        // Amenities
        amenities: [],
        // Plans
        plans: [{ title: 'Monthly', durationInDays: 30, price: '', features: [] }]
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAmenityToggle = (amenity) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    const handleLocationSelect = (position) => {
        setFormData(prev => ({
            ...prev,
            latitude: position[0].toString(),
            longitude: position[1].toString()
        }));
    };

    const handlePlanChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            plans: prev.plans.map((plan, i) =>
                i === index ? { ...plan, [field]: value } : plan
            )
        }));
    };

    const addPlan = () => {
        setFormData(prev => ({
            ...prev,
            plans: [...prev.plans, { title: '', durationInDays: 30, price: '', features: [] }]
        }));
    };

    const removePlan = (index) => {
        setFormData(prev => ({
            ...prev,
            plans: prev.plans.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const libraryPayload = {
                libraryName: formData.libraryName,
                description: formData.description,
                image: formData.image,
                totalSeats: parseInt(formData.totalSeats),
                location: {
                    coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
                    address: {
                        street: formData.street,
                        city: formData.city,
                        state: formData.state,
                        pincode: formData.pincode,
                        landmark: formData.landmark
                    }
                },
                contact: {
                    email: formData.email,
                    phone: formData.phone,
                    website: formData.website
                },
                ownerName: formData.ownerName,
                ownerEmail: formData.ownerEmail,
                ownerPhone: formData.ownerPhone,
                ownerPassword: formData.ownerPassword,
                amenities: formData.amenities,
                businessHours: {
                    open: formData.openTime,
                    close: formData.closeTime,
                    is24x7: formData.is24x7
                },
                plans: formData.plans.filter(p => p.title && p.price).map(p => ({
                    ...p,
                    price: parseFloat(p.price),
                    durationInDays: parseInt(p.durationInDays)
                }))
            };

            const response = await addLibrary(libraryPayload);
            setSuccess('Library added successfully!');
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add library');
        } finally {
            setLoading(false);
        }
    };

    // Check if user has permission
    if (user?.role !== 'admin' && user?.role !== 'co-admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f0f]">
                <div className="text-center text-gray-900 dark:text-white">
                    <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-400">Only Admin and Co-Admin can add libraries.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] py-8 px-4 transition-colors duration-200">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-4 flex items-center gap-2 font-medium"
                    >
                        ← Back to Home
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Library</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Fill in the details to register a new library</p>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-200">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/50 rounded-lg text-green-700 dark:text-green-200">
                        {success}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Library Name *</label>
                                <input
                                    type="text"
                                    name="libraryName"
                                    value={formData.libraryName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="Enter library name"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="Brief description of the library"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <div className="p-4 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5">
                                    <ImageUpload 
                                        label="Library Showcase Image" 
                                        onUploadSuccess={(data) => setFormData(prev => ({ ...prev, image: data.url }))} 
                                        onUploadingStateChange={setIsUploadingImage}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Seats *</label>
                                <input
                                    type="number"
                                    name="totalSeats"
                                    value={formData.totalSeats}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="50"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Location</h2>

                        {/* Interactive Map */}
                        <MapLocationPicker onLocationSelect={handleLocationSelect} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-white/10">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Longitude *</label>
                                <input
                                    type="text"
                                    name="longitude"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="77.5946"
                                    required
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Latitude *</label>
                                <input
                                    type="text"
                                    name="latitude"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="12.9716"
                                    required
                                    readOnly
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Street Address</label>
                                <input
                                    type="text"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="123 Main Street"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="Bangalore"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State *</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="Karnataka"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pincode *</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="560001"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Landmark</label>
                                <input
                                    type="text"
                                    name="landmark"
                                    value={formData.landmark}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="Near Metro Station"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    {/* (Similar styling for remaining sections) */}
                    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="9876543210"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="library@example.com"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website</label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="https://library.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Owner Details */}
                    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Library Owner Details</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">If owner doesn't exist, a new account will be created</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Owner Name</label>
                                <input
                                    type="text"
                                    name="ownerName"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Owner Email</label>
                                <input
                                    type="email"
                                    name="ownerEmail"
                                    value={formData.ownerEmail}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="owner@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Owner Phone</label>
                                <input
                                    type="tel"
                                    name="ownerPhone"
                                    value={formData.ownerPhone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Owner Password (for new accounts)</label>
                                <input
                                    type="password"
                                    name="ownerPassword"
                                    value={formData.ownerPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Business Hours */}
                    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Business Hours</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Open Time</label>
                                <input
                                    type="time"
                                    name="openTime"
                                    value={formData.openTime}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Close Time</label>
                                <input
                                    type="time"
                                    name="closeTime"
                                    value={formData.closeTime}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is24x7"
                                        checked={formData.is24x7}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-purple-600 focus:ring-purple-500 transition-colors"
                                    />
                                    <span className="text-gray-700 dark:text-gray-200">Open 24x7</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Amenities */}
                    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Amenities</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {AMENITIES_OPTIONS.map(amenity => (
                                <label
                                    key={amenity}
                                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.amenities.includes(amenity)
                                        ? 'bg-purple-50 dark:bg-purple-500/20 border-purple-500 text-purple-700 dark:text-white'
                                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-purple-300 dark:hover:border-white/30'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.amenities.includes(amenity)}
                                        onChange={() => handleAmenityToggle(amenity)}
                                        className="hidden"
                                    />
                                    <span className="text-sm">{amenity}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Plans */}
                    <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pricing Plans</h2>
                            <button
                                type="button"
                                onClick={addPlan}
                                className="px-4 py-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-all font-medium"
                            >
                                + Add Plan
                            </button>
                        </div>
                        <div className="space-y-4">
                            {formData.plans.map((plan, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan Title</label>
                                        <input
                                            type="text"
                                            value={plan.title}
                                            onChange={(e) => handlePlanChange(index, 'title', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                            placeholder="Monthly"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (days)</label>
                                        <input
                                            type="number"
                                            value={plan.durationInDays}
                                            onChange={(e) => handlePlanChange(index, 'durationInDays', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                            placeholder="30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price (₹)</label>
                                        <input
                                            type="number"
                                            value={plan.price}
                                            onChange={(e) => handlePlanChange(index, 'price', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                            placeholder="1500"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        {formData.plans.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removePlan(index)}
                                                className="px-4 py-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-all font-medium"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || isUploadingImage}
                        className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-[#0f0f0f] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                        {loading || isUploadingImage ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                {isUploadingImage ? 'Waiting for Image Upload...' : 'Adding Library...'}
                            </span>
                        ) : (
                            'Add Library'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddLibrary;
