# BFP Emergency System — Complete Setup Guide

> **For teammates:** Follow this guide step-by-step from top to bottom. Read everything. Don't skip steps. If something breaks, check the Troubleshooting section at the bottom.

---

## What Is This Project?

This project has **5 apps** that all talk to each other:

1. **Backend** — The brain. It lives on your computer and all the other apps connect to it.
2. **Main Admin Dashboard** — A website for the BFP headquarters person. They see all emergencies.
3. **Substation Admin Dashboard** — A website for each fire station. They get calls when there's a fire near them.
4. **Civilian App** — A phone app for regular people. They use it to report fires.
5. **Firetruck App** — A phone app for firetruck drivers. They see where to go and can update their status (like "going to fire" or "fire is out").

**How they connect:** All 5 apps talk to the Backend. The Backend talks to the Supabase database (where all data is stored) and to Twilio (which handles phone calls).

---

## What You Need to Install First

Before you do ANYTHING, install these programs on your computer:

| What | Why You Need It | Where to Get It |
|------|----------------|-----------------|
| **Node.js** (v18 or newer) | Runs all the code | https://nodejs.org/ (click the big green button) |
| **Git** | Downloads the code from GitHub | https://git-scm.com/ |
| **Android Studio** | Needed for the phone apps | https://developer.android.com/studio |
| **A code editor** | To look at and edit code | https://code.visualstudio.com/ (VS Code) |

After installing Node.js, open a terminal and run this to install Expo (the tool that runs phone apps):
```bash
npm install -g expo-cli
```

**How to check if Node.js is installed:** Open a terminal and type `node -v`. It should show a version number like `v18.17.0`.

---

## Step 1: Download the Code

Open a terminal (on Windows: search for "PowerShell" and open it) and type:

```bash
git clone https://github.com/tsun2x/BFP-SE2.git
cd BFP-SE2
```

This downloads the entire project into a folder called `BFP-SE2`. All the 5 apps are inside this folder.

Here's what's inside:
```
BFP-SE2/
├── backend/                          ← The brain (Step 3)
├── BFP_Stations-main/
│   ├── BFP_ADMIN/                    ← Main admin website (Step 5)
│   └── Substation_admin/             ← Station website (Step 6)
├── End-User-Mobile-Proteksyon-main/  ← Civilian phone app (Step 7)
└── mobile-firetruck-expo/            ← Firetruck phone app (Step 8)
```

---

## Step 2: Figure Out How Your Phone Will Talk to Your Computer

Your phone apps need to talk to the backend on your computer. There are **two ways** to do this:

### Option A: Same Wi-Fi (the normal way)

Your phone and computer must be on the **exact same Wi-Fi network**.

Find your computer's IP address:
- **Windows:** Open PowerShell, type `ipconfig`, look for **IPv4 Address** (looks like `192.168.1.100`)
- **Mac/Linux:** Open terminal, type `ifconfig`

Write this number down. We'll call it `YOUR_IP`.

> **WARNING:** Some routers (like PLDT Huawei fiber routers) block phone-to-computer communication even on the same Wi-Fi. If your phone can't connect, use Option B instead.

### Option B: Cloudflare Tunnel (if same Wi-Fi doesn't work)

This creates a public URL that your phone can use from anywhere.

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Run: `cloudflared tunnel --url http://localhost:5000`
3. It gives you a URL like `https://something-something.trycloudflare.com`
4. Use THIS URL instead of `http://YOUR_IP:5000` everywhere

> **NOTE:** The Cloudflare URL changes every time you restart the tunnel. You'll need to update the config files each time.

---

## Step 3: Start the Backend (THE MOST IMPORTANT STEP)

**Nothing else works without the backend running.** Always start this first.

### 3a. Open a terminal and go to the backend folder
```bash
cd backend
```

### 3b. Install all the stuff it needs
```bash
npm install
```
(This downloads a bunch of code libraries. Just wait for it to finish.)

### 3c. Create the secret settings file

