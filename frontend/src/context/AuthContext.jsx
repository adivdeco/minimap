import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { logout as apiLogout, googleAuth, checkSession } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const {
        user: auth0User,
        isAuthenticated: isAuth0Authenticated,
        isLoading: auth0Loading,
        logout: auth0Logout
    } = useAuth0();

    useEffect(() => {
        // Check for existing session on mount
        const initAuth = async () => {
            try {
                const response = await checkSession();
                if (response.user) {
                    setUser(response.user);
                    localStorage.setItem('user', JSON.stringify(response.user));
                } else {
                    localStorage.removeItem('user');
                }
            } catch {
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    useEffect(() => {
        // Handle Auth0 authentication
        const handleAuth0Login = async () => {
            if (isAuth0Authenticated && auth0User && !user) {
                try {
                    const response = await googleAuth(auth0User);
                    setUser(response.user);
                } catch (error) {

                }
            }
        };

        if (!auth0Loading) {
            handleAuth0Login();
        }
    }, [isAuth0Authenticated, auth0User, auth0Loading, user]);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            // 1. Call backend logout to clear server-side session/cookie
            await apiLogout();

            // 2. Clear local state
            setUser(null);
            localStorage.removeItem('user');

            // 3. Clear Auth0 session if authenticated via Auth0
            if (isAuth0Authenticated) {
                auth0Logout({
                    logoutParams: {
                        returnTo: window.location.origin
                    }
                });
            }
        } catch (error) {

            // Fallback: still clear local state
            setUser(null);
            localStorage.removeItem('user');
        }
    };

    const checkAuth = async () => {
        try {
            const response = await checkSession();
            if (response.user) {
                setUser(response.user);
                localStorage.setItem('user', JSON.stringify(response.user));
            } else {
                setUser(null);
                localStorage.removeItem('user');
            }
        } catch (error) {

        }
    };

    const value = {
        user,
        loading: loading || auth0Loading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
