import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PlanManagement from '../components/PlanManagement';
import UserSubscriptionManagement from '../components/UserSubscriptionManagement';
import { toast } from 'react-toastify';
import { Settings, Users, DollarSign, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

// =====================================================
// LIBRARY ADMIN PANEL
// =====================================================
// For owners/admins to manage plans, users, subscriptions

const LibraryAdminPanel = () => {
    const { id: libraryId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('subscriptions');
    const [library, setLibrary] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user has permission
    const canAccess = user?.role === 'admin' || user?.role === 'co-admin' || user?.role === 'library_owner';

    useEffect(() => {
        if (!canAccess) {
            toast.error("You don't have permission to access this page");
            navigate('/');
            return;
        }
        // Load library details if needed
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                    <LoadingSpinner/>
                    </div>
                </div>
            </div>
        );
    }

    if (!canAccess) {
        return null;
    }

    const tabs = [
        { id: 'subscriptions', label: 'User Subscriptions', icon: Users },
        { id: 'plans', label: 'Plans Management', icon: DollarSign },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
                    >
                        <ArrowLeft size={20} />
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <Settings className="text-blue-600" size={32} />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Library Admin Panel</h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your library's subscriptions and plans</p>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 border-b dark:border-gray-700">
                    <div className="flex flex-wrap">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition ${activeTab === tab.id
                                        ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                                        : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                        }`}
                                >
                                    <Icon size={20} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'subscriptions' && (
                        <UserSubscriptionManagement libraryId={libraryId} />
                    )}
                    {activeTab === 'plans' && (
                        <PlanManagement libraryId={libraryId} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default LibraryAdminPanel;
