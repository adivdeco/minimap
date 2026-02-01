// import React, { useState, useRef, useEffect } from 'react';
// import {
//     User,
//     Armchair,
//     ZoomIn,
//     ZoomOut,
//     MapPin
// } from 'lucide-react';

// const UserSeatMap = ({ seats, activeSeatId }) => {
//     const [zoom, setZoom] = useState(1);
//     const containerRef = useRef(null);
//     const [canvasHeight, setCanvasHeight] = useState(600);

//     // Auto-adjust height based on seat positions
//     useEffect(() => {
//         if (!seats || seats.length === 0) return;
//         const maxSeatY = Math.max(0, ...seats.map(s => s.y || 0));
//         if (maxSeatY + 150 > canvasHeight) {
//             setCanvasHeight(maxSeatY + 200);
//         }
//     }, [seats]);

//     const getStatusStyles = (status, isMySeat) => {
//         if (isMySeat) return 'bg-purple-600 border-purple-800 text-white ring-4 ring-purple-400/50 z-20 shadow-xl scale-110';

//         switch (status) {
//             // case 'Available':
//             //     return 'bg-white border-green-500 text-green-700 hover:bg-green-50';
//             // case 'Occupied':
//             //     return 'bg-red-50 border-red-500 text-red-700 opacity-80';
//             // case 'Reserved':
//             //     return 'bg-blue-50 border-blue-500 text-blue-700 opacity-80';
//             case 'Maintenance':
//                 return 'bg-gray-100 border-gray-400 text-gray-400 cursor-not-allowed opacity-60';
//             default:
//                 return 'bg-white border-gray-200 text-gray-600';
//         }
//     };

//     return (
//         <div className="flex flex-col gap-4">
//             {/* Toolbar */}
//             <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
//                 <div className="flex items-center gap-4">
//                     <div className="flex items-center gap-2">
//                         <div className="w-4 h-4 rounded bg-purple-600 border border-purple-800"></div>
//                         <span className="text-white text-xs font-medium">Your Seat</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <div className="w-4 h-4 rounded bg-white border border-green-500"></div>
//                         <span className="text-gray-300 text-xs">Available</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <div className="w-4 h-4 rounded bg-red-50 border border-red-500"></div>
//                         <span className="text-gray-300 text-xs">Occupied</span>
//                     </div>
//                 </div>

//                 {/* Zoom Controls */}
//                 <div className="flex items-center bg-white/10 rounded-lg p-1 border border-white/20">
//                     <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-white/10 rounded-md text-white transition">
//                         <ZoomOut size={16} />
//                     </button>
//                     <span className="text-xs font-mono w-12 text-center text-white">{(zoom * 100).toFixed(0)}%</span>
//                     <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1.5 hover:bg-white/10 rounded-md text-white transition">
//                         <ZoomIn size={16} />
//                     </button>
//                 </div>
//             </div>

//             {/* Map Container */}
//             <div className="relative w-full overflow-auto bg-slate-900/50 border border-white/10 rounded-2xl shadow-inner scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent h-[600px]">
//                 <div
//                     ref={containerRef}
//                     className="relative origin-top-left transition-transform duration-200 ease-out"
//                     style={{
//                         height: `${canvasHeight}px`,
//                         width: '1000px', // Standard width basis
//                         transform: `scale(${zoom})`,
//                         backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
//                         backgroundSize: '20px 20px'
//                     }}
//                 >
//                     {seats.map((seat) => {
//                         const isMySeat = activeSeatId && seat._id.toString() === activeSeatId.toString();

//                         return (
//                             <div
//                                 key={seat._id}
//                                 className={`
//                                     absolute w-12 h-12 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center select-none
//                                     transition-all duration-200
//                                     ${getStatusStyles(seat.status, isMySeat)}
//                                 `}
//                                 style={{
//                                     left: seat.x || 0,
//                                     top: seat.y || 0
//                                 }}
//                             >
//                                 <span className="text-[9px] font-bold uppercase opacity-80 leading-none mb-0.5 max-w-full truncate px-1">
//                                     {seat.category?.slice(0, 4)}
//                                 </span>
//                                 <span className="text-sm font-extrabold leading-none">{seat.seatNumber}</span>

//                                 {isMySeat && (
//                                     <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
//                                         <div className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap animate-bounce">
//                                             You
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>
//                         );
//                     })}

