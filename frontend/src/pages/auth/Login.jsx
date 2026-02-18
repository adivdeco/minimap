import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin, googleAuth } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const { loginWithRedirect, user: auth0User, isAuthenticated, isLoading } = useAuth0();

    // Handle Auth0 login success
    useEffect(() => {
        const handleAuth0Login = async () => {
            if (isAuthenticated && auth0User) {
                try {
                    setLoading(true);
                    // Standardize the user object to match what googleAuth expected, or update backend
                    // For now, let's assume we send the user profile to a new endpoint or reusing googleAuth with modification
                    // But wait, the previous googleAuth expected { credential, clientId }

                    // Since we are reverting, we need the backend to handle Auth0 profile or token.
                    // For now, let's send the user profile and let backend handle it (we'll update backend next).

                    const response = await googleAuth({ // Reusing this function name for now, but payload is distinct
                        auth0User: auth0User
                    });

                    if (response.success && response.user) {
                        login(response.user);
                        navigate('/');
                    }
                } catch (err) {
                    console.error("Auth0 Backend Sync Error:", err);
                    setError("Failed to sync with server");
                } finally {
                    setLoading(false);
                }
            }
        };

        handleAuth0Login();
    }, [isAuthenticated, auth0User, navigate, login]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiLogin(email, password);
            if (response.success && response.user) {
                login(response.user);
                navigate('/');
            } else {
                setError(response.error || 'Login failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
            <div className="w-full max-w-md">
                {/* Glass card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-gray-300">Sign in to your account</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-transparent text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    {/* Auth0 Login */}
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => loginWithRedirect()}
                            className="flex items-center justify-center w-full px-4 py-3 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-all text-sm font-medium"
                        >
                            <img src="https://cdn.auth0.com/styleguide/components/1.0.8/media/logos/img/badge.png" alt="Auth0" className="w-5 h-5 mr-3" />
                            Continue with Social Login
                        </button>
                    </div>

                    {/* Register link */}
                    <p className="mt-8 text-center text-gray-300">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
