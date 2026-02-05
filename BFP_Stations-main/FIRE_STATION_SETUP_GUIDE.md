# Fire Station Signup & KNN Setup Guide

## Implementation Complete ✅

All changes have been implemented to support fire station registration with coordinates for KNN-based dispatch routing.

---

## What Was Added

### Database
- **Migration:** `003_add_station_type_to_fire_stations.sql`
  - Adds `station_type` ENUM column to `fire_stations` table
  - Marks existing Central Fire Station (ID 101) as "Main"
  - All new stations default to "Substation"

### Backend
- **New Endpoint:** `POST /api/signup-station`
  - Accepts: `firstName`, `lastName`, `idNumber`, `rank`, `password`, `stationName`, `latitude`, `longitude`, `contactNumber`, `stationType`
  - Creates both `fire_stations` and `users` rows in a transaction
  - Validates that only one "Main" station exists
  - Links user to station via `assigned_station_id`

- **Enhanced Login:** `POST /api/login`
  - Returns `stationInfo` object with `station_id`, `station_name`, `latitude`, `longitude`, `station_type`
  - JWT token now includes `assignedStationId`

### Frontend - BFP_ADMIN Signup
- Station info fields: Name, Latitude, Longitude, Contact Number
- Station Type field: **disabled/fixed to "Main Station"**
- Only BFP admin can create Main station; prevents duplicate Main stations at backend level

### Frontend - Substation_admin Signup
- Station info fields: Name, Latitude, Longitude, Contact Number
- Station Type field: **disabled/fixed to "Substation"**
- Each substation signs up with their own coordinates

### AuthContext
- `signup()` function now routes to `/signup-station` if `stationType` is provided
- Backward compatible with legacy `/signup` endpoint

---

## Setup Instructions

### 1. Run the Database Migration

```powershell
cd c:\Users\ERN FRANCIS\OneDrive\Desktop\ReactProject\school\BFP_STATIONS\BFP_ADMIN\backend
```

Then run the migration (adjust database credentials as needed):
```powershell
mysql -h localhost -u root -p bfp_emergency_db < migrations/003_add_station_type_to_fire_stations.sql
```

Or if using a MySQL client GUI (e.g., MySQL Workbench):
1. Open `migrations/003_add_station_type_to_fire_stations.sql`
2. Execute the queries

**Verify the migration:**
```sql
SELECT station_id, station_name, station_type FROM fire_stations LIMIT 5;
```
Expected output shows `station_id=101` with `station_type='Main'`, and others with `station_type='Substation'`.

---

### 2. Start the Backend Server

```powershell
cd c:\Users\ERN FRANCIS\OneDrive\Desktop\ReactProject\school\BFP_STATIONS\BFP_ADMIN\backend
npm install  # if not already installed
npm start    # or: node server.js
```

Expected console output:
```
Server running on port 5000
Database connected
```

---

### 3. Start Frontend Apps

**Terminal 1 - BFP_ADMIN (Main Station Signup):**
```powershell
cd c:\Users\ERN FRANCIS\OneDrive\Desktop\ReactProject\school\BFP_STATIONS\BFP_ADMIN
npm run dev
```

**Terminal 2 - Substation_admin (Substation Signup):**
```powershell
cd c:\Users\ERN FRANCIS\OneDrive\Desktop\ReactProject\school\BFP_STATIONS\Substation_admin
npm run dev
```

---

## Testing the Signup Flow

### Test 1: BFP_ADMIN Main Station Signup

1. Open BFP_ADMIN signup page
2. Fill form:
   - **First Name:** Admin
   - **Last Name:** Officer
   - **ID Number:** BFP-50001
   - **Rank:** Chief Officer
   - **Station Name:** Central Fire Station Zamboanga
   - **Latitude:** 7.5
   - **Longitude:** 122.0
   - **Contact Number:** 991-226-7695
   - **Station Type:** (disabled, shows "Main Station")
   - **Password:** Test@12345
   - **Confirm Password:** Test@12345
3. Click "Sign Up"
4. Expect: Success message, redirect to login

