# BFP Emergency System — Changes (March 10, 2026)

> **Branch:** `fix/firetruck-tracking-and-map-icons`  
> **Summary:** Fixed firetruck location tracking not showing on admin maps, eliminated repeated truck-status notifications, and added distinct map icons for callers vs firetrucks.

---

## Table of Contents

1. [Firetruck Location Not Showing on Admin Maps](#1-firetruck-location-not-showing-on-admin-maps)
2. [Repeated Firetruck Notifications Fixed (Show Only Once)](#2-repeated-firetruck-notifications-fixed-show-only-once)
3. [Distinct Map Icons: Caller (📱) vs Firetruck (🚒)](#3-distinct-map-icons-caller--vs-firetruck-)
4. [Real-Time Socket-Based Map Updates](#4-real-time-socket-based-map-updates)

---

## 1. Firetruck Location Not Showing on Admin Maps

**Files changed:**
- `backend/routes/firetruckTrackingRoutes.js`
- `backend/routes/incidentRoutes.js`

**What was wrong:**  
The POST `/api/firetrucks/track` endpoint was writing GPS data to a table called `firetruck_locations`, and the GET `/api/firetruck-locations` endpoint was reading from `firetruck_location_history` — **neither table matched**. The actual Supabase table is `firetruck_location_history`, so writes silently failed and reads returned empty results. The map never showed any firetruck.

**What was done:**
- Changed POST `/api/firetrucks/track` to insert into `firetruck_location_history` with correct columns (`truck_id`, `latitude`, `longitude`, `speed`, `heading`, `accuracy`, `recorded_at`)
- Changed GET `/api/firetruck-locations` to read from `firetruck_location_history` using the `recorded_at` column
- Removed non-existent columns (`battery_level`, `alarm_level`, `fire_status`, `updated_at`) from the insert payload to match the actual schema

**Database table used:** `firetruck_location_history` (columns: `location_id`, `truck_id`, `alarm_id`, `latitude`, `longitude`, `speed`, `heading`, `accuracy`, `recorded_at`, `created_at`)

---

## 2. Repeated Firetruck Notifications Fixed (Show Only Once)

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/App.jsx`
- `BFP_Stations-main/Substation_admin/src/App.jsx`
- `backend/routes/firetruckTrackingRoutes.js`

**What was wrong:**  
Every 5 seconds the firetruck app broadcasts its location. Two issues caused notification spam:

1. **Double broadcast:** The mobile app emits `truck-status-update` via Socket.IO, AND the REST `PUT /api/firetrucks/status` endpoint ALSO emits the same event via `io.emit()`. Every location update generated **two** identical notifications.
2. **No deduplication:** The admin dashboards created a notification + toast for **every** socket event, even when the truck's status/alarm hadn't changed.

**What was done:**
- **Removed the duplicate socket broadcast** from the REST `PUT /api/firetrucks/status` endpoint — the mobile app already emits `truck-status-update` via socket, so the REST handler only saves to the database now.
- **Added deduplication** in both BFP_ADMIN and Substation_admin `App.jsx`: a `lastTruckStatus` map tracks each truck's last `fireStatus|alarmLevel` key. Notifications only fire when the status genuinely changes (e.g., "Standby" → "En Route"), not on every 5-second location ping.

**Result:** Admins now see exactly **one** notification per status change instead of one every 5 seconds.

---

## 3. Distinct Map Icons: Caller (📱) vs Firetruck (🚒)

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/components/MapContainer.jsx`
- `BFP_Stations-main/Substation_admin/src/components/MapContainer.jsx`
- `BFP_Stations-main/BFP_ADMIN/src/style/mapcontainer.css`
- `BFP_Stations-main/Substation_admin/src/style/mapcontainer.css`

**What was wrong:**  
The incident/caller location used the default blue Leaflet pin — the same icon for everything. There was no visual distinction between where the caller is and where the firetruck is on the map.

**What was done:**
- **Caller/end-user location:** Now shows a 📱 phone emoji icon (via Leaflet `divIcon`). Popup label says "📱 Caller / Incident Location".
- **Firetruck location:** Still shows the 🚒 firetruck emoji icon. Popup now also shows driver name and fire status.
- Added `.caller-marker` CSS class in both dashboards with drop-shadow styling.

---

## 4. Real-Time Socket-Based Map Updates

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/components/MapContainer.jsx`
- `BFP_Stations-main/Substation_admin/src/components/MapContainer.jsx`

**What was wrong:**  
The map only used REST polling (every 5 seconds) to show firetruck positions. If the REST endpoint failed (e.g., JWT expired, table mismatch), the map showed nothing — even though socket events with lat/lng were being received just fine.

**What was done:**
- MapContainer now **also listens to `truck-status-update` socket events** in real-time.
- Socket-received positions are stored in a ref and merged with REST-polled data.
- If the REST call fails (network error, auth issue), the map **falls back to socket-only data** so trucks still appear.
- The two data sources are merged with socket data winning when it's newer.
- Firetruck popup now shows: truck ID, driver name, fire status, and last update time.

**Result:** Firetrucks appear on the map immediately via socket, even if the REST API is down.

---

## Summary of All Files Changed

| File | Changes |
|------|---------|
| `backend/routes/firetruckTrackingRoutes.js` | Fixed table name to `firetruck_location_history`, removed duplicate socket broadcast from PUT endpoint |
| `backend/routes/incidentRoutes.js` | Fixed GET `/firetruck-locations` to read from `firetruck_location_history` with correct columns |
| `BFP_Stations-main/BFP_ADMIN/src/App.jsx` | Added truck-status notification deduplication |
| `BFP_Stations-main/Substation_admin/src/App.jsx` | Added truck-status notification deduplication |
| `BFP_Stations-main/BFP_ADMIN/src/components/MapContainer.jsx` | Added 📱 caller icon, 🚒 firetruck icon, real-time socket map updates |
| `BFP_Stations-main/Substation_admin/src/components/MapContainer.jsx` | Added 📱 caller icon, 🚒 firetruck icon, real-time socket map updates |
| `BFP_Stations-main/BFP_ADMIN/src/style/mapcontainer.css` | Added `.caller-marker` CSS |
| `BFP_Stations-main/Substation_admin/src/style/mapcontainer.css` | Added `.caller-marker` CSS |
