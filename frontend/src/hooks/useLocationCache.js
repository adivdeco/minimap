import { useState, useEffect } from 'react';

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const useLocationCache = () => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const requestLocation = () => {
        setLoading(true);
        setError(null);

        if (!('geolocation' in navigator)) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newLoc = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    timestamp: Date.now() // Cache time
                };
                localStorage.setItem('userGeoLocation', JSON.stringify(newLoc));
                setLocation(newLoc);
                setLoading(false);
            },
            (err) => {
                console.error("Geolocation error:", err);
                setError(err.message || "Unable to retrieve your location. Please grant location permissions.");
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        const checkCache = () => {
            const cached = localStorage.getItem('userGeoLocation');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // Check if cache is still valid
                    if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
                        setLocation({ latitude: parsed.latitude, longitude: parsed.longitude });
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Error parsing cached location", e);
                }
            }
            // If no valid cache, request new location
            requestLocation();
        };

        checkCache();
    }, []);

    const refreshLocation = () => requestLocation();

    return { location, loading, error, refreshLocation };
};

export default useLocationCache;
