# Changes After Integrating `BFP_Stations-main`

This document lists the **key files we created or modified** when wiring the new Station Admin apps (`BFP_ADMIN`, `Substation_admin`) into the existing PHP backend and mobile apps.

## 1. PHP Backend (`api/`)

### New endpoints

- `api/stations.php`
  - Purpose: Provide a simple station list for admin apps.
  - Returns JSON:
    - Shape: `{ "stations": [ { station_id, station_name, station_type }, ... ] }`
    - `station_type` is derived (e.g. `Main` for central station, `Substation` for others).
  - Used by:
    - `BFP_Stations-main/BFP_ADMIN/src/pages/signup.jsx` (auto-select Main station for admin signup).

- `api/signup.php`
  - Purpose: Register Main Station Admin / users from `BFP_ADMIN` signup.
  - Input (JSON): `{ firstName, lastName, idNumber, rank, password, role?, assignedStationId? }`.
  - Behavior:
    - Validates required fields.
    - Uses `idNumber` as unique identifier (stored in `users.phone_number`).
    - Hashes password to `users.password_hash` (BCRYPT).
    - Inserts into `users` with fields:
      - `full_name`, `phone_number`, `email` (NULL), `password_hash`, `role`, `assigned_station_id`.

- `api/login.php`
  - Purpose: Login for `BFP_ADMIN` using PHP backend.
  - Input (JSON): `{ idNumber, password }` (idNumber is matched to `users.phone_number`).
  - Behavior:
    - Looks up user by `phone_number`.
    - Verifies `password_hash`.
    - Returns JSON shape compatible with original React context expectations:
      - `{ token, user: { id, idNumber, name, firstName, lastName, rank, substation, assignedStationId, stationInfo, role, assigned } }`.

### Existing endpoint adjusted earlier (for maps)

- `api/get_fire_stations.php`
  - Ensured it uses `config/database.php` correctly and returns station data used by the map.
  - No breaking changes for other consumers.

### Existing registration endpoint (end-user app)

- `api/register_start.php`
  - Already existed for **end-user** registration and OTP flow.
  - Left unchanged except for earlier DB config alignment; admin signup now uses `signup.php` instead.

---

## 2. Config / Database

- `config/database.php`
  - Confirmed and used consistently by new PHP endpoints.
  - Points to:

    ```php
    return [
        'host' => '127.0.0.1',
        'database' => 'bfp_emergency_system',
        'username' => 'root',
        'password' => ''
    ];
    ```

- `bfp_emergency_system.sql`
  - Existing schema used by all new endpoints.
  - We rely heavily on:
    - `users` table
    - `fire_stations` table

---

## 3. Main Station Admin Web App (`BFP_Stations-main/BFP_ADMIN`)

### Environment

- `BFP_Stations-main/BFP_ADMIN/.env`
  - Set API base URL:

    ```env
    VITE_API_URL=http://<LAN-IP-or-localhost>/SE_BFP/api
    ```

  - Used by React context and pages to build requests to PHP API.

### Auth context

- `BFP_Stations-main/BFP_ADMIN/src/context/AuthContext.jsx`
  - **Login**:
    - Before: `POST ${apiUrl}/login` (Node/Express backend on port 5000).
    - After:  `POST ${apiUrl}/login.php` (PHP backend under `SE_BFP/api`).
  - **Signup**:
    - Before: used `/signup` and `/signup-station` on Node/Express.
    - After:
      - No-station payload → `POST ${apiUrl}/signup.php`.
      - Station-creation flow (future) → reserved for `signup_station.php`.
  - Response handling kept compatible with the original Node routes.

### Signup page

- `BFP_Stations-main/BFP_ADMIN/src/pages/signup.jsx`
  - Station list fetching:
    - Before: `GET ${apiUrl}/stations` (Node route).
    - After:  `GET ${apiUrl}/stations.php` (PHP wrapper around `fire_stations`).
  - On mount:
    - Fetches `stations.php`.
    - Filters `station_type === 'Main'` and auto-selects first Main station.
  - Signup flow:
    - Builds a `payload` `{ firstName, lastName, idNumber, rank, password, ... }`.
    - Calls `signup(payload)` from `AuthContext`, which now hits `signup.php`.

---

## 4. End-User Mobile App (`End-User-Mobile-Proteksyon-main`)

### Map / Stations

- `End-User-Mobile-Proteksyon-main/src/screens/Emergency/MapScreen.tsx`
  - Earlier changes (before BFP_Stations integration) included:
    - Switching from native map to external `map_enduser.html` to avoid Google Maps API quota.
    - Fetching stations from `api/get_fire_stations.php`.
  - These changes are compatible with the new `BFP_Stations-main` admin apps (they share the same `fire_stations` data).

### WebRTC / Calling

- `End-User-Mobile-Proteksyon-main/src/screens/Emergency/CallTestScreen.tsx`
  - Implemented WebRTC signaling via PHP endpoints (`webrtc_send_signal.php`, `webrtc_poll_signals.php`, `webrtc_poll_for_user.php`).
  - Used for end-user to station calls; not directly touched by `BFP_Stations-main` integration, but uses the same DB.

---

## 5. Firetruck Tracking App (`mobile-firetruck-expo`)

- `mobile-firetruck-expo/src/screens/TrackingScreen.tsx`
  - Updated API URL to point to `SE_BFP/api` on your LAN IP.
  - Sends location updates to `update_firetruck_location.php` and uses the DB schema from `bfp_emergency_system.sql`.
  - Works alongside the station admin apps (they read firetruck locations via shared APIs).

---

## 6. Shared Map HTML (`map_enduser.html`)

- `map_enduser.html`
  - Created as a MapLibre + MapTiler HTML map.
  - Loads stations and firetruck locations via:
    - `api/get_fire_stations.php`
    - `api/get_firetruck_locations.php`
  - Adjusted marker styling and offsets to avoid overlap with base map POIs.

---

## 7. Root Repo / Git

- `.gitignore`
  - New root `.gitignore` added for the monorepo to ignore:
    - `node_modules/`, logs, OS junk, build outputs, etc.

- `README.md`
  - Added top-level documentation describing how to run each component:
    - PHP API
    - End-User app
    - Firetruck app
    - BFP_ADMIN
    - Substation_admin

---

## 8. Future Work (Planned but Not Yet Implemented)

- `signup_station.php`
  - Planned PHP endpoint to fully mimic Node's `/signup-station` (create fire_stations row + admin user in a transaction).
  - Frontend (`AuthContext.jsx` and any station-creation UI) is already structured to route such payloads here once implemented.

- Substation_admin integration
  - Align Substation admin pages with the same PHP endpoints (readiness, incidents, WebRTC). This will likely touch:
    - `BFP_Stations-main/Substation_admin/.env`
    - Various `Substation_admin/src/pages/*.jsx` files to call PHP API instead of any previous Node backend.
