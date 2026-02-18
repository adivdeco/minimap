import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as apiRegister, googleAuth } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { motion } from 'framer-motion';
import AuthLayout from '../../components/layout/AuthLayout';
import { Loader, ArrowRight } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const { loginWithRedirect } = useAuth0();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await apiRegister(name, email, password);
            if (response.user) {
                login(response.user);
                navigate('/');
            } else {
                setError(response.message || 'Registration failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome"
            subtitle="Create your account"
        >
            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-3"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <p className="text-red-400 text-xs font-medium">{error}</p>
                </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <button
                        type="button"
                        onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
                        className="w-full py-2.5 px-4 bg-[#1C1F26] hover:bg-[#252932] border border-slate-800 rounded-md text-slate-200 font-medium transition-all duration-200 flex items-center justify-center gap-2 group hover:border-slate-700 hover:text-white"
                    >
                        <img src="https://cdn.auth0.com/styleguide/components/1.0.8/media/logos/img/badge.png" alt="Auth0" className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm">Sign up with Google</span>
                    </button>
                </motion.div>

                <div className="flex items-center gap-3 my-6">
                    <div className="h-px bg-slate-800 flex-1" />
                    <span className="text-slate-600 text-xs font-medium uppercase tracking-wider">Or</span>
                    <div className="h-px bg-slate-800 flex-1" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0F1117] border border-slate-800 rounded-md text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 sm:text-sm"
                        placeholder="John Doe"
                        required
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Work Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0F1117] border border-slate-800 rounded-md text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 sm:text-sm"
                        placeholder="name@company.com"
                        required
                    />
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#0F1117] border border-slate-800 rounded-md text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 sm:text-sm"
                            placeholder="At least 6 characters"
                            required
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#0F1117] border border-slate-800 rounded-md text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 sm:text-sm"
                            placeholder="Confirm password"
                            required
                        />
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="pt-2"
                >
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0F1117] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                Create Account <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>
                </motion.div>
            </form>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-8 text-center text-slate-500 text-sm"
            >
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline">
                    Log in
                </Link>
            </motion.p>
        </AuthLayout>
    );
};

export default Register;
