import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { 
    User, 
    Armchair, 
    Save, 
    ZoomIn, 
    ZoomOut, 
    Maximize,
    Grid3X3
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

// --- SUB-COMPONENT: DRAGGABLE SEAT ---
const DraggableSeat = ({ seat, position, onDrag, isEditMode, onUpdate, scale }) => {
    const nodeRef = useRef(null);

    // Position priority: Local State -> DB Value -> Default 0
    const currentX = position?.x ?? seat.x ?? 0;
    const currentY = position?.y ?? seat.y ?? 0;

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Available': 
                return 'bg-white border-green-500 text-green-700 hover:bg-green-50 ring-green-200';
            case 'Occupied': 
                return 'bg-red-50 border-red-500 text-red-700 ring-red-200';
            case 'Reserved': 
                return 'bg-blue-50 border-blue-500 text-blue-700 ring-blue-200';
            case 'Maintenance': 
                return 'bg-gray-100 border-gray-400 text-gray-400 cursor-not-allowed';
            default: 
                return 'bg-white border-gray-200 text-gray-600';
        }
    };

    return (
        <Draggable
            position={{ x: currentX, y: currentY }}
            // Grid snapping: Moves in 10px increments for easier alignment
            grid={[10, 10]} 
            scale={scale} // Important for dragging correctly while zoomed
            onStop={(e, data) => onDrag(e, data, seat._id)}
            disabled={!isEditMode}
            bounds="parent"
            nodeRef={nodeRef}
        >
            <div
                ref={nodeRef}
                // touch-none prevents mobile scrolling while dragging this element
                className={`
                    absolute w-12 h-12 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center select-none z-10 touch-none
                    transition-colors duration-200
                    ${getStatusStyles(seat.status)}
                    ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:ring-2' : 'cursor-pointer hover:scale-105'}
                `}
                onClick={(e) => {
                    // Prevent click trigger after a drag
                    if (!isEditMode) onUpdate(seat);
                }}
                style={{ 
                    transition: isEditMode ? 'none' : 'transform 0.2s, background-color 0.2s' 
                }}
            >
                {/* Seat Icon / Number */}
                <span className="text-[9px] font-bold uppercase opacity-60 leading-none mb-0.5 max-w-full truncate px-1">
                    {seat.category?.slice(0, 4)}
                </span>
                <span className="text-sm font-extrabold leading-none">{seat.seatNumber}</span>

                {/* Status Indicator Icon */}
                {seat.status === 'Occupied' && (
                    <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 border border-red-200 shadow-sm">
                        <User size={12} />
                    </div>
                )}
            </div>
        </Draggable>
    );
};

// --- MAIN COMPONENT ---
const SeatCanvas = ({ seats, libraryId, onUpdate, isOwner, refreshSeats, isEditMode, setIsEditMode }) => {
    const [positions, setPositions] = useState({});
    const [saving, setSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef(null);
    
    // Dynamic Canvas Height
    const [canvasHeight, setCanvasHeight] = useState(600);

    // Auto-expand height if seats are out of bounds
    useEffect(() => {
        const maxSeatY = Math.max(0, ...seats.map(s => s.y || 0));
        if (maxSeatY + 100 > canvasHeight) {
            setCanvasHeight(maxSeatY + 150);
        }
    }, [seats]);

    const handleDrag = (e, data, seatId) => {
        setPositions(prev => ({
            ...prev,
            [seatId]: { x: data.x, y: data.y }
        }));
    };

    const saveLayout = async () => {
        setSaving(true);
        try {
            const updates = seats.map(seat => {
                const pos = positions[seat._id];
                return {
                    id: seat._id,
                    x: pos ? pos.x : (seat.x || 0),
                    y: pos ? pos.y : (seat.y || 0)
                };
            });

            await axios.put(`${API_URL}/seats/positions`, { positions: updates }, { withCredentials: true });
            toast.success("Layout saved successfully!");
            setIsEditMode(false);
            setPositions({}); // Clear local state after save
            refreshSeats();
        } catch (err) {
            console.error("Save failed", err);
            toast.error("Failed to save layout");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-8 flex flex-col gap-4">
            
            {/* --- TOOLBAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                
                {/* Title & Zoom Controls */}
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        <Armchair className="text-blue-600" size={24} />
                        <span className="hidden sm:inline">Floor Plan</span>
                    </h2>

                    {/* Zoom Tools */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition">
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-xs font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition">
                            <ZoomIn size={18} />
                        </button>
                    </div>
                </div>

                {/* Edit Controls (Only for Owner) */}
                {isOwner && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        {isEditMode ? (
                            <>
                                {/* Height Adjuster */}
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                    <Maximize size={14} className="text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase">H:</span>
                                    <input
                                        type="number"
                                        min="600"
                                        step="50"
                                        value={canvasHeight}
                                        onChange={(e) => setCanvasHeight(Math.max(600, Number(e.target.value)))}
                                        className="w-16 text-sm bg-transparent border-none focus:ring-0 p-0 text-gray-700 font-mono"
                                    />
                                    <span className="text-xs text-gray-400">px</span>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsEditMode(false);
                                        setPositions({}); // Reset unsaved drags
                                    }}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveLayout}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm flex items-center gap-2 transition"
                                >
                                    <Save size={16} />
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition"
                            >
                                <Grid3X3 size={16} />
                                Edit Layout
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* --- CANVAS CONTAINER --- */}
            {/* overflow-auto creates the scrollable window for mobile */}
            <div className="relative w-full overflow-auto bg-slate-100 border-2 border-gray-200 rounded-2xl shadow-inner scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent h-[70vh]">
                
                {/* The Actual Scalable Canvas */}
                <div
                    ref={containerRef}
                    className={`
                      relative origin-top-left transition-all duration-200 ease-out
                      ${isEditMode ? 'bg-white' : ''}
                    `}
                    style={{
                        height: `${canvasHeight}px`,
                        // We assume a standard width of 1000px for the layout logic
                        // The user scrolls if their screen is smaller
                        width: '1000px', 
                        transform: `scale(${zoom})`,
                        backgroundImage: isEditMode 
                            ? 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)' 
                            : 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                        backgroundSize: isEditMode ? '20px 20px' : '20px 20px'
                    }}
                >
                    {seats.map((seat) => (
                        <DraggableSeat
                            key={seat._id}
                            seat={seat}
                            position={positions[seat._id]}
                            onDrag={handleDrag}
                            isEditMode={isEditMode}
                            onUpdate={onUpdate}
                            scale={zoom} // Pass zoom scale to draggable to fix cursor speed
                        />
                    ))}

                    {seats.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                            <div className="text-center">
                                <Armchair className="mx-auto mb-2 opacity-20" size={48} />
                                <p>No seats configured.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-xs text-center text-gray-500">
                {isEditMode
                    ? "Drag seats to arrange (snaps to grid). Use Zoom to see more area."
                    : "Pinch or scroll to move around the map. Click a seat for details."}
            </p>
        </div>
    );
};

export default SeatCanvas;