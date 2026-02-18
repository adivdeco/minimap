import axiosClient from './axiosClient';

// Use axiosClient instead of creating a new instance
const api = axiosClient;

export const getLibrarySeats = async (libraryId) => {
    try {
        const response = await api.get(`/seats/library/${libraryId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateSeatStatus = async (seatId, status, category) => {
    try {
        const response = await api.patch(`/seats/${seatId}`, { status, category });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const checkIn = async (qrCodeString) => {
    try {
        const response = await api.post('/entry/check-in', { qrCodeString });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const checkOut = async () => {
    try {
        const response = await api.post('/entry/check-out');
        return response.data;
    } catch (error) {
        throw error;
    }
};
