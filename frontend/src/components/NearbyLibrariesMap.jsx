import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { getNearbyLibraries } from '../api/library';
import useLocationCache from '../hooks/useLocationCache';
import { Navigation, RefreshCw, AlertCircle, Target, MapPinOff } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const RecenterControl = ({ position }) => {
    const map = useMap();
    return (
        <div style={{ position: 'absolute', bottom: '24px', right: '12px', zIndex: 1000 }}>
            <button
                onClick={(e) => { e.preventDefault(); map.setView(position, 13); }}
                className="bg-white dark:bg-[#1A1A1F] p-3 rounded-full shadow-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-purple-600 hover:scale-110 transition-all focus:outline-none"
                title="Recenter Map"
            >
                <Target size={22} />
            </button>
        </div>
    );
};

// Custom red icon for the user's location
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const NearbyLibrariesMap = () => {
    const navigate = useNavigate();
    const { location, loading: locationLoading, error: locationError, refreshLocation } = useLocationCache();
    const [libraries, setLibraries] = useState([]);
    const [fetchingLibs, setFetchingLibs] = useState(false);
    const [radius, setRadius] = useState(10); // initial 10km

    useEffect(() => {
        if (location) {
            fetchNearbyLibraries(location.longitude, location.latitude, radius * 1000);
        }
    }, [location, radius]);

    const fetchNearbyLibraries = async (lng, lat, distanceMeters) => {
        setFetchingLibs(true);
        try {
            const res = await getNearbyLibraries(lng, lat, distanceMeters);
            setLibraries(res.libraries || []);
        } catch (error) {
            console.error("Failed to fetch nearby libraries", error);
        } finally {
            setFetchingLibs(false);
        }
    };

    if (locationLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0F0F12] rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm h-[500px]">
                <Navigation className="text-purple-500 animate-pulse mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Locating You...</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center">We are finding your current position to show nearby libraries.</p>
            </div>
        );
    }

    if (locationError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0F0F12] rounded-3xl border border-red-200 dark:border-red-500/20 shadow-sm h-[500px]">
                <AlertCircle className="text-red-500 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Location Access Denied</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
                    {locationError}
                </p>
                <button
                    onClick={refreshLocation}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                    <RefreshCw size={18} /> Try Again
                </button>
            </div>
        );
    }

    if (!location) return null;

    const userPos = [location.latitude, location.longitude];

    return (
        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px]">

            {/* Header / Controls */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-white/5">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Navigation className="text-purple-600" size={20} />
                    <span className="font-semibold">Libraries near you</span>
                    {fetchingLibs && <span className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin ml-2"></span>}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">Radius: {radius}km</span>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value))}
                        className="w-32 accent-purple-600"
                    />
                    <button
                        onClick={refreshLocation}
                        className="p-2 bg-gray-200 dark:bg-white/10 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors tooltip"
                        title="Refresh Location"
                    >
                        <RefreshCw size={18} className="text-gray-700 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative z-0">
                
                {/* Overlay for fetching */}
                {fetchingLibs && (
                    <div className="absolute inset-0 z-[1000] bg-white/40 dark:bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
                        <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4 shadow-lg"></div>
                        <p className="font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-black/80 px-4 py-2 rounded-full shadow">Finding nearby libraries...</p>
                    </div>
                )}

                {/* No libraries found overlay */}
                {!fetchingLibs && libraries.length === 0 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-[#1A1A1F] px-6 py-3 rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                        <MapPinOff className="text-orange-500" size={24} />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">No libraries found</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Try increasing the radius</p>
                        </div>
                    </div>
                )}

                <MapContainer center={userPos} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* User Marker */}
                    <Marker position={userPos} icon={userIcon}>
                        <Popup>
                            <div className="text-center font-bold">You are here</div>
                        </Popup>
                    </Marker>

                    <Circle
                        center={userPos}
                        pathOptions={{ fillColor: 'blue', fillOpacity: 0.05, color: '#3b82f6', weight: 1 }}
                        radius={radius * 1000}
                    />

                    {/* Library Markers */}
                    {libraries.map(lib => {
                        const coords = lib.location?.coordinates;
                        if (!coords) return null;
                        return (
                            <Marker
                                key={lib._id}
                                position={[coords[1], coords[0]]}
                            >
                                <Popup>
                                    <div className="p-1 max-w-[200px]">
                                        <h4 className="font-bold text-gray-900 text-sm mb-1">{lib.libraryName}</h4>
                                        <p className="text-xs text-gray-500 mb-2 truncate">{lib.location.address?.city}, {lib.location.address?.state}</p>

                                        {/* Distance from backend $geoNear */}
                                        {lib.dist?.calculated && (
                                            <div className="text-xs font-semibold text-purple-600 mb-3 bg-purple-50 p-1 rounded inline-block">
                                                {(lib.dist.calculated / 1000).toFixed(1)} km away
                                            </div>
                                        )}

                                        <button
                                            onClick={() => navigate(`/library/${lib._id}`)}
                                            className="w-full py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    <RecenterControl position={userPos} />
                </MapContainer>
            </div>

            {/* Status Footer */}
            <div className="bg-white dark:bg-[#0F0F12] p-3 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-white/10">
                Found {libraries.length} {libraries.length === 1 ? 'library' : 'libraries'} within {radius}km
            </div>
        </div>
    );
};

export default NearbyLibrariesMap;
