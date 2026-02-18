import { motion } from 'framer-motion';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 flex font-['Outfit'] relative overflow-hidden selection:bg-indigo-500/30">
            {/* Global Grain Texture - Adds that "Premium/Film" non-AI look */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
            />

            {/* Left Side - Form Section */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 lg:px-24 relative z-10 bg-gradient-to-b from-[#030712] to-[#0b0f19]">
                <div className="w-full max-w-[440px] mx-auto">
                    {/* Brand / Logo Area */}
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-12 flex items-center gap-2"
                    >
                        <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                           <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">Libro.io</span>
                    </motion.div>

                    <div className="mb-8">
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight"
                        >
                            {title}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="text-slate-400 text-base lg:text-lg leading-relaxed"
                        >
                            {subtitle}
                        </motion.p>
                    </div>

                    {children}
                </div>

                {/* Mobile Footer Gradient */}
                <div className="lg:hidden absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-indigo-900/20 to-transparent pointer-events-none" />
            </div>

            {/* Right Side - Visual Section */}
            <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-[#050914]">
                {/* Dynamic Background */}
                <div className="absolute inset-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                </div>

                {/* Abstract UI Visualization (The "Masterpiece" Element) */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
                        style={{ perspective: "1000px" }}
                        className="relative w-[600px] h-[700px] grid grid-cols-2 grid-rows-3 gap-4 p-8"
                    >
                        {/* Glass Cards mimicking a dashboard */}
                        <div className="row-span-2 col-span-1 bg-white/[0.03] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="h-2 w-24 bg-white/10 rounded-full mb-4" />
                            <div className="space-y-3">
                                {[1,2,3].map(i => (
                                    <div key={i} className="flex items-center gap-3 opacity-60">
                                        <div className="w-8 h-8 rounded-full bg-white/5" />
                                        <div className="h-2 w-full bg-white/5 rounded-full" />
                                    </div>
                                ))}
                            </div>
                             {/* Floating highlight */}
                             <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full" />
                        </div>

                        <div className="col-span-1 bg-white/[0.03] border border-white/[0.05] backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between group hover:border-white/10 transition-colors duration-500">
                             <div className="flex justify-between items-start">
                                 <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">98%</div>
                                 <div className="text-xs text-slate-500 font-mono">ATTENDANCE</div>
                             </div>
                             <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-4">
                                 <motion.div initial={{ width: 0 }} animate={{ width: "98%" }} transition={{ delay: 1, duration: 1.5 }} className="h-full bg-emerald-500/50" />
                             </div>
                        </div>

                        <div className="col-span-1 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-indigo-900/40">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full transform translate-x-10 -translate-y-10" />
                            <h3 className="text-xl font-bold text-white mb-2">Smart Library</h3>
                            <p className="text-indigo-100 text-sm leading-relaxed opacity-90">Automate seat tracking and resource distribution with AI.</p>
                        </div>

                        <div className="col-span-2 bg-white/[0.02] border border-white/[0.05] backdrop-blur-md rounded-3xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                    <span className="text-white text-xs">AI</span>
                                </div>
                                <div>
                                    <div className="h-2 w-24 bg-white/10 rounded-full mb-2" />
                                    <div className="h-2 w-16 bg-white/5 rounded-full" />
                                </div>
                            </div>
                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs text-slate-400">System Active</div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;