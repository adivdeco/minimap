import axiosClient from './axiosClient';

export const register = async (name, email, password) => {
    const response = await axiosClient.post('/auth/register', { name, email, password });
    if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

export const verifyEmail = async (email, otp) => {
    const response = await axiosClient.post('/auth/verify-email', { email, otp });
    if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

export const login = async (email, password) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

// Social login (Google/Auth0)
export const googleAuth = async (data) => {
    // data can be { credential, clientId } (Google direct) or { auth0User } (Auth0)
    const response = await axiosClient.post('/auth/google', data);
    return response.data;
};

export const checkSession = async () => {
    const response = await axiosClient.get('/auth/check-session');
    return response.data;
};

export const logout = async () => {
    try {
        await axiosClient.post('/auth/logout');
    } catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
};

export const getStoredUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};