You need a file called `.env` inside the `backend/` folder. This file has passwords and secret keys.

**Ask Mark for the `.env` file.** He'll send it to you. Put it inside the `backend/` folder.

If you need to create it yourself, it looks like this:
```env
DB_HOST='127.0.0.1'
DB_PORT='3306'
DB_USER='root'
DB_PASSWORD=''
DB_NAME='bfp_emergency_system'
JWT_SECRET='your_super_secret_jwt_key_change_this_in_production'
PORT='5000'

SUPABASE_URL=<ask Mark>
SUPABASE_ANON_KEY=<ask Mark>
SUPABASE_SERVICE_ROLE_KEY=<ask Mark>

TWILIO_ACCOUNT_SID=<ask Mark>
TWILIO_AUTH_TOKEN=<ask Mark>
TWILIO_CALLER_ID=<ask Mark>
TWILIO_API_KEY=<ask Mark>
TWILIO_API_SECRET=<ask Mark>
TWILIO_TWIML_APP_SID=<ask Mark>
PUBLIC_BASE_URL=https://YOUR-CLOUDFLARE-TUNNEL-URL-HERE
```

### 3d. Start it!
```bash
node server.js
```

If it worked, you'll see:
```
Server is running on http://localhost:5000
```

**DO NOT CLOSE THIS TERMINAL.** The backend must stay running the entire time. If you close it, everything stops.

---

## Step 4: Set Up Cloudflare Tunnel (for Twilio Voice Calls)

Twilio (the service that makes phone calls work) needs to be able to reach your backend from the internet. Since your computer is not on the internet, we use a "tunnel" to make it reachable.

### 4a. Open a NEW terminal (don't close the backend one!)

### 4b. Run the tunnel
```bash
cloudflared tunnel --url http://localhost:5000
```

### 4c. Copy the URL it gives you

It will print something like:
```
https://apple-banana-cherry.trycloudflare.com
```

### 4d. Put that URL in the backend `.env` file

Open `backend/.env` and change this line:
```env
PUBLIC_BASE_URL=https://apple-banana-cherry.trycloudflare.com
```

### 4e. Restart the backend

Go to the backend terminal, press `Ctrl+C` to stop it, then run `node server.js` again.

You should see this message which means it worked:
```
[TwiML] Updated TwiML App voice URL → https://apple-banana-cherry.trycloudflare.com/api/twilio/voice
```

**If you're using the tunnel for phone apps too** (Option B from Step 2), this same URL is what you'll put in the phone app config files.

---

## Step 5: Start the Main Admin Dashboard (Website)

This is the website for the BFP headquarters person.

### 5a. Open a NEW terminal

### 5b. Go to the folder and install stuff
```bash
cd BFP_Stations-main/BFP_ADMIN
npm install
```

### 5c. Start it
```bash
npm run dev
```

### 5d. Open your browser and go to:
```
http://localhost:5173/
```

### 5e. Log in

Use an admin account (one with `role = 'admin'` in the database). **Ask Mark for the login credentials.**

> **Good to know:** The main admin only gets emergency calls AFTER all fire stations have been tried and nobody answered. It's the last resort.

---

## Step 6: Start the Substation Admin Dashboard (Website)

This is the website for individual fire stations. You can run multiple stations at the same time — each one just uses a different port number.

### 6a. Open a NEW terminal for each station

### 6b. Go to the folder and install stuff (only need to do this once)
```bash
cd BFP_Stations-main/Substation_admin
npm install
```

### 6c. Start each station on a different port

**Station 1:**
```bash
npx vite --port 5174
```

**Station 2:** (open another terminal)
```bash
npx vite --port 5175
```

**Station 3:** (open another terminal)
```bash
npx vite --port 5176
```

### 6d. Open each one in your browser

- `http://localhost:5174/` → Log in as station 2's user
- `http://localhost:5175/` → Log in as station 3's user
- `http://localhost:5176/` → Log in as station 4's user

Each station user has an `assigned_station_id` in the database. When they log in, they automatically connect to their station.

