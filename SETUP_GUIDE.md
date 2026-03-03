# BFP Emergency System — Complete Setup Guide

> **For teammates:** Follow this guide step-by-step from top to bottom. Don't skip anything.

---

## Prerequisites (Install These First)

| Tool | Version | Download Link |
|------|---------|---------------|
| **Node.js** | v18 or newer | https://nodejs.org/ |
| **npm** | Comes with Node.js | — |
| **Git** | Latest | https://git-scm.com/ |
| **Android Studio** | Latest (for mobile apps) | https://developer.android.com/studio |
| **Expo CLI** | Latest | Run `npm install -g expo-cli` |
| **A code editor** | VS Code recommended | https://code.visualstudio.com/ |

---

## Step 1: Clone the Repository

Open a terminal (Command Prompt or PowerShell) and run:

```bash
git clone https://github.com/tsun2x/BFP-SE2.git
cd BFP-SE2
```

---

## Step 2: Find Your Computer's IP Address

You need your local IP address so the mobile apps can talk to the backend.

**On Windows:**
```bash
ipconfig
```
Look for **IPv4 Address** under your Wi-Fi or Ethernet adapter (e.g. `192.168.1.100`).

**On Mac/Linux:**
```bash
ifconfig
```

Write this IP down — you'll use it in multiple places. We'll call it `YOUR_IP` below.

> **IMPORTANT:** Your phone and computer MUST be on the same Wi-Fi network.

---

## Step 3: Set Up the Backend

### 3a. Go to the backend folder
```bash
cd backend
```

### 3b. Install dependencies
```bash
npm install
```

This installs these packages (already in `package.json`):
- `express` — web server
- `cors` — cross-origin requests
- `dotenv` — environment variables
- `socket.io` — real-time communication
- `@supabase/supabase-js` — database
- `twilio` — voice calls
- `jsonwebtoken` — authentication
- `bcrypt` — password hashing
- `mysql2` — legacy DB support

### 3c. Create the `.env` file

Create a file called `.env` inside the `backend/` folder with this content:

```env
DB_HOST='127.0.0.1'
DB_PORT='3306'
DB_USER='root'
DB_PASSWORD=''
DB_NAME='bfp_emergency_system'
JWT_SECRET='your_super_secret_jwt_key_change_this_in_production'
PORT='5000'

SUPABASE_URL=<ask Mark for the Supabase URL>
SUPABASE_ANON_KEY=<ask Mark for the Supabase Anon Key>
SUPABASE_SERVICE_ROLE_KEY=<ask Mark for the Supabase Service Role Key>

TWILIO_ACCOUNT_SID=<ask Mark for the Twilio Account SID>
TWILIO_AUTH_TOKEN=<ask Mark for the Twilio Auth Token>
TWILIO_CALLER_ID=<ask Mark for the Twilio Caller ID>
TWILIO_API_KEY=<ask Mark for the Twilio API Key>
TWILIO_API_SECRET=<ask Mark for the Twilio API Secret>
TWILIO_TWIML_APP_SID=<ask Mark for the Twilio TwiML App SID>
PUBLIC_BASE_URL=https://YOUR-CLOUDFLARE-TUNNEL-URL-HERE
```

> **About PUBLIC_BASE_URL:** This needs to be a public URL that Twilio can reach. We use Cloudflare Tunnel for this. See "Cloudflare Tunnel Setup" section below.

### 3d. Start the backend
```bash
node server.js
```

You should see:
```
Server is running on http://localhost:5000
```

**Leave this terminal open!** The backend must be running for everything else to work.

---

## Step 4: Set Up Cloudflare Tunnel (for Twilio Voice)

Twilio needs a public URL to send voice webhooks to your backend. We use `cloudflared` for this.

### 4a. Install cloudflared

Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Or with npm:
```bash
npm install -g cloudflared
```

### 4b. Start the tunnel
```bash
cloudflared tunnel --url http://localhost:5000
```

It will print something like:
```
https://something-something-something.trycloudflare.com
```

### 4c. Update backend `.env`

Copy that URL and put it in your `.env` file:
```env
PUBLIC_BASE_URL=https://something-something-something.trycloudflare.com
```

Then **restart the backend** (`Ctrl+C` then `node server.js`).

The backend will automatically update the Twilio TwiML App voice URL. You'll see:
```
[TwiML] Updated TwiML App voice URL → https://...trycloudflare.com/api/twilio/voice
```

---

## Step 5: Set Up BFP Main Station Admin (Web App)

### 5a. Go to the folder
```bash
cd BFP_Stations-main/BFP_ADMIN
```

### 5b. Install dependencies
```bash
npm install
```

This installs:
- `react`, `react-dom` — UI framework
- `react-router-dom` — page navigation
- `socket.io-client` — real-time communication with backend
- `@twilio/voice-sdk` — Twilio Voice for browser
- `leaflet`, `react-leaflet` — maps
- `vite` — dev server

### 5c. Start the dev server
```bash
npm run dev
```

It will say something like:
```
Local: http://localhost:5173/
```

