import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLibraryById, updateLibrary } from '../api/library';
import { useAuth } from '../context/AuthContext';
import PrintQrComponent from '../components/qrCodeData';
import SeatManagement from '../components/SeatManagement';
import PlanManagement from '../components/PlanManagement';

const AMENITIES_OPTIONS = [
    'High-Speed WiFi', 'AC', 'Non-AC', 'Personal Cabin',
    'CCTV', 'Power Backup', 'RO Water', 'Cafeteria',
    'Locker', 'Newspaper', 'Parking', 'Discussion Room'
];

const EditLibrary = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [library, setLibrary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        libraryName: '',
        description: '',
        totalSeats: '',
        longitude: '',
        latitude: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
        email: '',
        phone: '',
        website: '',
        openTime: '06:00',
        closeTime: '22:00',
        is24x7: false,
        amenities: []
    });

    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const response = await getLibraryById(id);
                const lib = response.library;
                setLibrary(lib);

                setFormData({
                    libraryName: lib.libraryName || '',
                    description: lib.description || '',
                    totalSeats: lib.totalSeats || '',
                    longitude: lib.location?.coordinates?.[0] || '',
                    latitude: lib.location?.coordinates?.[1] || '',
                    street: lib.location?.address?.street || '',
                    city: lib.location?.address?.city || '',
                    state: lib.location?.address?.state || '',
                    pincode: lib.location?.address?.pincode || '',
                    landmark: lib.location?.address?.landmark || '',
                    email: lib.contact?.email || '',
                    phone: lib.contact?.phone || '',
                    website: lib.contact?.website || '',
                    openTime: lib.businessHours?.open || '06:00',
                    closeTime: lib.businessHours?.close || '22:00',
                    is24x7: lib.businessHours?.is24x7 || false,
                    amenities: lib.amenities || []
                });
            } catch (err) {
                setError('Failed to load library');
            } finally {
                setLoading(false);
            }
        };
        fetchLibrary();
    }, [id]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const updatePayload = {
                libraryName: formData.libraryName,
                description: formData.description,
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
                amenities: formData.amenities,
                businessHours: {
                    open: formData.openTime,
                    close: formData.closeTime,
                    is24x7: formData.is24x7
                }
            };

            await updateLibrary(id, updatePayload);
            setSuccess('Library updated successfully!');
            // setTimeout(() => navigate('/libraries'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update library');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <button
                        onClick={() => navigate(user?.role === 'library_owner' ? '/my-libraries' : '/libraries')}
                        className="text-purple-400 hover:text-purple-300 mb-4"
                    >
                        ← Back to {user?.role === 'library_owner' ? 'My Libraries' : 'Libraries'}
                    </button>
                    <h1 className="text-3xl font-bold text-white">Edit Library</h1>
                </div>

                {error && <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
                {success && <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">{success}</div>}

                {/* QR Code Management */}
                <div className="mb-8">
                    <PrintQrComponent
                        library={library}
                        onUpdate={(newConfig) => setLibrary(prev => ({ ...prev, accessConfig: newConfig }))}
                    />
                </div>

                {/* Seat Management */}
                <div className="mb-8">
                    <SeatManagement libraryId={id} />
                </div>

                {/* Plan Management (NEW) */}
                <div className="mb-8">
                    <PlanManagement libraryId={id} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-200 mb-2">Library Name</label>
                                <input type="text" name="libraryName" value={formData.libraryName} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-200 mb-2">Description</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Total Seats
                                    {user?.role === 'library_owner' && <span className="text-xs text-gray-400 ml-2">(Contact Admin to change)</span>}
                                </label>
                                <input type="number" name="totalSeats" value={formData.totalSeats} onChange={handleChange}
                                    disabled={user?.role === 'library_owner'}
                                    className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${user?.role === 'library_owner' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    required />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Location</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Longitude</label>
                                <input type="text" name="longitude" value={formData.longitude} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Latitude</label>
                                <input type="text" name="latitude" value={formData.latitude} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-200 mb-2">Street</label>
                                <input type="text" name="street" value={formData.street} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">City</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">State</label>
                                <input type="text" name="state" value={formData.state} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Pincode</label>
                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Landmark</label>
                                <input type="text" name="landmark" value={formData.landmark} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Phone</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-200 mb-2">Website</label>
                                <input type="url" name="website" value={formData.website} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                        </div>
                    </div>

                    {/* Business Hours */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Business Hours</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Open Time</label>
                                <input type="time" name="openTime" value={formData.openTime} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">Close Time</label>
                                <input type="time" name="closeTime" value={formData.closeTime} onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="flex items-center">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name="is24x7" checked={formData.is24x7} onChange={handleChange}
                                        className="w-5 h-5 rounded bg-white/5 border-white/10 text-purple-500" />
                                    <span className="text-gray-200">Open 24x7</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Amenities */}
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Amenities</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {AMENITIES_OPTIONS.map(amenity => (
                                <label key={amenity} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.amenities.includes(amenity) ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-gray-300'
                                    }`}>
                                    <input type="checkbox" checked={formData.amenities.includes(amenity)} onChange={() => handleAmenityToggle(amenity)} className="hidden" />
                                    <span className="text-sm">{amenity}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Update Library'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditLibrary;
