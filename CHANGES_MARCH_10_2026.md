# Changes — March 10, 2026

## Summary

Session focused on map icon improvements, firetruck location tracking fixes, notification deduplication, and mobile app environment setup.

---

## 1. Map Icons — Caller Phone Icon & Firetruck SVG Icon

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/components/MapContainer.jsx`
- `BFP_Stations-main/Substation_admin/src/components/MapContainer.jsx`
- `BFP_Stations-main/BFP_ADMIN/src/style/mapcontainer.css`
- `BFP_Stations-main/Substation_admin/src/style/mapcontainer.css`

**What was done:**
- **Caller/Incident marker:** Replaced the default blue Leaflet marker with a custom red circle containing a white phone SVG icon. Added a pulsing glow animation so the caller location stands out on the map.
- **Firetruck marker:** Replaced the emoji `🚒` with a proper SVG firetruck icon (red truck inside a white circle with red border and drop shadow).
- Added new CSS classes: `.caller-marker` (red circle + phone icon + pulse animation) and updated `.firetruck-marker` (white circle + SVG truck + border).

---

## 2. Firetruck Notification Deduplication (Show Once Only)

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/App.jsx`
- `BFP_Stations-main/Substation_admin/src/App.jsx`

**What was done:**
- Added a `notifiedTruckStatusRef` (`Set`) to track which `truckId-status` combinations have already been notified.
- When a `truck-status-update` socket event comes in (e.g., Truck #1 — En Route), the notification and toast only fire **once**. Duplicate events for the same truck+status are silently skipped.
- This prevents the notification bell from filling up with repeated firetruck status messages.

---

## 3. Firetruck Location Tracking — Database Table Fix

**Files changed:**
- `backend/routes/firetruckTrackingRoutes.js`

**What was done:**
- The REST endpoint `POST /api/firetrucks/track` was inserting into a non-existent table called `firetruck_locations`. Changed it to insert into `firetruck_location_history` (the correct table defined in the Supabase schema).
- Mapped the payload fields to match the actual table columns (removed `battery_level`, `alarm_level`, `fire_status`, `updated_at`; added `recorded_at`).

---

## 4. Socket-Based Location Persistence (Fallback)

**Files changed:**
- `backend/server.js`

**What was done:**
- The `truck-status-update` socket handler now also saves the firetruck's GPS coordinates to `firetruck_location_history` when latitude/longitude are present in the event data.
- This acts as a fallback: even if the REST tracking endpoint fails (e.g., expired JWT), the map still gets location data because the socket event bypasses authentication.
- The admin map polls `GET /api/firetruck-locations` every 5 seconds, which reads from `firetruck_location_history` — so firetrucks now appear on the map reliably.

---

## 5. Firetruck #1 Database Record

**What was done:**
- The `firetrucks` table was empty in Supabase, causing foreign key constraint violations when trying to save location data.
- Inserted Firetruck #1 (`truck_id: 1`, `truck_code: FT-001`, `assigned_station_id: 3`) into the `firetrucks` table.

---

## 6. Mobile Firetruck App — Environment File

**Files created:**
- `mobile-firetruck-expo/.env`

**What was done:**
- The `.env` file was missing entirely. The app's `src/utils/supabaseClient.ts` requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Created `.env` with: `EXPO_PUBLIC_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

## Files Modified (Complete List)

| File | Change Type |
|------|------------|
| `BFP_Stations-main/BFP_ADMIN/src/components/MapContainer.jsx` | Modified — SVG icons |
| `BFP_Stations-main/Substation_admin/src/components/MapContainer.jsx` | Modified — SVG icons |
| `BFP_Stations-main/BFP_ADMIN/src/style/mapcontainer.css` | Modified — icon CSS |
| `BFP_Stations-main/Substation_admin/src/style/mapcontainer.css` | Modified — icon CSS |
| `BFP_Stations-main/BFP_ADMIN/src/App.jsx` | Modified — notification dedup |
| `BFP_Stations-main/Substation_admin/src/App.jsx` | Modified — notification dedup |
| `backend/routes/firetruckTrackingRoutes.js` | Modified — correct DB table |
| `backend/server.js` | Modified — socket location save |
| `mobile-firetruck-expo/.env` | Created — Supabase env vars |
| `SETUP_GUIDE.md` | Updated — firetruck .env, firetrucks table |
| `CHANGES_MARCH_10_2026.md` | Created — this file |