> **TIP:** Use different browsers (Chrome, Edge, Firefox, Incognito) for different stations. If you use the same browser for multiple stations, the Twilio voice calls can get confused about who to ring.

---

## Step 7: Start the Civilian Phone App

This is the app regular people use to report fires and emergencies.

### 7a. Open a NEW terminal

### 7b. Go to the folder and install stuff
```bash
cd End-User-Mobile-Proteksyon-main
npm install
```

### 7c. Tell the app where the backend is

Open the file `src/config.ts` and change it:

**If using same Wi-Fi (Option A):**
```typescript
export const API_URL = 'http://192.168.1.100:5000';      // ← put YOUR IP here
export const NODE_API_URL = 'http://192.168.1.100:5000';  // ← same IP
```

**If using Cloudflare tunnel (Option B):**
```typescript
export const API_URL = 'https://apple-banana-cherry.trycloudflare.com';      // ← your tunnel URL
export const NODE_API_URL = 'https://apple-banana-cherry.trycloudflare.com';  // ← same URL
```

### 7d. Create the `.env` file

Create a file called `.env` in the `End-User-Mobile-Proteksyon-main/` folder:
```env
EXPO_PUBLIC_SUPABASE_URL=<ask Mark>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ask Mark>
```

### 7e. Start the app

**Simple way (Expo Go — good for testing the UI):**
```bash
npx expo start
```
Then scan the QR code with the Expo Go app on your phone.

**Full way (needed for voice calls to work):**
```bash
npx expo run:android
```

> **NOTE:** Twilio voice calls ONLY work with a development build (`expo run:android`), NOT with Expo Go. If you just want to test screens and buttons, Expo Go is fine.

---

## Step 8: Start the Firetruck Phone App

This is the app for firetruck drivers. They use it to:
- See where to go
- Track their GPS location
- Set alarm levels (1st Alarm, 2nd Alarm, etc.)
- Update their status (En Route, On Scene, Fire Out)
- Broadcast all of this in real-time to the admin dashboards

### 8a. Open a NEW terminal

### 8b. Go to the folder and install stuff
```bash
cd mobile-firetruck-expo
npm install
```

### 8c. Tell the app where the backend is

Open `src/config.ts` and change it (same as Step 7c):

**If using same Wi-Fi:**
```typescript
export const API_URL = 'http://192.168.1.100:5000';  // ← YOUR IP
```

**If using Cloudflare tunnel:**
```typescript
export const API_URL = 'https://apple-banana-cherry.trycloudflare.com';  // ← tunnel URL
```

### 8d. Log in to the firetruck app

Use the test account:
- **ID Number:** `BFP-TRUCK01`
- **Password:** `truck123`

Or create a new account using the Sign Up screen.

### 8e. Start the app
```bash
npx expo start
```

Scan the QR code with Expo Go on your phone.

### 8f. How the firetruck app works

The app has 3 tabs:

1. **Home (Mission Control):**
   - Shows your current status and alarm level
   - Tap the status buttons to change status: **Standby → En Route → On Scene → Fire Out**
   - Tap the alarm card to change alarm level (1st Alarm up to General Alarm)
   - Every change is instantly sent to all admin dashboards

2. **Tracking:**
   - Press START TRACKING to begin sending your GPS location to the backend every 5 seconds
   - Your alarm level and fire status are sent with every GPS ping
   - Shows a banner with your current status and alarm level

3. **Profile:**
   - Shows your info and has a Sign Out button

---

## How Everything Works Together (The Big Picture)

Here's what happens when someone reports a fire:

```
Step 1: Civilian opens app → Reports fire → Backend receives it
Step 2: Backend finds nearest fire station → Calls that station
Step 3: Station has 15 seconds to answer
        ├── If they answer → They dispatch a firetruck
        └── If they DON'T answer → Backend tries the NEXT nearest station
Step 4: If ALL stations fail → Main Admin gets the call (15 seconds)
Step 5: If Main Admin fails → Civilian gets "no answer" message
```

