import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Get plans for a library
export const getLibraryPlans = async (libraryId) => {
    try {
        const response = await api.get(`/plans/library/${libraryId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Create a plan
export const createPlan = async (planData) => {
    try {
        const response = await api.post('/plans', planData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Update a plan
export const updatePlan = async (id, planData) => {
    try {
        const response = await api.put(`/plans/${id}`, planData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Delete a plan
export const deletePlan = async (id) => {
    try {
        const response = await api.delete(`/plans/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