### 5d. Open in browser
Go to `http://localhost:5173/` in your browser.

### 5e. Log in
Use an admin account to log in. The main admin account is the one with `role = 'admin'` in the database.

> **The main admin does NOT have an assigned station.** It receives calls only after ALL substations have been tried first.

---

## Step 6: Set Up Substation Admin (Web App)

You need to run a **separate instance** for each substation. Each one runs on a different port.

### 6a. Go to the folder
```bash
cd BFP_Stations-main/Substation_admin
```

### 6b. Install dependencies
```bash
npm install
```

Same packages as BFP_ADMIN (see above).

### 6c. Start on a specific port

To run **multiple substations**, you need different ports. Open a NEW terminal for each one:

**Substation on port 5174:**
```bash
npx vite --port 5174
```

**Another substation on port 5175:**
```bash
npx vite --port 5175
```

**Another on port 5176:**
```bash
npx vite --port 5176
```

And so on. Each substation runs in its own browser tab.

### 6d. Log in to each substation

Open each URL in a **separate browser tab**:
- `http://localhost:5174/` → Log in as substation user (e.g. station 2)
- `http://localhost:5175/` → Log in as substation user (e.g. station 3)
- `http://localhost:5176/` → Log in as substation user (e.g. station 4)

Each substation admin user has an `assigned_station_id` in the database. When they log in, they automatically join their station's socket room.

> **TIP:** Use different browsers (Chrome, Edge, Firefox) or Chrome Incognito windows to avoid Twilio identity bleed between tabs.

---

## Step 7: Set Up the End-User Mobile App (Civilian App)

### 7a. Go to the folder
```bash
cd End-User-Mobile-Proteksyon-main
```

### 7b. Install dependencies
```bash
npm install
```

Key packages:
- `expo` — React Native framework
- `socket.io-client` — real-time communication
- `@twilio/voice-react-native-sdk` — Twilio Voice for mobile
- `expo-location` — GPS
- `react-native-maps` — maps
- `@supabase/supabase-js` — database

### 7c. Update the config file

Open `src/config.ts` and change the IP to YOUR computer's IP:

```typescript
export const API_URL = 'http://YOUR_IP:5000';
export const NODE_API_URL = 'http://YOUR_IP:5000';
export const TEST_CALLER_PHONE = '+639000000000';
```

Replace `YOUR_IP` with the IP you found in Step 2 (e.g. `192.168.1.100`).

### 7d. Create the `.env` file

Create a `.env` file in the `End-User-Mobile-Proteksyon-main/` folder:

```env
EXPO_PUBLIC_SUPABASE_URL=<same Supabase URL as backend>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<same Supabase Anon Key as backend>
```

### 7e. Start the app

**For Expo Go (simple testing):**
```bash
npx expo start
```

**For development build (needed for Twilio Voice):**
```bash
npx expo run:android
```

> **NOTE:** Twilio Voice SDK requires a **development build** (not Expo Go). If you're just testing the UI without voice, Expo Go works fine.

### 7f. Scan QR code
If using Expo Go, scan the QR code with the Expo Go app on your phone.

---

## Step 8: Set Up the Firetruck Mobile App

### 8a. Go to the folder
```bash
cd mobile-firetruck-expo
```

### 8b. Install dependencies
```bash
npm install
```

Key packages:
- `expo` — React Native framework
- `@supabase/supabase-js` — database
- `expo-location` — GPS tracking
- `expo-notifications` — push notifications
- `@react-native-async-storage/async-storage` — local storage

### 8c. Update the config file

Open `src/config.ts` and change the IP:

```typescript
export const API_URL = 'http://YOUR_IP:5000';
```

Replace `YOUR_IP` with the same IP from Step 2.

### 8d. Start the app
```bash
npx expo start
```

---

## How the Failover System Works

When a civilian reports an emergency:

1. **Backend finds the nearest fire station** using KNN (latitude/longitude)
2. **Station gets a modal + Twilio voice call** — they have **15 seconds** to accept
3. If they don't answer → **auto-reject fires** → modal dismissed, Twilio call rejected
4. **Next nearest station gets the call** — same 15-second timer
5. This repeats through ALL substations
6. If ALL substations fail → **Main Admin gets the call** — 15-second timer
7. If Main Admin fails → **"No answer"** sent to the civilian app

**When the civilian hangs up:**
- A `call-cancelled` event is sent to the backend
- Backend cancels the failover timer
- All station modals are dismissed via `auto-reject`

---

## Credentials Reference

All credentials are stored in the `.env` files which are NOT committed to GitHub for security.

**Ask Mark for the credentials file** — he will send you the `.env` files directly (via Discord, Messenger, etc.).

You need `.env` files for:
1. `backend/.env` — Supabase, Twilio, JWT credentials
2. `End-User-Mobile-Proteksyon-main/.env` — Supabase credentials

The credentials include:
- **Supabase** — URL, Anon Key, Service Role Key
- **Twilio** — Account SID, Auth Token, Caller ID, API Key, API Secret, TwiML App SID
- **JWT** — Secret key for authentication tokens

