import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import apiClient from '../utils/apiClient';
import '../style/mapcontainer.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom firetruck icon using SVG
const firetruckIcon = L.divIcon({
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#8b0000;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.3);font-size:18px;line-height:1;">🚒</div>`,
  className: 'firetruck-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Custom phone icon for caller/incident location
const callerIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22" fill="white"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>`,
  className: 'caller-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
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
    if (
      selectedLocation &&
      Number.isFinite(Number(selectedLocation.lat)) &&
      Number.isFinite(Number(selectedLocation.lng))
    ) {
      const lat = Number(selectedLocation.lat);
      const lng = Number(selectedLocation.lng);
      map.flyTo([lat, lng], 15, { duration: 1 });
    }
  }, [selectedLocation, map]);

  return null;
}

export default function MapContainerComponent({
  selectedLocation,
  onLocationSelect,
  locationName,
}) {
  const defaultCenter = [7.5, 122.0]; // Zamboanga, Philippines default
  const initialMarker =
    selectedLocation &&
    Number.isFinite(Number(selectedLocation.lat)) &&
    Number.isFinite(Number(selectedLocation.lng))
      ? [Number(selectedLocation.lat), Number(selectedLocation.lng)]
      : defaultCenter;
  const [markerPosition, setMarkerPosition] = useState(initialMarker);
  const [firetruckLocations, setFiretruckLocations] = useState([]);

  useEffect(() => {
    const latNum = selectedLocation ? Number(selectedLocation.lat) : null;
    const lngNum = selectedLocation ? Number(selectedLocation.lng) : null;
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      setMarkerPosition([latNum, lngNum]);
    }
  }, [selectedLocation]);

  // Load latest firetruck locations periodically
  useEffect(() => {
    let isMounted = true;

    const fetchLocations = async () => {
      try {
        const data = await apiClient.get('/firetruck-locations');
        if (!isMounted) return;
        setFiretruckLocations(data?.locations || []);
      } catch (error) {
        console.error('Failed to load firetruck locations:', error);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 5000); // refresh every 5s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLocationClick = (newLocation) => {
    setMarkerPosition([newLocation.lat, newLocation.lng]);
    onLocationSelect(newLocation);
  };

  return (
    <div>
      <div className="map-header">
        <h3>📍 Incident Location</h3>
        {locationName && <p className="location-display">Selected: {locationName}</p>}
        {selectedLocation &&
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
          })()}
      </div>

      <div className="map-container-wrapper">
        <MapContainer center={markerPosition} zoom={15} className="map-view">
          <TileLayer url="https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=oSlvDwVRxtNTSJ5Ho0Nv" />
          {markerPosition && (
            <Marker position={markerPosition} icon={callerIcon}>
              <Popup>
                <div>
                  <strong>📞 Caller / Incident Location</strong>
                  <p>{locationName || 'Selected location'}</p>
                </div>
              </Popup>
            </Marker>
          )}
          {/* Firetruck markers from Supabase firetruck_location_history */}
          {firetruckLocations.map((truck) => {
            const lat = Number(truck.latitude);
            const lng = Number(truck.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return (
              <Marker key={`truck-${truck.truck_id}`} position={[lat, lng]} icon={firetruckIcon}>
                <Popup>
                  <div style={{ minWidth: '160px' }}>
                    <strong>Firetruck #{truck.truck_id}</strong>
                    {truck.driver_name && (
                      <p style={{ margin: '4px 0 2px' }}>
                        <b>Driver:</b> {truck.driver_name}
                      </p>
                    )}
                    {truck.fire_status && (
                      <p style={{ margin: '2px 0' }}>
                        <b>Status:</b> {truck.fire_status}
                      </p>
                    )}
                    {truck.alarm_level && (
                      <p style={{ margin: '2px 0' }}>
                        <b>Alarm:</b> {truck.alarm_level}
                      </p>
                    )}
                    {truck.recorded_at && (
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888' }}>
                        Last update: {new Date(truck.recorded_at).toLocaleString()}
                      </p>
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
