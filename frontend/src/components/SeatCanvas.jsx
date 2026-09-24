import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import {
    User,
    Armchair,
    Save,
    ZoomIn,
    ZoomOut,
    Maximize,
    Grid3X3,
    Plus,
    DoorOpen,
    LogOut,
    Bath,
    GlassWater,
    ConciergeBell,
    PanelTop,
    Minus,
    RotateCw,
    RotateCcw,
    Type,
    Trash2,
    Layers
} from 'lucide-react';
import { toast } from 'react-toastify';
import axiosClient from '../api/axiosClient';
import {
    getFloorElements,
    addFloorElement,
    updateFloorElementPositions,
    deleteFloorElement
} from '../api/floorElement';
import FloorElementRenderer, { ELEMENT_CONFIG } from './FloorElementRenderer';

// --- Element Palette Config ---
const PALETTE_ITEMS = [
    { type: 'wall', label: 'Wall', icon: Minus, desc: 'Solid wall segment' },
    { type: 'entrance', label: 'Entrance', icon: DoorOpen, desc: 'Entry door' },
    { type: 'exit', label: 'Exit', icon: LogOut, desc: 'Exit door' },
    { type: 'bathroom', label: 'Bathroom', icon: Bath, desc: 'Restroom' },
    { type: 'water-cooler', label: 'Water', icon: GlassWater, desc: 'Drinking water' },
    { type: 'reception', label: 'Reception', icon: ConciergeBell, desc: 'Front desk' },
    { type: 'window', label: 'Window', icon: PanelTop, desc: 'Glass window' },
    { type: 'label', label: 'Label', icon: Type, desc: 'Text label' },
];

