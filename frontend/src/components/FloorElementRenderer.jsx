import React from 'react';
import {
    DoorOpen,
    LogOut,
    Bath,
    GlassWater,
    ConciergeBell,
    PanelTop
} from 'lucide-react';

/**
 * SVG icon definitions for each floor element type.
 * Used by both admin (SeatCanvas) and user (UserSeatMap) views.
 */

const ELEMENT_CONFIG = {
    wall: {
        icon: null, // Rendered as a solid bar, no icon
        label: 'Wall',
        defaultWidth: 120,
        defaultHeight: 12,
        color: 'bg-slate-700 dark:bg-slate-500',
        borderColor: 'border-slate-800 dark:border-slate-400',
    },
    entrance: {
        icon: DoorOpen,
        label: 'Entrance',
        defaultWidth: 56,
        defaultHeight: 56,
        color: 'bg-emerald-100 dark:bg-emerald-900/40',
        borderColor: 'border-emerald-400 dark:border-emerald-600',
        textColor: 'text-emerald-700 dark:text-emerald-400',
    },
    exit: {
        icon: LogOut,
        label: 'Exit',
        defaultWidth: 56,
        defaultHeight: 56,
        color: 'bg-orange-100 dark:bg-orange-900/40',
        borderColor: 'border-orange-400 dark:border-orange-600',
        textColor: 'text-orange-700 dark:text-orange-400',
    },
    bathroom: {
        icon: Bath,
        label: 'Bathroom',
        defaultWidth: 60,
        defaultHeight: 60,
        color: 'bg-sky-100 dark:bg-sky-900/40',
        borderColor: 'border-sky-400 dark:border-sky-600',
        textColor: 'text-sky-700 dark:text-sky-400',
    },
    'water-cooler': {
        icon: GlassWater,
        label: 'Water',
        defaultWidth: 48,
        defaultHeight: 48,
        color: 'bg-cyan-100 dark:bg-cyan-900/40',
        borderColor: 'border-cyan-400 dark:border-cyan-600',
        textColor: 'text-cyan-700 dark:text-cyan-400',
    },
    reception: {
        icon: ConciergeBell,
        label: 'Reception',
        defaultWidth: 80,
        defaultHeight: 56,
        color: 'bg-amber-100 dark:bg-amber-900/40',
        borderColor: 'border-amber-400 dark:border-amber-600',
        textColor: 'text-amber-700 dark:text-amber-400',
    },
    window: {
        icon: null, // Rendered as a dashed line
        label: 'Window',
        defaultWidth: 100,
        defaultHeight: 8,
        color: 'bg-blue-300/60 dark:bg-blue-500/30',
        borderColor: 'border-blue-400 dark:border-blue-500',
    },
    label: {
        icon: null,
        label: 'Label',
        defaultWidth: 100,
        defaultHeight: 28,
        color: 'bg-transparent',
        borderColor: 'border-transparent',
        textColor: 'text-gray-600 dark:text-gray-300',
    },
};

/**
 * Renders a single floor element (wall, door, bathroom, etc.)
 * @param {Object} element - The element data from the database
 * @param {boolean} isEditMode - Whether to show delete button and edit affordances
 * @param {function} onDelete - Callback when delete button is clicked
 */
const FloorElementRenderer = ({ element, isEditMode = false, isSelected = false }) => {
    const config = ELEMENT_CONFIG[element.type];
    if (!config) return null;

    const Icon = config.icon;
    const selectedClasses = isSelected
        ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white shadow-lg'
        : '';

    // === WALL rendering ===
    if (element.type === 'wall') {
        return (
            <div
                className={`absolute ${config.color} rounded-sm shadow-sm z-[5] ${selectedClasses} transition-all`}
                style={{
                    left: element.x,
                    top: element.y,
                    width: element.width || config.defaultWidth,
                    height: element.height || config.defaultHeight,
                    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                    transformOrigin: 'top left',
                }}
            >
                {/* Wall stripe pattern for realism */}
                <div className="w-full h-full rounded-sm opacity-30"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.2) 6px, rgba(255,255,255,0.2) 7px)',
                    }}
                />
                {element.label && (
                    <span className="absolute -top-5 left-0 text-[9px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">
                        {element.label}
                    </span>
                )}
                {isSelected && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white" />
                )}
            </div>
        );
    }

    // === WINDOW rendering (dashed line) ===
    if (element.type === 'window') {
        return (
            <div
                className={`absolute ${config.color} z-[5] ${selectedClasses} transition-all`}
                style={{
                    left: element.x,
                    top: element.y,
                    width: element.width || config.defaultWidth,
                    height: element.height || config.defaultHeight,
                    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                    transformOrigin: 'top left',
                    borderTop: '3px dashed',
                    borderBottom: '3px dashed',
                    borderColor: 'rgb(96, 165, 250)', // blue-400
                }}
            >
                {/* Glass shimmer effect */}
                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                {element.label && (
                    <span className="absolute -top-5 left-0 text-[9px] font-bold text-blue-500 dark:text-blue-400 whitespace-nowrap uppercase tracking-wider">
                        {element.label}
                    </span>
                )}
                {isSelected && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white" />
                )}
            </div>
        );
    }

    // === LABEL rendering (text only) ===
    if (element.type === 'label') {
        return (
            <div
                className={`absolute z-[5] flex items-center justify-center ${selectedClasses} rounded px-1 transition-all`}
                style={{
                    left: element.x,
                    top: element.y,
                    minWidth: element.width || config.defaultWidth,
                    height: element.height || config.defaultHeight,
                }}
            >
                <span className={`text-xs font-bold ${config.textColor} whitespace-nowrap uppercase tracking-widest opacity-70`}>
                    {element.label || 'Label'}
                </span>
                {isSelected && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white" />
                )}
            </div>
        );
    }

    // === ICON-BASED elements (entrance, exit, bathroom, water-cooler, reception) ===
    return (
        <div
            className={`absolute ${config.color} border-2 ${config.borderColor} rounded-xl shadow-sm flex flex-col items-center justify-center z-[5] ${selectedClasses} transition-all`}
            style={{
                left: element.x,
                top: element.y,
                width: element.width || config.defaultWidth,
                height: element.height || config.defaultHeight,
                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                transformOrigin: 'center center',
            }}
        >
            {Icon && <Icon size={18} className={`${config.textColor} mb-0.5`} />}
            <span className={`text-[8px] font-bold ${config.textColor} uppercase tracking-wider leading-none`}>
                {element.label || config.label}
            </span>

            {/* Direction arrow for entrance/exit */}
            {(element.type === 'entrance' || element.type === 'exit') && (
                <div className={`absolute ${element.type === 'entrance' ? '-bottom-3' : '-top-3'}`}>
                    <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent ${element.type === 'entrance'
                        ? 'border-t-[6px] border-t-emerald-500'
                        : 'border-b-[6px] border-b-orange-500'
                        }`}
                    />
                </div>
            )}

            {isSelected && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white" />
            )}
        </div>
    );
};

export { ELEMENT_CONFIG };
export default FloorElementRenderer;
