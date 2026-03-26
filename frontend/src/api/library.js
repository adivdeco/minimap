import axiosClient from './axiosClient';

export const addLibrary = async (libraryData) => {
    const response = await axiosClient.post('/library/add', libraryData);
    return response.data;
};

export const updateLibrary = async (id, libraryData) => {
    const response = await axiosClient.put(`/library/update/${id}`, libraryData);
    return response.data;
};

export const getAllLibraries = async (params = {}) => {
    const response = await axiosClient.get('/library/all', { params });
    return response.data;
};

export const getLibraryById = async (id) => {
    const response = await axiosClient.get(`/library/${id}`);
    return response.data;
};

export const getMyLibraries = async () => {
    const response = await axiosClient.get('/library/owner/my-libraries');
    return response.data;
};

export const getNearbyLibraries = async (longitude, latitude, maxDistance = 10000) => {
    const response = await axiosClient.get('/library/nearby', {
        params: { longitude, latitude, maxDistance }
    });
    return response.data;
};

export const deleteLibrary = async (id) => {
    const response = await axiosClient.delete(`/library/delete/${id}`);
    return response.data;
};

export const toggleLibraryStatus = async (id) => {
    const response = await axiosClient.patch(`/library/toggle-status/${id}`);
    return response.data;
};

export const rateLibrary = async (id, data) => {
    const response = await axiosClient.post(`/library/rate/${id}`, data);
    return response.data;
};

export const deleteReview = async (libraryId, reviewId) => {
    const response = await axiosClient.delete(`/library/review/${libraryId}/${reviewId}`);
    return response.data;
};

export const regenerateLibraryQR = async (id) => {
    const response = await axiosClient.patch(`/library/regenerate-qr/${id}`);
    return response.data;
};

export const getLibraryAttendanceChart = async (libraryId, month, year) => {
    const response = await axiosClient.get(`/library/${libraryId}/attendance-chart`, {
        params: { month, year }
    });
    return response.data;
};

export const getLibraryShiftAnalytics = async (libraryId, date) => {
    const response = await axiosClient.get(`/library/${libraryId}/attendance-shifts`, {
        params: { date }
    });
    return response.data;
};
