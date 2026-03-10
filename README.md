# BFP Emergency System Monorepo

This folder contains all parts of the BFP Emergency System:

- `api/` – PHP backend APIs (XAMPP/Apache, MySQL)
- `config/` – PHP database config
- `backend/` – Legacy / experimental backend pieces (if any)
- `End-User-Mobile-Proteksyon-main/` – React Native end-user mobile app
- `mobile-firetruck-expo/` – React Native firetruck tracking app
- `BFP_Stations-main/` – Web apps for station admin and substations
  - `BFP_Stations-main/BFP_ADMIN/` – Main Station Admin web app (Vite + React)
  - `BFP_Stations-main/Substation_admin/` – Substation Admin web app (Vite + React)
- `map_enduser.html` – MapLibre/MapTiler web map used by the end-user app
- `station_client.html` – Web client for station WebRTC / map (if used)

Below are quick instructions to run/test each part.

---

## 1. PHP Backend API (`api/`)

### Requirements

- XAMPP (Apache + MySQL/MariaDB)
- Database imported from `bfp_emergency_system.sql`

### Setup

1. Copy this project under XAMPP htdocs (already done in this repo):
   - `C:/Users/Mark/Desktop/xampp/htdocs/SE_BFP`
2. Start **Apache** and **MySQL** in XAMPP Control Panel.
3. Import the database:
   - Open `http://localhost/phpmyadmin`
   - Create database `bfp_emergency_system` if it doesnt exist.
   - Import `bfp_emergency_system.sql` from this repo.
4. Verify DB config in `config/database.php`:

   ```php
   return [
       'host' => '127.0.0.1',
       'database' => 'bfp_emergency_system',
       'username' => 'root',
       'password' => ''
   ];
   ```

### Test APIs

In a browser on the same machine:

- Stations list (for admin signup):
  - `http://127.0.0.1/SE_BFP/api/stations.php`
- Fire stations for map:
  - `http://127.0.0.1/SE_BFP/api/get_fire_stations.php`
- Firetruck locations:
  - `http://127.0.0.1/SE_BFP/api/get_firetruck_locations.php`

Update IP when testing from a phone / other device (e.g. `http://<your-LAN-IP>/SE_BFP/api/...`).

---

## 2. End-User Mobile App (`End-User-Mobile-Proteksyon-main/`)

### Requirements

- Node.js + npm
- Expo CLI / EAS (for dev client)
- Android device or emulator

### Setup

1. In a terminal:

   ```bash
   cd End-User-Mobile-Proteksyon-main
   npm install
   ```

2. Configure backend URL in `src/config.ts`:

   ```ts
   export const API_URL = "http://<your-LAN-IP>/SE_BFP/api";
   ```

3. Start the app:

   ```bash
   npx expo start --dev-client
   ```

4. Open on device (Expo Go or dev client) and test:
   - Emergency call test screen
   - Map screen (opens `map_enduser.html` in browser)

---

## 3. Firetruck Tracking App (`mobile-firetruck-expo/`)

### Requirements

- Node.js + npm
- Expo CLI
- Android device with GPS

### Setup

1. In a terminal:

   ```bash
   cd mobile-firetruck-expo
   npm install
   ```

2. Configure backend URL in `src/screens/TrackingScreen.tsx` (already wired to `API_URL` constant or hardcoded IP). Ensure it matches your LAN IP:

   ```ts
   const API_URL = "http://<your-LAN-IP>/SE_BFP/api";
   ```

3. Start the app:

   ```bash
   npx expo start --dev-client
   ```

4. On the device, go to the tracking screen and:
   - Grant location permission
   - Start tracking to send updates to `update_firetruck_location.php`

---

## 4. Main Station Admin Web App (`BFP_Stations-main/BFP_ADMIN/`)

This is a Vite + React admin dashboard for the main station.

### Requirements

- Node.js + npm

### Setup

1. Configure API base URL in `.env`:

   ```env
   VITE_API_URL=http://127.0.0.1/SE_BFP/api
   ```

   Or use your LAN IP if accessing from another machine:

   ```env
   VITE_API_URL=http://<your-LAN-IP>/SE_BFP/api
   ```

2. Install dependencies and start dev server:

   ```bash
   cd BFP_Stations-main/BFP_ADMIN
   npm install
   npm run dev
   ```

3. Open the app:
   - `http://localhost:5173/`

4. Signup / Login
   - Signup calls `api/signup.php` (for main admin)
   - Login calls `api/login.php`
   - Stations dropdown uses `api/stations.php`

---

## 5. Substation Admin Web App (`BFP_Stations-main/Substation_admin/`)

Similar stack to BFP_ADMIN.

### Setup (typical)

1. Configure API base URL in its `.env` file, for example:

   ```env
   VITE_API_URL=http://127.0.0.1/SE_BFP/api
   ```

2. Install and run:

   ```bash
   cd BFP_Stations-main/Substation_admin
   npm install
   npm run dev
   ```

3. Open the app (Vite will show the local dev URL, usually `http://localhost:5174/` or similar).

Endpoints used will be aligned to the same PHP `api/` backend (e.g., readiness status, incident listing) once fully integrated.

---

## 6. Map HTML Pages

- `map_enduser.html`
  - A MapLibre + MapTiler map used by the end-user app.
  - Can also be opened directly in a browser:
    - `http://127.0.0.1/SE_BFP/map_enduser.html`

- `station_client.html`
  - Web client for stations (WebRTC signaling + map integration), if used in your deployment.

---

## 7. Notes

- Always make sure XAMPP Apache + MySQL are running before testing any app.
- When testing from a phone on the same Wi-Fi / hotspot, always use the **LAN IP** (e.g. `192.168.x.x`) instead of `localhost`.
- Keep `VITE_API_URL` and the mobile apps' `API_URL` values in sync with the actual backend address.
