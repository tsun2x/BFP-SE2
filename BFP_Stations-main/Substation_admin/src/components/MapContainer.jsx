import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import { io } from "socket.io-client";
import apiClient from "../utils/apiClient";
import "../style/mapcontainer.css";

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom firetruck icon using an emoji rendered in a div icon
const firetruckIcon = L.divIcon({
  html: '🚒',
  className: 'firetruck-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom caller/end-user icon (phone)
const callerIcon = L.divIcon({
  html: '📱',
  className: 'caller-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Map click handler component
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });
  return null;
}

// Auto-zoom to marker when location changes
function MapZoomHandler({ selectedLocation }) {
  const map = useMapEvents({});
  
  useEffect(() => {
    if (selectedLocation && Number.isFinite(Number(selectedLocation.lat)) && Number.isFinite(Number(selectedLocation.lng))) {
      const lat = Number(selectedLocation.lat);
      const lng = Number(selectedLocation.lng);
      map.flyTo([lat, lng], 15, { duration: 1 });
    }
  }, [selectedLocation, map]);
  
  return null;
}

export default function MapContainerComponent({ selectedLocation, onLocationSelect, locationName }) {
  const defaultCenter = [7.5, 122.0]; // Zamboanga, Philippines default
  const initialMarker = (selectedLocation && Number.isFinite(Number(selectedLocation.lat)) && Number.isFinite(Number(selectedLocation.lng)))
    ? [Number(selectedLocation.lat), Number(selectedLocation.lng)]
    : defaultCenter;
  const [markerPosition, setMarkerPosition] = useState(initialMarker);
  const [firetruckLocations, setFiretruckLocations] = useState([]);
  const socketTrucksRef = useRef({});

  useEffect(() => {
    const latNum = selectedLocation ? Number(selectedLocation.lat) : null;
    const lngNum = selectedLocation ? Number(selectedLocation.lng) : null;
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      setMarkerPosition([latNum, lngNum]);
    }
  }, [selectedLocation]);

  // Load latest firetruck locations periodically + real-time socket updates
  useEffect(() => {
    let isMounted = true;

    const fetchLocations = async () => {
      try {
        const data = await apiClient.get('/firetruck-locations');
        if (!isMounted) return;
        const apiLocations = data?.locations || [];
        // Merge: API locations + fresh socket locations (socket wins if newer)
        const merged = new Map();
        apiLocations.forEach(t => merged.set(String(t.truck_id), t));
        Object.values(socketTrucksRef.current).forEach(t => {
          const existing = merged.get(String(t.truck_id));
          if (!existing || new Date(t.recorded_at) > new Date(existing.recorded_at)) {
            merged.set(String(t.truck_id), t);
          }
        });
        setFiretruckLocations(Array.from(merged.values()));
      } catch (error) {
        console.error('Failed to load firetruck locations:', error);
        // Fallback to socket-only data if API fails
        if (isMounted) {
          const socketOnly = Object.values(socketTrucksRef.current);
          if (socketOnly.length > 0) setFiretruckLocations(socketOnly);
        }
      }
    };

    // Listen to socket for real-time truck positions
    const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const socket = io(backendUrl, { transports: ['websocket', 'polling'] });
    socket.on('truck-status-update', (data) => {
      if (!isMounted || !data) return;
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const entry = {
        truck_id: data.truckId,
        latitude: lat,
        longitude: lng,
        recorded_at: data.updatedAt || new Date().toISOString(),
        fire_status: data.fireStatus,
        driver_name: data.driverName,
      };
      socketTrucksRef.current[String(data.truckId)] = entry;
      // Immediately update map
      setFiretruckLocations(prev => {
        const map = new Map(prev.map(t => [String(t.truck_id), t]));
        map.set(String(data.truckId), entry);
        return Array.from(map.values());
      });
    });

    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const handleLocationClick = (newLocation) => {
    setMarkerPosition([newLocation.lat, newLocation.lng]);
    onLocationSelect(newLocation);
  };

  return (
    <div >
      <div className="map-header">
        <h3>📍 Incident Location</h3>
        {locationName && <p className="location-display">Selected: {locationName}</p>}
        {selectedLocation && (
          (() => {
            const latNum = Number(selectedLocation.lat);
            const lngNum = Number(selectedLocation.lng);
            if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
              return (
                <p className="location-coords">
                  {latNum.toFixed(4)}°, {lngNum.toFixed(4)}°
                </p>
              );
            }
            return null;
          })()
        )}
      </div>
     
        <div className="map-container-wrapper">
            <MapContainer
                center={markerPosition}
                zoom={15}
                className="map-view"
            >
                <TileLayer
                url="https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=J2Xl68lxzncOI2shzeBc"
                />
                {markerPosition && (
                <Marker position={markerPosition} icon={callerIcon}>
                    <Popup>
                    <div>
                        <strong>📱 Caller / Incident Location</strong>
                        <p>{locationName || "Selected location"}</p>
                    </div>
                    </Popup>
                </Marker>
                )}
                {/* Firetruck markers */}
                {firetruckLocations.map((truck) => {
                  const lat = Number(truck.latitude);
                  const lng = Number(truck.longitude);
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                  return (
                    <Marker
                      key={`truck-${truck.truck_id}`}
                      position={[lat, lng]}
                      icon={firetruckIcon}
                    >
                      <Popup>
                        <div>
                          <strong>🚒 Firetruck #{truck.truck_id}</strong>
                          {truck.driver_name && <p>Driver: {truck.driver_name}</p>}
                          {truck.fire_status && <p>Status: {truck.fire_status}</p>}
                          {truck.recorded_at && (
                            <p>Last update: {new Date(truck.recorded_at).toLocaleString()}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                <MapClickHandler onLocationSelect={handleLocationClick} />
                <MapZoomHandler selectedLocation={selectedLocation} />
            </MapContainer>

            <div className="map-info">
                <small>💡 Click on the map to select the incident location</small>
            </div>
        </div> 
    </div>
  );
}