---

## Summary of What Runs Where

| App | Folder | Command | URL/Port |
|-----|--------|---------|----------|
| **Backend** | `backend/` | `node server.js` | `http://localhost:5000` |
| **Main Admin** | `BFP_Stations-main/BFP_ADMIN/` | `npm run dev` | `http://localhost:5173` |
| **Substation 1** | `BFP_Stations-main/Substation_admin/` | `npx vite --port 5174` | `http://localhost:5174` |
| **Substation 2** | `BFP_Stations-main/Substation_admin/` | `npx vite --port 5175` | `http://localhost:5175` |
| **Substation 3** | `BFP_Stations-main/Substation_admin/` | `npx vite --port 5176` | `http://localhost:5176` |
| **Civilian App** | `End-User-Mobile-Proteksyon-main/` | `npx expo start` | Phone via QR |
| **Firetruck App** | `mobile-firetruck-expo/` | `npx expo start` | Phone via QR |

---

## Quick Start (TL;DR)

Open **5 terminals** and run in order:

```bash
# Terminal 1: Backend
cd backend && npm install && node server.js

# Terminal 2: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5000

# Terminal 3: Main Admin
cd BFP_Stations-main/BFP_ADMIN && npm install && npm run dev

# Terminal 4: Substation
cd BFP_Stations-main/Substation_admin && npm install && npx vite --port 5174

# Terminal 5: Mobile App
cd End-User-Mobile-Proteksyon-main && npm install && npx expo start
```

---

## Troubleshooting

### "Cannot connect to server" on mobile
- Make sure your phone and PC are on the **same Wi-Fi**
- Check that `src/config.ts` has the correct IP (not `localhost`)
- Make sure the backend is running on port 5000

### "Twilio Voice not working"
- You need a **Cloudflare tunnel** running
- The backend auto-updates the TwiML App URL on startup — check the console for the `[TwiML]` log
- For the mobile app, Twilio Voice needs a **development build** (not Expo Go)

### "Station doesn't get incoming call modal"
- Make sure the station user has `assigned_station_id` set in the database
- The user must be logged in and the socket must be connected (check browser console)
- Hard-refresh the page (`Ctrl+Shift+R`)

### "Multiple stations ring at the same time (bleed-over)"
- Use **different browsers** for different stations (Chrome, Edge, Firefox, Incognito)
- Hard-refresh all tabs after code changes
- The identity filter in `useTwilioVoice.js` auto-rejects misrouted calls

### "Main admin doesn't get calls"
- Main admin only gets calls **after ALL substations have been tried**
- Each station gets 15 seconds before failover
- The failover timer is currently set to 15 seconds (testing) in `backend/services/dispatchService.js`

---

## Changes Made (March 3-4, 2026 Session)

### Backend (`backend/`)
- **`server.js`** — Added `join-main-admin` socket handler, `call-cancelled` handler (cancels failover + dismisses all station modals when civilian hangs up), imported `cancelFailover` and `getFailoverEntry`
- **`services/dispatchService.js`** — Complete failover rewrite: 15s timer per station, auto-reject emitted to previous station before moving to next, main admin gets call only after all substations exhausted, `getFailoverEntry()` export added, last-substation edge case fixed (was skipping directly to main admin)
- **`routes/incidentRoutes.js`** — Removed main-admin emission on initial dispatch, added `isMainAdmin` handling in accept API, `call-accepted` event with station name
- **`routes/twilioTokenRoutes.js`** — Removed automatic `ADM_MAIN` ringing on every substation call

### Main Admin (`BFP_Stations-main/BFP_ADMIN/`)
- **`src/App.jsx`** — Main admin only joins `main-admin` room (not station rooms), added `auto-reject` listener with refs to avoid stale closures, removed standalone Twilio Voice modal (socket modal handles everything), Accept/Dismiss buttons also accept/reject Twilio call, `stationId='main'` on accept
- **`src/hooks/useTwilioVoice.js`** — Added identity filter: rejects incoming Twilio calls not addressed to this device's identity

### Substation (`BFP_Stations-main/Substation_admin/`)
- **`src/App.jsx`** — Added `auto-reject` listener with refs for `twilioIncomingCall`/`twilioRejectIncoming`, removed standalone Twilio Voice modal, Accept/Dismiss buttons also accept/reject Twilio call
- **`src/hooks/useTwilioVoice.js`** — Added identity filter (same as main admin)

### Civilian Mobile App (`End-User-Mobile-Proteksyon-main/`)
- **`src/screens/Emergency/EmergencyCallScreen.tsx`** — Added `voipHangUpRef` to fix stale closure in failover handler, emits `call-cancelled` when user hangs up, now dials `ADM_MAIN` via Twilio on failover to main admin
- **`src/hooks/useTwilioVoice.ts`** — Added `activeCallRef` so `hangUp` and `makeCall` always have the latest call, `makeCall` disconnects previous call before dialing new one (prevents bleed-over)