**Verify in database:**
```sql
SELECT f.station_id, f.station_name, f.station_type, u.first_name, u.assigned_station_id
FROM fire_stations f
LEFT JOIN users u ON f.station_id = u.assigned_station_id
WHERE f.station_name = 'Central Fire Station Zamboanga';
```

### Test 2: Substation_admin Substation Signup

1. Open Substation_admin signup page
2. Fill form:
   - **First Name:** Sub
   - **Last Name:** Officer
   - **ID Number:** BFP-50002
   - **Rank:** Fire Officer 1
   - **Station Name:** Sta Catalina Fire Station
   - **Latitude:** 7.515
   - **Longitude:** 122.015
   - **Contact Number:** 991-226-7700
   - **Station Type:** (disabled, shows "Substation")
   - **Password:** Test@12345
   - **Confirm Password:** Test@12345
3. Click "Sign Up"
4. Expect: Success message, redirect to login

**Verify in database:**
```sql
SELECT f.station_id, f.station_name, f.station_type, u.first_name, u.assigned_station_id
FROM fire_stations f
LEFT JOIN users u ON f.station_id = u.assigned_station_id
WHERE f.station_name = 'Sta Catalina Fire Station';
```

### Test 3: Login & Verify Station Info

1. Login with either created account (e.g., BFP-50001 / Test@12345)
2. Check browser DevTools → Application → Local Storage
3. Look for `user` key and decode the JSON
4. Expected structure:
```json
{
  "id": 123,
  "idNumber": "BFP-50001",
  "name": "Admin Officer",
  "firstName": "Admin",
  "lastName": "Officer",
  "rank": "Chief Officer",
  "assignedStationId": 106,
  "stationInfo": {
    "station_id": 106,
    "station_name": "Central Fire Station Zamboanga",
    "latitude": 7.5,
    "longitude": 122.0,
    "station_type": "Main"
  }
}
```

---

## Using Station Data for KNN Routing

Once an incident is created with user coordinates:

```javascript
// 1. Get all active fire stations
const [stations] = await connection.query(
  `SELECT station_id, station_name, latitude, longitude, station_type 
   FROM fire_stations 
   WHERE is_ready = 1`
);

// 2. Calculate distance to incident coordinates using KNN (simple Euclidean distance)
const incidentLat = 7.51;
const incidentLng = 122.01;

const distances = stations.map(station => ({
  ...station,
  distance: Math.sqrt(
    Math.pow(station.latitude - incidentLat, 2) + 
    Math.pow(station.longitude - incidentLng, 2)
  )
}));

// 3. Sort by distance and select nearest
const nearestStation = distances.sort((a, b) => a.distance - b.distance)[0];

// 4. Dispatch to nearest station
console.log(`Dispatching to ${nearestStation.station_name} (${nearestStation.station_type})`);
```

---

## Troubleshooting

### Issue: "Main station already exists" error
- **Cause:** Attempted to create a second Main station
- **Fix:** Only one Main station allowed. Use Substation flow for additional stations.

### Issue: Database migration fails
- **Check:** MySQL credentials, database name is `bfp_emergency_db`
- **Verify:** Run `SHOW COLUMNS FROM fire_stations;` to confirm `station_type` column exists

### Issue: Station info not appearing in JWT/login response
- **Check:** Backend has been restarted after code changes
- **Verify:** Login endpoint updated correctly (grep for `stationInfo` in `authRoutes.js`)

### Issue: Form validation errors on signup
- **Latitude/Longitude:** Must be valid numbers (e.g., 7.5, 122.0)
- **Coordinates:** Typically between -90/+90 (lat) and -180/+180 (lng) for Earth

---

## Summary

✅ **Database:** `station_type` column added to `fire_stations`  
✅ **Backend:** `/signup-station` endpoint accepts coordinates and station info  
✅ **Frontend:** Both signup flows collect and validate station data  
✅ **KNN Ready:** Station coordinates stored and available for distance-based routing  
✅ **Main/Substation:** Enforced at multiple levels (UI disabled field, backend validation)

The system is now ready to use fire station coordinates for KNN-based emergency dispatch routing!
