import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin } from 'lucide-react';
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

// Sub-component to handle map clicks
const LocationMarker = ({ position, setPosition, setAddress }) => {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position === null ? null : (
        <Marker position={position} />
    );
};

// Sub-component to recenter map when "Use My Location" is clicked
const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 15);
        }
    }, [position, map]);
    return null;
};

const MapLocationPicker = ({ defaultLocation, onLocationSelect }) => {
    const [position, setPosition] = useState(defaultLocation || [28.6139, 77.2090]); // Default to New Delhi
    const [loadingLocation, setLoadingLocation] = useState(false);

    // Call parrent handler whenever position changes
    useEffect(() => {
        if (position && onLocationSelect) {
            onLocationSelect(position);
        }
    }, [position]);

    const handleUseMyLocation = () => {
        setLoadingLocation(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = [pos.coords.latitude, pos.coords.longitude];
                    setPosition(newPos);
                    setLoadingLocation(false);
                },
                (err) => {
                    console.error("Error getting location: ", err);
                    alert("Unable to fetch location. Please ensure location permissions are granted.");
                    setLoadingLocation(false);
                }
            );
        } else {
            alert("Geolocation is not supported by your browser");
            setLoadingLocation(false);
        }
    };

    return (
        <div className="w-full space-y-3">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <MapPin size={16} className="text-purple-600" /> Exact Location
                </label>
                <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={loadingLocation}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
                >
                    <Crosshair size={14} />
                    {loadingLocation ? "Locating..." : "Use My Location"}
                </button>
            </div>

            <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 relative z-0 shadow-inner">
                <MapContainer center={position} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                    <RecenterMap position={position} />
                </MapContainer>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                * Click anywhere on the map to drop a pin for your library's exact location.
            </p>
        </div>
    );
};

export default MapLocationPicker;
