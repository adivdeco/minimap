import axiosClient from './axiosClient';

// Get all users (Admin/Co-Admin only)
export const getAllUsers = async (params = {}) => {
    const response = await axiosClient.get('/auth/users', { params });
    return response.data;
};

// Update user (Admin/Co-Admin only)
export const updateUser = async (id, userData) => {
    const response = await axiosClient.put(`/auth/users/${id}`, userData);
    return response.data;
};

// Delete user (Admin/Co-Admin only)
export const deleteUser = async (id) => {
    const response = await axiosClient.delete(`/auth/users/${id}`);
    return response.data;
};

// Update own profile
export const updateProfile = async (profileData) => {
    const response = await axiosClient.put('/auth/profile', profileData);
    return response.data;
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
    const response = await axiosClient.put('/auth/change-password', {
        currentPassword,
        newPassword
    });
    return response.data;
};
