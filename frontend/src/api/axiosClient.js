import axios from "axios";

const axiosClient = axios.create({
    // baseURL: 'http://localhost:5003/api',
    baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5003/api').trim(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - clear local state
            console.log('Session expired or invalid');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
