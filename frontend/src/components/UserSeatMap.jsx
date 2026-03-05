import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
    Armchair, ZoomIn, ZoomOut, User, Move,
    RotateCcw, MapPin, Info
} from 'lucide-react';

const UserSeatMap = ({ seats, activeSeatId }) => {
    const { theme } = useTheme();
    // --- Viewport State ---
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Calculate canvas boundaries based on seats
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

    useEffect(() => {
        if (!seats || seats.length === 0) return;
        const maxX = Math.max(0, ...seats.map(s => s.x || 0));
        const maxY = Math.max(0, ...seats.map(s => s.y || 0));
        setCanvasSize({
            width: Math.max(1200, maxX + 300),
            height: Math.max(800, maxY + 300)
        });
    }, [seats]);

    // --- Pan & Zoom Handlers ---
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        containerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
    };

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.min(Math.max(0.5, scale + delta), 2);
            setScale(newScale);
        }
    };

    const resetView = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // --- Styling Logic ---
    const getSeatStyles = (seat, isMySeat) => {
        // Base seat shape styling
        const base = "absolute rounded-lg flex flex-col items-center justify-center transition-all duration-300 shadow-sm";
        const size = "w-12 h-12";

        if (isMySeat) {
            return `${base} ${size} bg-indigo-600 border border-indigo-400 text-white z-20 shadow-[0_0_20px_rgba(79,70,229,0.6)]`;
        }

        switch (seat.status) {
            case 'Maintenance':
                return `${base} ${size} bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-700 cursor-not-allowed`;
            case 'Occupied': // Since we only show layout, occupied might look different
                return `${base} ${size} bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-500`;
            default: // Available/Standard
                return `${base} ${size} bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-600/50 text-gray-400 dark:text-slate-400 hover:border-purple-500 hover:text-purple-500 hover:bg-gray-50 dark:hover:bg-slate-700`;
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full">

            {/* --- HUD: Controls & Legend --- */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 bg-white dark:bg-[#0F0F12] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl transition-colors">

                {/* Legend */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">You</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-600"></div>
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Taken</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600"></div>
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Empty</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-gray-200 dark:border-white/5 backdrop-blur-sm">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <ZoomOut size={16} />
                    </button>
                    <span className="w-12 text-center text-xs font-mono text-gray-500 dark:text-gray-400">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(2, s + 0.2))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <ZoomIn size={16} />
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-1"></div>
                    <button onClick={resetView} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Reset View">
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            {/* --- THE CANVAS --- */}
            <div
                className="relative w-full h-[600px] bg-gray-50 dark:bg-[#050505] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl group transition-colors"
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: 'grab' }}
            >
                {/* Architectural Grid Pattern */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, ${theme === 'dark' ? '#333' : '#e5e7eb'} 1px, transparent 1px),
                            linear-gradient(to bottom, ${theme === 'dark' ? '#333' : '#e5e7eb'} 1px, transparent 1px)
                        `,
                        backgroundSize: `${40 * scale}px ${40 * scale}px`,
                        backgroundPosition: `${position.x}px ${position.y}px` // Sync grid with pan
                    }}
                />

                {/* Movable Container */}
                <div
                    className="absolute origin-top-left transition-transform duration-75 ease-linear will-change-transform"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        width: canvasSize.width,
                        height: canvasSize.height,
                    }}
                >
                    {seats.map((seat) => {
                        const isMySeat = activeSeatId && seat._id.toString() === activeSeatId.toString();

                        return (
                            <div
                                key={seat._id}
                                className={`group/seat ${getSeatStyles(seat, isMySeat)}`}
                                style={{
                                    left: seat.x,
                                    top: seat.y,
                                }}
                            >
                                {/* Seat Number */}
                                <span className="text-[10px] font-mono font-bold">{seat.seatNumber}</span>

                                {/* Furniture Detail (Armrests) */}
                                <div className={`absolute -left-1 w-1 h-8 rounded-l-sm ${isMySeat ? 'bg-indigo-500' : 'bg-white/10'}`}></div>
                                <div className={`absolute -right-1 w-1 h-8 rounded-r-sm ${isMySeat ? 'bg-indigo-500' : 'bg-white/10'}`}></div>

                                {/* "MY SEAT" Beacon Animation */}
                                {isMySeat && (
                                    <>
                                        <div className="absolute -inset-4 rounded-full border border-indigo-500/30 animate-[ping_3s_ease-in-out_infinite]"></div>
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 animate-bounce">
                                            <div className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                                                You are here
                                            </div>
                                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-indigo-600"></div>
                                        </div>
                                    </>
                                )}

                                {/* Hover Tooltip (Only visible on hover) */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max bg-gray-900 text-white text-xs px-3 py-2 rounded-lg border border-white/10 opacity-0 group-hover/seat:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                    <div className="font-bold mb-0.5">Seat {seat.seatNumber}</div>
                                    <div className="text-gray-400 capitalize text-[10px]">{seat.category || 'Standard'}</div>
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-b border-r border-white/10 rotate-45"></div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty State */}
                    {seats.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Armchair size={32} className="text-gray-400 dark:text-gray-600" />
                            </div>
                            <p className="text-gray-500 font-medium">No floor plan available</p>
                        </div>
                    )}
                </div>
            </div>

            <p className="flex items-center justify-center gap-2 text-xs text-gray-500 font-mono opacity-60">
                <Move size={12} />
                <span>Click & Drag to Pan</span>
                <span className="mx-2">•</span>
                <span>Scroll to Zoom</span>
            </p>
        </div>
    );
};

export default React.memo(UserSeatMap);