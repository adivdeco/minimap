import axiosClient from './axiosClient';

// Get all system configurations (Admin/Co-Admin)
export const getSystemConfig = async () => {
    const response = await axiosClient.get('/admin/config');
    return response.data;
};

// Update system configurations in bulk (Admin/Co-Admin)
export const updateSystemConfig = async (updates) => {
    const response = await axiosClient.put('/admin/config', { updates });
    return response.data;
};

// Get system health and resource metrics (Admin/Co-Admin)
export const getSystemHealth = async () => {
    const response = await axiosClient.get('/admin/health');
    return response.data;
};

// Get rate limit violations and API analytics (Admin/Co-Admin)
export const getRateLimitAnalytics = async () => {
    const response = await axiosClient.get('/admin/rate-limits');
    return response.data;
};

// Block IP Address (Admin/Co-Admin)
export const blockIP = async (ip) => {
    const response = await axiosClient.post('/admin/ip-blacklist/block', { ip });
    return response.data;
};

// Unblock IP Address (Admin/Co-Admin)
export const unblockIP = async (ip) => {
    const response = await axiosClient.post('/admin/ip-blacklist/unblock', { ip });
    return response.data;
};

// Lock/suspend user account (Admin/Co-Admin)
export const lockUser = async (id) => {
    const response = await axiosClient.post(`/admin/users/${id}/lock`);
    return response.data;
};

// Unlock/restore user account (Admin/Co-Admin)
export const unlockUser = async (id) => {
    const response = await axiosClient.post(`/admin/users/${id}/unlock`);
    return response.data;
};

// Clear API & rate limit logs (Admin/Co-Admin)
export const clearApiLogs = async () => {
    const response = await axiosClient.delete('/admin/rate-limits/clear');
    return response.data;
};
