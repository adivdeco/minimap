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
export const activateSubscriptionOffline = async (userId, libraryId, planId, pricePaid = 0, startDate = null, endDate = null) => {
    const response = await api.post('/entry/activate-subscription-offline', {
        userId,
        libraryId,
        planId,
        pricePaid,
        startDate,
        endDate
    });
    return response.data;
};

// Grant Grace Period (Admin/Owner only)
export const grantGracePeriod = async (libraryId, subscriptionId, graceDays) => {
    const response = await api.post(`/entry/grant-grace-period/${libraryId}/${subscriptionId}`, {
        graceDays
    });
    return response.data;
};

// Delete/Cancel Subscription (Admin/Owner only)
export const deleteSubscription = async (libraryId, subscriptionId) => {
    const response = await api.delete(`/entry/subscription/${libraryId}/${subscriptionId}`);
    return response.data;
};

