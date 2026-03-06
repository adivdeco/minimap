import React from 'react';
import { motion } from 'framer-motion';
import { Armchair, LibraryBig, MapPin, LogOut, QrCode } from 'lucide-react';
import CountdownTimer from '../CountdownTimer';

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const ActiveSessionCard = ({
    activeSeat,
    libraryName,
    libraryAddress,
    checkingOut,
    handleCheckOut,
    setShowScanner
}) => {
    return (
        <motion.div variants={itemVariants} className="lg:col-span-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative h-full bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl p-8 flex flex-col justify-between overflow-hidden shadow-xl dark:shadow-none">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 p-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border-2 shadow-2xl ${activeSeat ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-600/10 border-green-500/30' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                            {activeSeat ? (
                                <div className="text-center">
                                    <div className="text-xs text-green-600 dark:text-green-400 uppercase font-bold tracking-wider mb-1">Seat</div>
                                    <div className="text-4xl font-bold text-gray-900 dark:text-white">{activeSeat.seatNumber}</div>
                                </div>
                            ) : (
                                <Armchair size={36} className="text-gray-400 dark:text-gray-600" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${activeSeat ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {activeSeat ? "Session Active" : "No Active Session"}
                                </h2>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <LibraryBig size={16} className="text-purple-600 dark:text-purple-400" />
                                {libraryName || "Select a library to begin"}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <MapPin size={16} className="text-purple-600 dark:text-purple-400" />
                                {libraryAddress?.state ? `${libraryAddress.state}, ${libraryAddress.city}` : 'No location selected'}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        {activeSeat ? (
                            <button
                                onClick={handleCheckOut}
                                disabled={checkingOut}
                                className="relative overflow-hidden px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all group"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {checkingOut ? 'Processing...' : 'End Session'}
                                    <LogOut size={18} />
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowScanner(true)}
                                className="relative px-8 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            >
                                <QrCode size={20} />
                                Scan to Enter
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom Info Bar */}
                {activeSeat && activeSeat.expectedEndTime && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center gap-8">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Remaining Time</p>
                            <div className="text-xl text-black font-mono dark:text-gray-100">
                                <CountdownTimer targetDate={activeSeat.expectedEndTime} />
                            </div>
                        </div>
                        <div >
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Check-in Time</p>
                            <p className="text-xl text-black font-mono dark:text-gray-100">
                                {new Date(activeSeat.startTime || new Date()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ActiveSessionCard;
