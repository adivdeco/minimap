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
    Copy,
    X,
    SlidersHorizontal,
    Sparkles,
    Check
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
const DraggableSeat = ({ seat, position, onDrag, isEditMode, onUpdate, onSelect, isSelected, scale }) => {
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
            grid={[10, 10]}
            scale={scale}
            onStart={() => {
                if (isEditMode && onSelect) onSelect(seat._id);
            }}
            onStop={(e, data) => onDrag(e, data, seat._id)}
            disabled={!isEditMode}
            bounds="parent"
            nodeRef={nodeRef}
        >
            <div
                ref={nodeRef}
                className={`
                    absolute w-12 h-12 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center select-none z-10 touch-none
                    transition-all duration-150
                    ${getStatusStyles(seat)}
                    ${isSelected && isEditMode ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white shadow-xl z-30 scale-105' : ''}
                    ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-pointer hover:scale-105'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditMode) {
                        onUpdate(seat);
                    } else if (onSelect) {
                        onSelect(seat._id);
                    }
                }}
                style={{
                    transition: isEditMode ? 'box-shadow 0.15s, ring 0.15s, transform 0.15s' : 'transform 0.2s, background-color 0.2s'
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
                {isSelected && isEditMode && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white" />
                )}
            </div>
        </Draggable>
    );
};

// --- SUB-COMPONENT: DRAGGABLE FLOOR ELEMENT ---
const DraggableFloorElement = ({
    element,
    position,
    onDrag,
    isEditMode,
    onSelect,
    isSelected,
    localRotation,
    localSize,
    localLabel,
    scale
}) => {
    const nodeRef = useRef(null);

    const currentX = position?.x ?? element.x ?? 0;
    const currentY = position?.y ?? element.y ?? 0;
    const currentRotation = localRotation !== undefined ? localRotation : (element.rotation || 0);

    const config = ELEMENT_CONFIG[element.type];
    const currentWidth = localSize?.width ?? element.width ?? config?.defaultWidth ?? 80;
    const currentHeight = localSize?.height ?? element.height ?? config?.defaultHeight ?? 20;
    const currentLabel = localLabel !== undefined ? localLabel : element.label;

    return (
        <Draggable
            position={{ x: currentX, y: currentY }}
            grid={[10, 10]}
            scale={scale}
            onStart={() => {
                if (isEditMode && onSelect) onSelect(element._id);
            }}
            onStop={(e, data) => onDrag(e, data, element._id)}
            disabled={!isEditMode}
            bounds="parent"
            nodeRef={nodeRef}
        >
            <div
                ref={nodeRef}
                onClick={(e) => {
                    if (isEditMode && onSelect) {
                        e.stopPropagation();
                        onSelect(element._id);
                    }
                }}
                className={`absolute touch-none select-none ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ zIndex: isSelected ? 20 : 5 }}
            >
                <FloorElementRenderer
                    element={{
                        ...element,
                        x: 0,
                        y: 0,
                        rotation: currentRotation,
                        width: currentWidth,
                        height: currentHeight,
                        label: currentLabel
                    }}
                    isEditMode={isEditMode}
                    isSelected={isSelected && isEditMode}
                />
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
    const [elementLabels, setElementLabels] = useState({});

    // Selection State: { type: 'element' | 'seat', id: string } | null
    const [selectedItem, setSelectedItem] = useState(null);

    const [addingLabel, setAddingLabel] = useState(false);
    const [labelText, setLabelText] = useState('');

    // Fetch floor elements
    const fetchFloorElements = async () => {
        try {
            const data = await getFloorElements(libraryId);
            setFloorElements(data);
        } catch (err) {
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

    // When exiting edit mode, clear selection
    useEffect(() => {
        if (!isEditMode) {
            setSelectedItem(null);
            setAddingLabel(false);
        }
    }, [isEditMode]);

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
                x: 80,
                y: 80,
                width: config.defaultWidth,
                height: config.defaultHeight,
            });
            setFloorElements(prev => [...prev, newElement]);
            setSelectedItem({ type: 'element', id: newElement._id });
            toast.success(`${config.label} added`);
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
                x: 80,
                y: 80,
                width: config.defaultWidth,
                height: config.defaultHeight,
                label: labelText.trim(),
            });
            setFloorElements(prev => [...prev, newElement]);
            setSelectedItem({ type: 'element', id: newElement._id });
            setAddingLabel(false);
            setLabelText('');
            toast.success('Label added');
        } catch (err) {
            toast.error('Failed to add label');
        }
    };

    // Rotate an element by delta degrees
    const handleRotateElement = (elementId, delta) => {
        setElementRotations(prev => {
            const current = prev[elementId] !== undefined
                ? prev[elementId]
                : (floorElements.find(e => e._id === elementId)?.rotation || 0);
            const newRotation = ((current + delta) % 360 + 360) % 360;
            return { ...prev, [elementId]: newRotation };
        });
    };

    // Set an exact rotation angle
    const handleSetExactRotation = (elementId, angle) => {
        setElementRotations(prev => ({
            ...prev,
            [elementId]: ((angle % 360) + 360) % 360
        }));
    };

    // Resize a floor element
    const handleResizeElement = (elementId, dimension, delta) => {
        setElementSizes(prev => {
            const el = floorElements.find(e => e._id === elementId);
            const config = ELEMENT_CONFIG[el?.type];
            const current = prev[elementId] || {
                width: el?.width ?? config?.defaultWidth ?? 80,
                height: el?.height ?? config?.defaultHeight ?? 20,
            };
            const minW = 20;
            const minH = 6;
            return {
                ...prev,
                [elementId]: {
                    width: dimension === 'width' ? Math.max(minW, current.width + delta) : current.width,
                    height: dimension === 'height' ? Math.max(minH, current.height + delta) : current.height,
                }
            };
        });
    };

    // Set direct dimension
    const handleSetDimension = (elementId, dimension, value) => {
        const num = Number(value);
        if (isNaN(num)) return;
        setElementSizes(prev => {
            const el = floorElements.find(e => e._id === elementId);
            const config = ELEMENT_CONFIG[el?.type];
            const current = prev[elementId] || {
                width: el?.width ?? config?.defaultWidth ?? 80,
                height: el?.height ?? config?.defaultHeight ?? 20,
            };
            return {
                ...prev,
                [elementId]: {
                    ...current,
                    [dimension]: Math.max(dimension === 'width' ? 20 : 6, num)
                }
            };
        });
    };

    // Update label text locally
    const handleUpdateLabel = (elementId, newText) => {
        setElementLabels(prev => ({
            ...prev,
            [elementId]: newText
        }));
    };

    // Duplicate an element
    const handleDuplicateElement = async (elementId) => {
        const el = floorElements.find(e => e._id === elementId);
        if (!el) return;
        const config = ELEMENT_CONFIG[el.type];
        const rot = elementRotations[elementId] ?? el.rotation ?? 0;
        const sz = elementSizes[elementId] ?? {
            width: el.width ?? config?.defaultWidth ?? 80,
            height: el.height ?? config?.defaultHeight ?? 20,
        };
        const pos = elementPositions[elementId] ?? { x: el.x || 0, y: el.y || 0 };
        const lbl = elementLabels[elementId] !== undefined ? elementLabels[elementId] : (el.label || '');

        try {
            const newElement = await addFloorElement({
                libraryId,
                type: el.type,
                x: Math.min(pos.x + 30, 900),
                y: Math.min(pos.y + 30, canvasHeight - 50),
                width: sz.width,
                height: sz.height,
                rotation: rot,
                label: lbl,
            });
            setFloorElements(prev => [...prev, newElement]);
            setSelectedItem({ type: 'element', id: newElement._id });
            toast.success(`Duplicated ${config?.label || el.type}`);
        } catch (err) {
            toast.error('Failed to duplicate element');
        }
    };

    // Delete a floor element
    const handleDeleteElement = async (elementId) => {
        try {
            await deleteFloorElement(elementId);
            setFloorElements(prev => prev.filter(e => e._id !== elementId));
            if (selectedItem?.id === elementId) {
                setSelectedItem(null);
            }
            setElementPositions(prev => { const n = { ...prev }; delete n[elementId]; return n; });
            setElementRotations(prev => { const n = { ...prev }; delete n[elementId]; return n; });
            setElementSizes(prev => { const n = { ...prev }; delete n[elementId]; return n; });
            setElementLabels(prev => { const n = { ...prev }; delete n[elementId]; return n; });
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

            // Save floor element positions + rotations + sizes + labels
            const changedElementIds = new Set([
                ...Object.keys(elementPositions),
                ...Object.keys(elementRotations),
                ...Object.keys(elementSizes),
                ...Object.keys(elementLabels),
            ]);

            const elementsWithChanges = floorElements
                .filter(el => changedElementIds.has(el._id))
                .map(el => {
                    const pos = elementPositions[el._id];
                    const rot = elementRotations[el._id];
                    const sz = elementSizes[el._id];
                    const lbl = elementLabels[el._id];
                    return {
                        id: el._id,
                        x: pos ? pos.x : (el.x || 0),
                        y: pos ? pos.y : (el.y || 0),
                        width: sz ? sz.width : (el.width || ELEMENT_CONFIG[el.type]?.defaultWidth || 80),
                        height: sz ? sz.height : (el.height || ELEMENT_CONFIG[el.type]?.defaultHeight || 20),
                        rotation: rot !== undefined ? rot : (el.rotation || 0),
                        label: lbl !== undefined ? lbl : (el.label || ''),
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
            setElementLabels({});
            setSelectedItem(null);
            refreshSeats();
            fetchFloorElements();
        } catch (err) {
            toast.error("Failed to save layout");
        } finally {
            setSaving(false);
        }
    };

    // Find currently selected element and seat for bottom inspector
    const selectedElement = selectedItem?.type === 'element'
        ? floorElements.find(e => e._id === selectedItem.id)
        : null;

    const selectedSeat = selectedItem?.type === 'seat'
        ? seats.find(s => s._id === selectedItem.id)
        : null;

    // Derived values for selected element
    const selElConfig = selectedElement ? ELEMENT_CONFIG[selectedElement.type] : null;
    const selElRotation = selectedElement
        ? (elementRotations[selectedElement._id] !== undefined
            ? elementRotations[selectedElement._id]
            : (selectedElement.rotation || 0))
        : 0;
    const selElWidth = selectedElement
        ? (elementSizes[selectedElement._id]?.width ?? selectedElement.width ?? selElConfig?.defaultWidth ?? 80)
        : 80;
    const selElHeight = selectedElement
        ? (elementSizes[selectedElement._id]?.height ?? selectedElement.height ?? selElConfig?.defaultHeight ?? 20)
        : 20;
    const selElPos = selectedElement
        ? (elementPositions[selectedElement._id] ?? { x: selectedElement.x || 0, y: selectedElement.y || 0 })
        : { x: 0, y: 0 };
    const selElLabel = selectedElement
        ? (elementLabels[selectedElement._id] !== undefined ? elementLabels[selectedElement._id] : (selectedElement.label || ''))
        : '';

    // Derived values for selected seat
    const selSeatPos = selectedSeat
        ? (positions[selectedSeat._id] ?? { x: selectedSeat.x || 0, y: selectedSeat.y || 0 })
        : { x: 0, y: 0 };

    return (
        <div className="mt-8 flex flex-col gap-4">

            {/* --- TOP TOOLBAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">

                {/* Title & Zoom Controls */}
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        <Armchair className="text-blue-600" size={24} />
                        <span className="hidden sm:inline">Floor Plan</span>
                    </h2>

                    {/* Zoom Tools */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition" title="Zoom Out">
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-xs font-mono w-12 text-center select-none">{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition" title="Zoom In">
                            <ZoomIn size={18} />
                        </button>
                    </div>
                </div>

                {/* Edit Controls (Only for Owner) */}
                {isOwner && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        {isEditMode ? (
                            <>
                                {/* Canvas Height Adjuster */}
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
                                        title="Canvas Height"
                                    />
                                    <span className="text-xs text-gray-400">px</span>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsEditMode(false);
                                        setPositions({});
                                        setElementPositions({});
                                        setElementRotations({});
                                        setElementSizes({});
                                        setElementLabels({});
                                        setSelectedItem(null);
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
                                    {saving ? "Saving..." : "Save Layout"}
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
            <div
                className="relative w-full overflow-auto bg-slate-100 border-2 border-gray-200 rounded-2xl shadow-inner scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent h-[70vh]"
                onClick={() => {
                    // Deselect when clicking on the container scroll area
                    if (isEditMode) setSelectedItem(null);
                }}
            >
                {/* The Actual Scalable Canvas */}
                <div
                    ref={containerRef}
                    onClick={(e) => {
                        // Deselect when clicking on canvas background directly
                        if (isEditMode && e.target === containerRef.current) {
                            setSelectedItem(null);
                        }
                    }}
                    className={`
                      relative origin-top-left transition-all duration-200 ease-out
                      ${isEditMode ? 'bg-white' : ''}
                    `}
                    style={{
                        height: `${canvasHeight}px`,
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
                            onSelect={(id) => setSelectedItem({ type: 'element', id })}
                            isSelected={selectedItem?.type === 'element' && selectedItem?.id === element._id}
                            localRotation={elementRotations[element._id]}
                            localSize={elementSizes[element._id]}
                            localLabel={elementLabels[element._id]}
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
                            onSelect={(id) => setSelectedItem({ type: 'seat', id })}
                            isSelected={selectedItem?.type === 'seat' && selectedItem?.id === seat._id}
                            scale={zoom}
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

            {/* --- BOTTOM DOCK / SETTINGS BAR (Like Paint / Figma Inspector) --- */}
            {isEditMode && (
                <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-md p-4 transition-all animate-in fade-in duration-200">

                    {/* CASE 1: Floor Element Selected */}
                    {selectedItem?.type === 'element' && selectedElement ? (
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

                            {/* Left: Element Info & Header */}
                            <div className="flex items-center gap-3 pr-4 border-b lg:border-b-0 lg:border-r border-gray-100 pb-3 lg:pb-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                    {selElConfig?.icon ? (
                                        React.createElement(selElConfig.icon, { size: 20 })
                                    ) : (
                                        <Minus size={20} />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-sm text-gray-800 capitalize">
                                            {selectedElement.type}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold">
                                            Selected
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-mono">
                                        X: {Math.round(selElPos.x)}px, Y: {Math.round(selElPos.y)}px
                                    </span>
                                </div>
                            </div>

                            {/* Center: Controls Grid */}
                            <div className="flex flex-wrap items-center gap-4 lg:gap-6 flex-1">

                                {/* Rotation Controls */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Angle</span>
                                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                                        <button
                                            onClick={() => handleRotateElement(selectedElement._id, -45)}
                                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-indigo-600 transition shadow-sm"
                                            title="Rotate -45°"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <span className="text-xs font-mono font-bold text-indigo-600 w-10 text-center select-none">
                                            {selElRotation}°
                                        </span>
                                        <button
                                            onClick={() => handleRotateElement(selectedElement._id, 45)}
                                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-indigo-600 transition shadow-sm"
                                            title="Rotate +45°"
                                        >
                                            <RotateCw size={14} />
                                        </button>

                                        {/* Quick snap buttons */}
                                        <div className="flex items-center gap-0.5 ml-1 border-l border-gray-200 pl-1">
                                            {[0, 90, 180, 270].map(angle => (
                                                <button
                                                    key={angle}
                                                    onClick={() => handleSetExactRotation(selectedElement._id, angle)}
                                                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium transition ${selElRotation === angle
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {angle}°
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Width Controls */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Width</span>
                                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                                        <button
                                            onClick={() => handleResizeElement(selectedElement._id, 'width', -10)}
                                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-indigo-600 transition shadow-sm"
                                            title="Shrink width"
                                        >
                                            <Minus size={13} />
                                        </button>
                                        <input
                                            type="number"
                                            value={selElWidth}
                                            onChange={(e) => handleSetDimension(selectedElement._id, 'width', e.target.value)}
                                            className="w-12 text-xs font-mono text-center bg-transparent border-none p-0 focus:ring-0 text-gray-700 font-bold"
                                        />
                                        <span className="text-[10px] text-gray-400 font-mono">px</span>
                                        <button
                                            onClick={() => handleResizeElement(selectedElement._id, 'width', 10)}
                                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-indigo-600 transition shadow-sm"
                                            title="Expand width"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Height Controls */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Height</span>
                                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                                        <button
                                            onClick={() => handleResizeElement(selectedElement._id, 'height', -4)}
                                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-indigo-600 transition shadow-sm"
                                            title="Shrink height"
                                        >
                                            <Minus size={13} />
                                        </button>
                                        <input
                                            type="number"
                                            value={selElHeight}
                                            onChange={(e) => handleSetDimension(selectedElement._id, 'height', e.target.value)}
                                            className="w-12 text-xs font-mono text-center bg-transparent border-none p-0 focus:ring-0 text-gray-700 font-bold"
                                        />
                                        <span className="text-[10px] text-gray-400 font-mono">px</span>
                                        <button
                                            onClick={() => handleResizeElement(selectedElement._id, 'height', 4)}
                                            className="p-1 hover:bg-white rounded text-gray-600 hover:text-indigo-600 transition shadow-sm"
                                            title="Expand height"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Label Editor (for all elements, especially text label) */}
                                <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Label Text</span>
                                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                        <Type size={13} className="text-gray-400 flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={selElLabel}
                                            placeholder="Optional label..."
                                            onChange={(e) => handleUpdateLabel(selectedElement._id, e.target.value)}
                                            className="text-xs bg-transparent border-none p-0 focus:ring-0 text-gray-700 w-full placeholder:text-gray-400 font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Duplicate, Delete, Deselect */}
                            <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-100 pl-0 lg:pl-4 justify-end">
                                <button
                                    onClick={() => handleDuplicateElement(selectedElement._id)}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                                    title="Duplicate element"
                                >
                                    <Copy size={13} />
                                    <span>Clone</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteElement(selectedElement._id)}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-red-200"
                                    title="Delete element"
                                >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                </button>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    title="Deselect"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ) : selectedItem?.type === 'seat' && selectedSeat ? (
                        /* CASE 2: Seat Selected */
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                                    <Armchair size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-sm text-gray-800">
                                            Seat {selectedSeat.seatNumber}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">
                                            {selectedSeat.category || 'General'}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                                            {selectedSeat.status}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-mono">
                                        X: {Math.round(selSeatPos.x)}px, Y: {Math.round(selSeatPos.y)}px • Drag on canvas to reposition
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedItem(null)}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-1 border border-gray-200"
                            >
                                <X size={14} />
                                <span>Deselect</span>
                            </button>
                        </div>
                    ) : (
                        /* CASE 3: Nothing Selected -> Element Palette (Dock) */
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-indigo-600" />
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Add Floor Elements
                                    </span>
                                    <span className="text-[11px] text-gray-400 hidden sm:inline">
                                        (Click any icon to place on the floor plan)
                                    </span>
                                </div>
                                <span className="text-[11px] text-indigo-600 font-medium">
                                    💡 Click any element or seat to select & edit
                                </span>
                            </div>

                            {/* Palette Items Grid */}
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                {PALETTE_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.type}
                                            onClick={() => handleAddElement(item.type)}
                                            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/60 transition-all group shadow-sm bg-white"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                                <Icon size={16} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Label Input Popup */}
                            {addingLabel && (
                                <div className="flex items-center gap-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-200 mt-1">
                                    <Type size={16} className="text-indigo-500 flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Enter label text (e.g., 'Quiet Zone', 'Section B')"
                                        value={labelText}
                                        onChange={(e) => setLabelText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                                        className="flex-1 text-xs bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder:text-gray-400 font-medium"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleAddLabel}
                                        className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                                    >
                                        Add Label
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
                </div>
            )}

            {/* --- FLOOR PLAN LEGEND (When not in edit mode) --- */}
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
                        { color: 'bg-blue-400', label: 'Window' },
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
                    ? "Click any element or seat to select and adjust settings in the bottom bar. Drag to move."
                    : "Pinch or scroll to move around the map. Click a seat for details."}
            </p>
        </div>
    );
};

export default SeatCanvas;