//                     {seats.length === 0 && (
//                         <div className="absolute inset-0 flex items-center justify-center text-gray-500">
//                             <div className="text-center">
//                                 <Armchair className="mx-auto mb-2 opacity-20" size={48} />
//                                 <p>No seats available to view.</p>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <p className="text-xs text-center text-gray-500">
//                 You can scroll or pinch to verify your location on the map.
//             </p>
//         </div>
//     );
// };

// export default UserSeatMap;

import React, { useState, useRef, useEffect } from 'react';
import { Armchair, ZoomIn, ZoomOut, User } from 'lucide-react';

const UserSeatMap = ({ seats, activeSeatId }) => {
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef(null);
    const [canvasHeight, setCanvasHeight] = useState(600);

    // Auto-adjust height based on seat positions
    useEffect(() => {
        if (!seats || seats.length === 0) return;
        const maxSeatY = Math.max(0, ...seats.map(s => s.y || 0));
        if (maxSeatY + 150 > canvasHeight) {
            setCanvasHeight(maxSeatY + 200);
        }
    }, [seats]);

    const getStatusStyles = (status, isMySeat) => {
        if (isMySeat) {
            return 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] z-20 scale-110 ring-2 ring-indigo-400/30';
        }

        switch (status) {
            case 'Maintenance':
                return 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed';
            // case 'Available': // Uncomment if you track available explicitly
            //    return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20';
            default: // Occupied or Standard
                return 'bg-slate-800 border-slate-700 text-slate-500';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Control Bar (HUD Style) */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/40 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-lg">
                
                {/* Legend */}
                <div className="flex items-center gap-6 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                        <span className="text-indigo-200 text-xs font-medium tracking-wide">Your Seat</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600"></div>
                        <span className="text-slate-400 text-xs font-medium tracking-wide">Occupied</span>
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 mt-3 sm:mt-0 bg-black/20 rounded-xl p-1 border border-white/5">
                    <button 
                        onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} 
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <span className="text-xs font-mono w-10 text-center text-slate-300">{(zoom * 100).toFixed(0)}%</span>
                    <button 
                        onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} 
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                    >
                        <ZoomIn size={14} />
                    </button>
                </div>
            </div>

            {/* Map Canvas */}
            <div className="relative w-full overflow-hidden bg-[#0f172a] border border-slate-800/60 rounded-3xl shadow-2xl h-[600px] group">
                
                {/* Technical Grid Background */}
                <div className="absolute inset-0 pointer-events-none opacity-20" 
                     style={{ 
                         backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
                         backgroundSize: '40px 40px' 
                     }}>
                </div>

                <div className="w-full h-full overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50">
                    <div
                        ref={containerRef}
                        className="relative origin-top-left transition-transform duration-300 ease-out"
                        style={{
                            height: `${canvasHeight}px`,
                            width: '1000px',
                            transform: `scale(${zoom})`,
                        }}
                    >
                        {seats.map((seat) => {
                            const isMySeat = activeSeatId && seat._id.toString() === activeSeatId.toString();

                            return (
                                <div
                                    key={seat._id}
                                    className={`
                                        absolute w-12 h-12 rounded-xl border flex flex-col items-center justify-center select-none
                                        transition-all duration-300
                                        ${getStatusStyles(seat.status, isMySeat)}
                                    `}
                                    style={{
                                        left: seat.x || 0,
                                        top: seat.y || 0
                                    }}
                                >
                                    <span className="text-[8px] font-bold uppercase opacity-60 leading-none mb-1 max-w-full truncate px-1 tracking-wider">
                                        {seat.category?.slice(0, 3)}
                                    </span>
                                    <span className="text-sm font-bold leading-none font-mono">
                                        {seat.seatNumber}
                                    </span>

                                    {isMySeat && (
                                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                                            <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap mb-1">
                                                You
                                            </div>
                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-indigo-600"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {seats.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                                <Armchair className="mb-4 opacity-20" size={64} strokeWidth={1} />
                                <p className="text-sm font-light tracking-widest uppercase">Map Unavailable</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-xs text-center text-slate-500 font-light tracking-wide">
                Use pinch gestures or scroll to navigate the floor plan
            </p>
        </div>
    );
};

export default UserSeatMap;