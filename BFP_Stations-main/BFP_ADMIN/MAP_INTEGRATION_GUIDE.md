# OpenStreetMap Integration Guide

## Overview
The emergency system now includes a fully integrated OpenStreetMap using Leaflet and React-Leaflet. When a phone call is received, the admin is automatically navigated to the Incident Report page where caller information is pre-filled and a map is displayed for location selection.

## How It Works

### 1. **Incoming Call Flow**
- User clicks "Trigger Incoming Call" button in the app
- Call data (name, phone, location, coordinates) is created
- `addIncomingCall()` from CallContext stores the data
- Page automatically navigates to `/incident-report`

### 2. **Auto-Fill on Incident Report**
- When IncidentReport page loads, it checks for `currentIncomingCall` from CallContext
- Form fields auto-populate:
  - First Name
  - Last Name
  - Phone Number
  - Location (if available)
- Map displays the incident location with a marker

### 3. **Map Features**
- **View**: Displays OpenStreetMap (free, open-source)
- **Click-to-Select**: Click anywhere on the map to pin the exact incident location
- **Coordinates**: Displays latitude/longitude in decimal format
- **Location Name**: Shows the street address or coordinates
- **Responsive**: Map adjusts to container size

## File Changes

### New Files Created
1. **`src/components/MapContainer.jsx`**
   - Leaflet map component
   - Marker placement on map click
   - Location coordinates display

2. **`src/style/mapcontainer.css`**
   - Map styling and layout
   - Leaflet customization

### Updated Files

#### `src/context/CallContext.jsx`
- Added `currentIncomingCall` state to store full caller data
- `addIncomingCall()` now sets `currentIncomingCall` for form auto-fill
- `rejectCall()` clears `currentIncomingCall`

#### `src/pages/IncidentReport.jsx`
- Imported `MapContainerComponent` and `CallContext`
- Added `useEffect` to auto-fill form when `currentIncomingCall` changes
- Replaced Google Maps placeholder with Leaflet map
- Form fields now sync with selected map location

#### `src/App.jsx`
- Updated `triggerIncomingCall()` to accept full caller data object
- Integrated `CallContext.addIncomingCall()` to store data globally
- Auto-navigates to `/incident-report` when call is received
- Updated test button with sample caller data

## Usage

### Test the Flow
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:5173/
3. Click "Trigger Incoming Call" button
4. System auto-navigates to Incident Report with:
   - Form pre-filled with caller info
   - Map displaying location marker
5. Click on map to select different location
6. Form location field updates with coordinates
7. Submit incident report as normal

### Integrate with Real Calls
When integrating real phone system:

```javascript
// When call received from VoIP system:
const incomingCallData = {
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "09171234567",
  location: "123 Main St, Barangay 1",
  coordinates: { 
    lat: 14.5995, 
    lng: 120.9842 
  }
};

triggerIncomingCall(incomingCallData);
```

## Map Data Source
- **Provider**: OpenStreetMap
- **Library**: Leaflet + React-Leaflet
- **Tile Server**: OpenStreetMap Standard (Free)
- **Attribution**: Automatically included in map

## Customization Options

### Change Default Location
In `MapContainer.jsx`:
```javascript
const defaultCenter = [14.5995, 120.9842]; // Modify this
```

### Change Map Zoom Level
In `MapContainer.jsx`:
```javascript
<MapContainer center={markerPosition} zoom={15} ...>  {/* Change zoom value */}
```

### Add Multiple Markers
Current implementation shows single marker. To add multiple:
```javascript
{incomingCalls.map(call => (
  <Marker key={call.id} position={[call.lat, call.lng]}>
    <Popup>{call.name}</Popup>
  </Marker>
))}
```

## Browser Compatibility
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for desktop and tablet
- Mobile support included

## Performance Notes
- Map tiles are cached by browser
- Lazy loads markers only when visible
- Efficient coordinate calculations

## Next Steps
1. Connect to real VoIP system to receive actual calls
2. Add real-time position tracking for responders
3. Add incident hotspot heatmap
4. Store and display incident history on map
5. Add satellite/hybrid view options

## Troubleshooting

### Map not displaying
- Check browser console for errors
- Verify leaflet CSS is imported (should be auto-imported)
- Clear browser cache and reload

### Markers not showing
- Verify coordinates are valid [lat, lng]
- Check that coordinates are within valid range (±90° lat, ±180° lng)

### Form not auto-filling
- Check CallContext `currentIncomingCall` state in React DevTools
- Verify `triggerIncomingCall()` was called with proper data object

## Support Files
- Map styling: `src/style/mapcontainer.css`
- API client for backend: `src/utils/apiClient.js`
- Call management: `src/hooks/useEmergencyCalls.js`