// --- SUB-COMPONENT: DRAGGABLE SEAT ---
const DraggableSeat = ({ seat, position, onDrag, isEditMode, onUpdate, scale }) => {
    const nodeRef = useRef(null);

    // Position priority: Local State -> DB Value -> Default 0
    const currentX = position?.x ?? seat.x ?? 0;
    const currentY = position?.y ?? seat.y ?? 0;

    const getStatusStyles = (seat) => {
        if (seat.status === 'Occupied' && seat.reservedBy) {
            return 'bg-purple-100 border-purple-500 text-purple-800 ring-purple-200';
        }
        switch (seat.status) {
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
                    ${getStatusStyles(seat)}
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
                    <div className={`absolute -top-2 -right-2 rounded-full p-0.5 border shadow-sm ${seat.reservedBy ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                        <User size={12} />
                    </div>
                )}
                {seat.status === 'Reserved' && (
                    <div className="absolute -top-2 -right-2 bg-blue-100 text-blue-600 rounded-full p-0.5 border border-blue-200 shadow-sm">
                        <User size={12} />
                    </div>
                )}
            </div>
        </Draggable>
    );
};

// --- SUB-COMPONENT: DRAGGABLE FLOOR ELEMENT ---
const DraggableFloorElement = ({ element, position, onDrag, isEditMode, onDelete, onRotate, localRotation, onResize, localSize, scale }) => {
    const nodeRef = useRef(null);

    const currentX = position?.x ?? element.x ?? 0;
    const currentY = position?.y ?? element.y ?? 0;

    // Use local rotation if changed, otherwise DB value
    const currentRotation = localRotation !== undefined ? localRotation : (element.rotation || 0);

    // Use local size if changed, otherwise DB value
    const config = ELEMENT_CONFIG[element.type];
    const currentWidth = localSize?.width ?? element.width ?? config?.defaultWidth ?? 80;
    const currentHeight = localSize?.height ?? element.height ?? config?.defaultHeight ?? 20;

    return (
        <Draggable
            position={{ x: currentX, y: currentY }}
            grid={[10, 10]}
            scale={scale}
            onStop={(e, data) => onDrag(e, data, element._id)}
            disabled={!isEditMode}
            bounds="parent"
            nodeRef={nodeRef}
        >
            <div
                ref={nodeRef}
                className={`absolute touch-none select-none group/wrapper ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ zIndex: 5 }}
            >
                <FloorElementRenderer
                    element={{ ...element, x: 0, y: 0, rotation: currentRotation, width: currentWidth, height: currentHeight }}
                    isEditMode={isEditMode}
                    onDelete={onDelete}
                />

                {/* --- EDIT CONTROLS (visible on hover in edit mode) --- */}
                {isEditMode && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/wrapper:opacity-100 transition-opacity z-50">

                        {/* Rotation Controls */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onRotate(element._id, -45); }}
                            className="w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
                            title="Rotate left 45°"
                        >
                            <RotateCcw size={10} />
                        </button>
                        <span className="text-[8px] font-mono text-gray-400 w-6 text-center select-none">
                            {currentRotation}°
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRotate(element._id, 45); }}
                            className="w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
                            title="Rotate right 45°"
                        >
                            <RotateCw size={10} />
                        </button>

                        {/* Divider */}
                        <div className="w-px h-4 bg-gray-200 mx-0.5" />

                        {/* Width Controls */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onResize(element._id, 'width', -10); }}
                            className="w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm"
                            title="Decrease width"
                        >
                            <Minus size={9} />
                        </button>
                        <span className="text-[8px] font-mono text-gray-400 select-none" title="Width × Height">
                            {currentWidth}×{currentHeight}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onResize(element._id, 'width', 10); }}
                            className="w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm"
                            title="Increase width"
                        >
                            <Plus size={9} />
                        </button>

                        {/* Divider */}
                        <div className="w-px h-4 bg-gray-200 mx-0.5" />

                        {/* Height Controls */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onResize(element._id, 'height', -4); }}
                            className="w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center text-orange-400 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm"
                            title="Decrease height"
                        >
                            <Minus size={9} />
                        </button>
                        <span className="text-[8px] font-mono text-orange-400 select-none">H</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onResize(element._id, 'height', 4); }}
                            className="w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center text-orange-400 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm"
                            title="Increase height"
                        >
                            <Plus size={9} />
                        </button>
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

    // Floor Elements State
    const [floorElements, setFloorElements] = useState([]);
    const [elementPositions, setElementPositions] = useState({});
    const [elementRotations, setElementRotations] = useState({});
    const [elementSizes, setElementSizes] = useState({});
    const [showPalette, setShowPalette] = useState(false);
    const [addingLabel, setAddingLabel] = useState(false);
    const [labelText, setLabelText] = useState('');

    // Fetch floor elements
    const fetchFloorElements = async () => {
        try {
            const data = await getFloorElements(libraryId);
            setFloorElements(data);
        } catch (err) {
            // Silently fail — elements are supplementary
            console.error('Failed to load floor elements:', err);
        }
    };

    useEffect(() => {
        if (libraryId) fetchFloorElements();
    }, [libraryId]);

    // Auto-expand height if seats are out of bounds
    useEffect(() => {
        const maxSeatY = Math.max(0, ...seats.map(s => s.y || 0));
        const maxElementY = Math.max(0, ...floorElements.map(e => e.y || 0));
        const maxY = Math.max(maxSeatY, maxElementY);
        if (maxY + 100 > canvasHeight) {
            setCanvasHeight(maxY + 150);
        }
    }, [seats, floorElements]);

    const handleDrag = (e, data, seatId) => {
        setPositions(prev => ({
            ...prev,
            [seatId]: { x: data.x, y: data.y }
        }));
    };

    const handleElementDrag = (e, data, elementId) => {
        setElementPositions(prev => ({
            ...prev,
            [elementId]: { x: data.x, y: data.y }
        }));
    };

    // Add a floor element
    const handleAddElement = async (type) => {
        if (type === 'label') {
            setAddingLabel(true);
            return;
        }
        try {
            const config = ELEMENT_CONFIG[type];
            const newElement = await addFloorElement({
                libraryId,
                type,
                x: 50,
                y: 50,
                width: config.defaultWidth,
                height: config.defaultHeight,
            });
            setFloorElements(prev => [...prev, newElement]);
            toast.success(`${config.label} added to floor plan`);
        } catch (err) {
            toast.error('Failed to add element');
        }
    };

    const handleAddLabel = async () => {
        if (!labelText.trim()) {
            toast.error('Please enter a label text');
            return;
        }
        try {
            const config = ELEMENT_CONFIG['label'];
            const newElement = await addFloorElement({
                libraryId,
                type: 'label',
                x: 50,
                y: 50,
                width: config.defaultWidth,
                height: config.defaultHeight,
                label: labelText.trim(),
            });
            setFloorElements(prev => [...prev, newElement]);
            setAddingLabel(false);
            setLabelText('');
            toast.success('Label added');
        } catch (err) {
            toast.error('Failed to add label');
        }
    };

    // Rotate a floor element (local state, saved on Save)
    const handleRotateElement = (elementId, degrees) => {
        setElementRotations(prev => {
            const current = prev[elementId] !== undefined
                ? prev[elementId]
                : (floorElements.find(e => e._id === elementId)?.rotation || 0);
            const newRotation = ((current + degrees) % 360 + 360) % 360; // Normalize to 0-359
            return { ...prev, [elementId]: newRotation };
        });
    };

    // Resize a floor element (local state, saved on Save)
    const handleResizeElement = (elementId, dimension, delta) => {
        setElementSizes(prev => {
            const el = floorElements.find(e => e._id === elementId);
            const config = ELEMENT_CONFIG[el?.type];
            const current = prev[elementId] || {
                width: el?.width ?? config?.defaultWidth ?? 80,
                height: el?.height ?? config?.defaultHeight ?? 20,
            };
            const minW = 20;
            const minH = 8;
            return {
                ...prev,
                [elementId]: {
                    width: dimension === 'width' ? Math.max(minW, current.width + delta) : current.width,
                    height: dimension === 'height' ? Math.max(minH, current.height + delta) : current.height,
                }
            };
        });
    };

    // Delete a floor element
    const handleDeleteElement = async (elementId) => {
        try {
            await deleteFloorElement(elementId);
            setFloorElements(prev => prev.filter(e => e._id !== elementId));
            const newPositions = { ...elementPositions };
            delete newPositions[elementId];
            setElementPositions(newPositions);
            const newRotations = { ...elementRotations };
            delete newRotations[elementId];
            setElementRotations(newRotations);
            const newSizes = { ...elementSizes };
            delete newSizes[elementId];
            setElementSizes(newSizes);
            toast.success('Element removed');
        } catch (err) {
            toast.error('Failed to delete element');
        }
    };

    const saveLayout = async () => {
        setSaving(true);
        try {
            // Save seat positions
            const seatUpdates = seats.map(seat => {
                const pos = positions[seat._id];
                return {
                    id: seat._id,
                    x: pos ? pos.x : (seat.x || 0),
                    y: pos ? pos.y : (seat.y || 0)
                };
            });

            await axiosClient.put('/seats/positions', { positions: seatUpdates });

            // Save floor element positions + rotations
            // Include any element that had a position OR rotation change
            const changedElementIds = new Set([
                ...Object.keys(elementPositions),
                ...Object.keys(elementRotations),
                ...Object.keys(elementSizes),
            ]);

            const elementsWithChanges = floorElements
                .filter(el => changedElementIds.has(el._id))
                .map(el => {
                    const pos = elementPositions[el._id];
                    const rot = elementRotations[el._id];
                    const sz = elementSizes[el._id];
                    return {
                        id: el._id,
                        x: pos ? pos.x : (el.x || 0),
                        y: pos ? pos.y : (el.y || 0),
                        width: sz ? sz.width : (el.width || ELEMENT_CONFIG[el.type]?.defaultWidth || 80),
                        height: sz ? sz.height : (el.height || ELEMENT_CONFIG[el.type]?.defaultHeight || 20),
                        rotation: rot !== undefined ? rot : (el.rotation || 0),
                        label: el.label,
                    };
                });

            if (elementsWithChanges.length > 0) {
                await updateFloorElementPositions(elementsWithChanges);
            }

            toast.success("Layout saved successfully!");
            setIsEditMode(false);
            setPositions({});
            setElementPositions({});
            setElementRotations({});
            setElementSizes({});
            setShowPalette(false);
            refreshSeats();
            fetchFloorElements();
        } catch (err) {
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
                                {/* Element Palette Toggle */}
                                <button
                                    onClick={() => setShowPalette(!showPalette)}
                                    className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition border ${showPalette
                                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    <Layers size={16} />
                                    <span className="hidden sm:inline">Elements</span>
                                </button>

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
                                        setElementPositions({});
                                        setElementRotations({});
                                        setElementSizes({});
                                        setShowPalette(false);
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

            {/* --- ELEMENT PALETTE (shown in edit mode) --- */}
            {isEditMode && showPalette && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Plus size={16} className="text-indigo-500" />
                            Add Floor Elements
                        </h3>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Click to place on canvas</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {PALETTE_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.type}
                                    onClick={() => handleAddElement(item.type)}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                        <Icon size={16} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-600 group-hover:text-indigo-700 transition-colors">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Label Input Popup */}
                    {addingLabel && (
                        <div className="mt-3 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <Type size={16} className="text-gray-400 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Enter label text (e.g., 'Section A', 'Quiet Zone')"
                                value={labelText}
                                onChange={(e) => setLabelText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                                className="flex-1 text-sm bg-transparent border-none focus:ring-0 p-0 text-gray-700 placeholder:text-gray-400"
                                autoFocus
                            />
                            <button
                                onClick={handleAddLabel}
                                className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => { setAddingLabel(false); setLabelText(''); }}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}

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
                    {/* --- FLOOR ELEMENTS (Rendered below seats) --- */}
                    {floorElements.map((element) => (
                        <DraggableFloorElement
                            key={element._id}
                            element={element}
                            position={elementPositions[element._id]}
                            onDrag={handleElementDrag}
                            isEditMode={isEditMode}
                            onDelete={handleDeleteElement}
                            onRotate={handleRotateElement}
                            localRotation={elementRotations[element._id]}
                            onResize={handleResizeElement}
                            localSize={elementSizes[element._id]}
                            scale={zoom}
                        />
                    ))}

                    {/* --- SEATS (Rendered above floor elements) --- */}
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

                    {seats.length === 0 && floorElements.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                            <div className="text-center">
                                <Armchair className="mx-auto mb-2 opacity-20" size={48} />
                                <p>No seats configured.</p>
                                {isOwner && <p className="text-xs mt-1">Click "Edit Layout" to start designing your floor plan.</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- FLOOR PLAN LEGEND --- */}
            {floorElements.length > 0 && !isEditMode && (
                <div className="flex flex-wrap items-center justify-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2">Legend:</span>
                    {[
                        { color: 'bg-slate-700', label: 'Wall' },
                        { color: 'bg-emerald-400', label: 'Entrance' },
                        { color: 'bg-orange-400', label: 'Exit' },
                        { color: 'bg-sky-400', label: 'Bathroom' },
                        { color: 'bg-cyan-400', label: 'Water' },
                        { color: 'bg-amber-400', label: 'Reception' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                            <span className="text-[10px] font-semibold text-gray-500">{item.label}</span>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-center text-gray-500">
                {isEditMode
                    ? "Drag seats & elements to arrange. Use the Elements palette to add walls, doors & more."
                    : "Pinch or scroll to move around the map. Click a seat for details."}
            </p>
        </div>
    );
};

export default SeatCanvas;