Once a firetruck is dispatched:

```
Step 6:  Driver opens Firetruck App → Gets dispatch notification
Step 7:  Driver presses "En Route" → Everyone sees "Truck #1 is En Route"
Step 8:  Driver arrives, fire is bigger → Escalates alarm from 1st to 2nd
         → Everyone sees "Truck #1 — Alarm: 2nd Alarm"
Step 9:  Driver presses "On Scene" → Fighting the fire
Step 10: Fire is out → Driver presses "Fire Out" → Everyone sees it
Step 11: Driver presses "End Mission" → Back to Standby
```

**Alarm Levels (BFP standard):**

| Level | What It Means |
|-------|--------------|
| 1st Alarm | Small fire, one truck can handle it |
| 2nd Alarm | Bigger fire, need more help |
| 3rd Alarm | Serious fire |
| 4th Alarm | Major fire |
| 5th Alarm | Very large fire |
| Task Force Alpha | Special operations team needed |
| Task Force Bravo | More special operations |
| Task Force Delta | Even more |
| General Alarm | EVERYTHING. All units respond. |

---

## Supabase Database Tables You Need

The following tables must exist in Supabase. If they don't, create them using the SQL Editor in the Supabase dashboard.

### `firetruck_status` table (for live truck status)
```sql
CREATE TABLE public.firetruck_status (
  id bigint generated always as identity primary key,
  truck_id integer not null,
  alarm_id integer null,
  alarm_level text null,
  fire_status text null,
  latitude double precision null,
  longitude double precision null,
  driver_name text null,
  updated_at timestamp with time zone default now()
);
CREATE UNIQUE INDEX firetruck_status_truck_id_idx ON public.firetruck_status (truck_id);
```

### `emergency_contacts` table (for hotline numbers in civilian app)
```sql
CREATE TABLE public.emergency_contacts (
  id bigint generated always as identity primary key,
  name text not null,
  phone_number text not null,
  category text default 'general',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);
```

> **For all other tables** (users, fire_stations, _alarms, news_room, safety_tips, etc.), see the `COMPLETE_SUPABASE_SCHEMA.sql` file in the project root.

---

## Summary: What Runs Where

| App | Folder | How to Start | Where to Open |
|-----|--------|-------------|---------------|
| **Backend** | `backend/` | `node server.js` | (just runs in terminal) |
| **Cloudflare Tunnel** | anywhere | `cloudflared tunnel --url http://localhost:5000` | (just runs in terminal) |
| **Main Admin** | `BFP_Stations-main/BFP_ADMIN/` | `npm run dev` | `http://localhost:5173` |
| **Substation 1** | `BFP_Stations-main/Substation_admin/` | `npx vite --port 5174` | `http://localhost:5174` |
| **Substation 2** | `BFP_Stations-main/Substation_admin/` | `npx vite --port 5175` | `http://localhost:5175` |
| **Substation 3** | `BFP_Stations-main/Substation_admin/` | `npx vite --port 5176` | `http://localhost:5176` |
| **Civilian App** | `End-User-Mobile-Proteksyon-main/` | `npx expo start` | Scan QR on phone |
| **Firetruck App** | `mobile-firetruck-expo/` | `npx expo start` | Scan QR on phone |

---

## Quick Start (TL;DR)

Open **6 terminals** and run in order:

```bash
# Terminal 1: Backend (START THIS FIRST, ALWAYS)
cd backend
npm install
node server.js

# Terminal 2: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5000
# Copy the URL it gives you, put it in backend/.env as PUBLIC_BASE_URL
# Then restart the backend (Ctrl+C in Terminal 1, then node server.js again)

# Terminal 3: Main Admin website
cd BFP_Stations-main/BFP_ADMIN
npm install
npm run dev

# Terminal 4: Substation website
cd BFP_Stations-main/Substation_admin
npm install
npx vite --port 5174

# Terminal 5: Civilian phone app
cd End-User-Mobile-Proteksyon-main
npm install
npx expo start

# Terminal 6: Firetruck phone app
cd mobile-firetruck-expo
npm install
npx expo start
```

