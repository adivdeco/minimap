import axiosClient from './axiosClient';

export const register = async (name, email, password) => {
    const response = await axiosClient.post('/auth/register', { name, email, password });
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

export const googleAuth = async (auth0User) => {
    const response = await axiosClient.post('/auth/google', {
        auth0Id: auth0User.sub,
        email: auth0User.email,
        name: auth0User.name,
        avatar: auth0User.picture,
        email_verified: auth0User.email_verified
    });
    if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
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
