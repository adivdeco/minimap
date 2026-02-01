import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

// Create axios instance with interceptor for auth token (if not already global)
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

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