---

## Credentials Reference

All secret keys live in `.env` files. These files are **NOT on GitHub** for security reasons.

**Ask Mark for the `.env` files.** He'll send them to you directly.

You need `.env` files in:
1. **`backend/.env`** — Supabase keys, Twilio keys, JWT secret, tunnel URL
2. **`End-User-Mobile-Proteksyon-main/.env`** — Supabase keys only

**Test account for the Firetruck App:**
- ID Number: `BFP-TRUCK01`
- Password: `truck123`

---

## Troubleshooting

### "My phone can't connect to the backend"
- **Check 1:** Is the backend actually running? Look at Terminal 1 — it should say `Server is running on http://localhost:5000`
- **Check 2:** Did you put the right IP/URL in `src/config.ts`?
- **Check 3:** If using IP, are your phone and computer on the same Wi-Fi?
- **Check 4:** If same Wi-Fi doesn't work, your router might be blocking it (common with PLDT routers). Use the Cloudflare tunnel instead (Option B from Step 2).

### "Twilio voice calls aren't working"
- Is the Cloudflare tunnel running? (Step 4)
- Did you restart the backend after putting the tunnel URL in `.env`?
- Check the backend terminal for `[TwiML] Updated TwiML App voice URL` — if you don't see this, the tunnel URL is wrong
- For the civilian phone app, voice calls need a **development build** (`expo run:android`), NOT Expo Go

### "Station doesn't get the incoming call popup"
- Make sure the station user has `assigned_station_id` set in the Supabase `users` table
- The user must be logged in and the page must be open
- Try hard-refreshing: `Ctrl+Shift+R`

### "Multiple stations ring at the same time"
- Use **different browsers** for different stations (Chrome, Edge, Firefox, Incognito windows)
- Hard-refresh all tabs after making code changes

### "Main admin never gets calls"
- That's normal! Main admin is the LAST resort. It only gets calls after ALL fire stations have been tried (15 seconds each).

### "Firetruck app status updates don't show on admin"
- Make sure both the firetruck app and admin dashboard are connected to the same backend
- Check the backend terminal — you should see `[Socket] truck-status-update` messages when the driver changes status
- Make sure the `firetruck_status` table exists in Supabase (see the SQL above)

---

## Changes Log

### March 5, 2026 — Firetruck Alarm & Status Broadcasting + CMS Wiring

#### What's new in simple terms:
- **Firetruck drivers can now set alarm levels** (1st Alarm through General Alarm) and it shows up instantly on all admin dashboards
- **Firetruck drivers can update their status** (Standby → En Route → On Scene → Fire Out) and admins see it in real-time
- **The civilian app now shows real data** from the database for news, safety tips, and emergency contacts (before it was fake/hardcoded data)
- **Firetruck app now has real login** that talks to the backend (before it was just local/fake)

#### Backend (`backend/`)
- **`routes/firetruckTrackingRoutes.js`** — Added `PUT /api/firetrucks/status` endpoint (driver sends alarm level + fire status, backend saves it and broadcasts to everyone via socket). Added `GET /api/firetrucks/active` endpoint (returns all active trucks with their current status for map display).
- **`server.js`** — Added socket handlers: `join-truck` (driver joins a truck room), `truck-status-update` (driver broadcasts status change to all admins and end-users in real-time).
- **`routes/authRoutes.js`** — Patched signup to accept `driver` role (so firetruck drivers can register).
- **`routes/newsRoutes.js`** — Added `GET /api/public/news` and `GET /api/public/news/:id` (public endpoints, no login needed).
- **`routes/safetyRoutes.js`** — Added `GET /api/public/safety-tips` and `GET /api/public/safety-tip-categories`.
- **`routes/contactRoutes.js`** — Added `GET /api/public/contacts` (emergency hotlines).

