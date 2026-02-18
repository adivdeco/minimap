import axiosClient from './axiosClient';

// Use shared axiosClient
const api = axiosClient;

// Scan QR and Check In
export const checkInUser = async (qrCodeString) => {
    const response = await api.post('/entry/check-in', { qrCodeString });
    return response.data;
};

// Activate Trial
export const activateTrialPlan = async (libraryId, planId) => {
    const response = await api.post('/entry/activate-trial', { libraryId, planId });
    return response.data;
};

// Check Out (if needed manually)
export const checkOutUser = async () => {
    const response = await api.post('/entry/check-out');
    return response.data;
};

// Get Attendance History
export const getAttendanceHistory = async () => {
    const response = await api.get('/entry/history');
    return response.data;
};

// Activate Subscription Offline (Admin/Owner only)
export const activateSubscriptionOffline = async (userId, libraryId, planId, pricePaid = 0, startDate = null) => {
    const response = await api.post('/entry/activate-subscription-offline', {
        userId,
        libraryId,
        planId,
        pricePaid,
        startDate
    });
    return response.data;
};