#### Firetruck App (`mobile-firetruck-expo/`)
- **`src/context/MissionContext.tsx`** — NEW FILE. Shared state for the entire truck mission: alarm level, fire status, socket connection, broadcast functions. Used by both HomeScreen and TrackingScreen.
- **`src/context/AuthContext.tsx`** — Rewritten to use backend `/api/login` and `/api/signup` instead of local-only auth.
- **`src/screens/HomeScreen.tsx`** — Completely rewritten as "Mission Control" dashboard with status buttons, alarm level picker, socket connection indicator, and end mission button.
- **`src/screens/TrackingScreen.tsx`** — Now sends alarm level and fire status with every GPS location ping. Shows a live status banner.
- **`src/screens/LoginScreen.tsx`** — Updated with Sign Up link.
- **`src/screens/RegisterScreen.tsx`** — NEW FILE. Sign up screen for new firetruck driver accounts.
- **`App.tsx`** — Wrapped with `MissionProvider`, added Login/Register toggle.
- **`package.json`** — Added `socket.io-client` dependency.

#### Main Admin Dashboard (`BFP_Stations-main/BFP_ADMIN/`)
- **`src/App.jsx`** — Added `truck-status-update` socket listener. When a driver changes their alarm level or status, the admin sees a notification (e.g., "Truck #1 — En Route | Alarm: 2nd Alarm").

#### Substation Admin Dashboard (`BFP_Stations-main/Substation_admin/`)
- **`src/App.jsx`** — Same `truck-status-update` socket listener as main admin.

#### Civilian App (`End-User-Mobile-Proteksyon-main/`)
- **`src/screens/News/NewsRoomScreen.tsx`** — Now fetches real news from `/api/public/news` instead of hardcoded data.
- **`src/screens/News/ArticleScreen.tsx`** — Now fetches article details from `/api/public/news/:id`.
- **`src/screens/Emergency/FireSafetyTipsScreen.tsx`** — Now fetches safety tips from `/api/public/safety-tips` and categories from `/api/public/safety-tip-categories`.
- **`src/screens/Emergency/EmergencyHotlinesScreen.tsx`** — Now fetches contacts from `/api/public/contacts` with tap-to-call.
- **`src/screens/Home/HomeScreen.tsx`** — News section now fetches live data from backend.

#### New Supabase Tables Needed
- **`firetruck_status`** — Stores live truck alarm level, fire status, location, driver name (see SQL above).
- **`emergency_contacts`** — Stores emergency hotline numbers (see SQL above).

### March 3-4, 2026 — Twilio Voice Failover System

#### Backend (`backend/`)
- **`server.js`** — Added `join-main-admin` socket handler, `call-cancelled` handler (cancels failover + dismisses all station modals when civilian hangs up)
- **`services/dispatchService.js`** — Complete failover rewrite: 15s timer per station, auto-reject emitted to previous station before moving to next, main admin gets call only after all substations exhausted
- **`routes/incidentRoutes.js`** — Removed main-admin emission on initial dispatch, added `isMainAdmin` handling in accept API
- **`routes/twilioTokenRoutes.js`** — Removed automatic `ADM_MAIN` ringing on every substation call

#### Main Admin (`BFP_Stations-main/BFP_ADMIN/`)
- **`src/App.jsx`** — Main admin only joins `main-admin` room, added `auto-reject` listener, Accept/Dismiss buttons also handle Twilio call
- **`src/hooks/useTwilioVoice.js`** — Added identity filter to reject misrouted calls

#### Substation (`BFP_Stations-main/Substation_admin/`)
- **`src/App.jsx`** — Added `auto-reject` listener, Accept/Dismiss buttons also handle Twilio call
- **`src/hooks/useTwilioVoice.js`** — Added identity filter (same as main admin)

#### Civilian App (`End-User-Mobile-Proteksyon-main/`)
- **`src/screens/Emergency/EmergencyCallScreen.tsx`** — Emits `call-cancelled` on hangup, dials `ADM_MAIN` on failover to main admin
- **`src/hooks/useTwilioVoice.ts`** — Added `activeCallRef` to prevent call bleed-over
