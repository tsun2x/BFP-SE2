# BFP Emergency System — Technical Process Guide

> This guide explains HOW everything works under the hood — the actual technology, files, and code — written so simply that even a 7-year-old could follow along.

---

## Table of Contents

1. [What Technologies Do We Use?](#1-what-technologies-do-we-use)
2. [How Does The Backend Server Work?](#2-how-does-the-backend-server-work)
3. [How Does The Database Work?](#3-how-does-the-database-work)
4. [How Does Real-Time Communication Work?](#4-how-does-real-time-communication-work)
5. [How Does The Alarm System Work?](#5-how-does-the-alarm-system-work)
6. [How Does The Firetruck Tracking Work?](#6-how-does-the-firetruck-tracking-work)
7. [How Does The Dispatch System Work?](#7-how-does-the-dispatch-system-work)
8. [How Does Authentication Work?](#8-how-does-authentication-work)
9. [How Does Twilio Voice/SMS Work?](#9-how-does-twilio-voicesms-work)
10. [How Does The Cloudflare Tunnel Work?](#10-how-does-the-cloudflare-tunnel-work)
11. [Database Tables Explained](#11-database-tables-explained)
12. [File Structure Explained](#12-file-structure-explained)
13. [How To Start Everything](#13-how-to-start-everything)

---

## 1. What Technologies Do We Use?

Think of building a house. You need different tools for different jobs. Here are our tools:

| Tool | What It Is | Why We Use It | Like This In Real Life... |
|------|-----------|--------------|--------------------------|
| **Node.js** | JavaScript that runs on a computer (not a browser) | Runs our backend server | The kitchen where food is prepared |
| **Express** | A helper for Node.js to handle web requests | Makes it easy to create API routes | The recipe book in the kitchen |
| **Socket.IO** | Two-way instant messaging between apps | Real-time updates (no refreshing!) | A walkie-talkie — both sides can talk anytime |
| **Supabase** | Cloud database + authentication | Stores all our data (alarms, users, trucks) | A giant notebook in the cloud |
| **Twilio** | Phone call and SMS service | Makes VoIP calls + sends OTP codes | A telephone company |
| **React** | Library for building web pages | Admin dashboards | LEGO blocks for websites |
| **React Native (Expo)** | Library for building phone apps | Civilian app + firetruck driver app | LEGO blocks for phone apps |
| **Cloudflare Tunnel** | Makes your local computer accessible from the internet | Phones and browsers can reach the server | A bridge connecting your house to the highway |
| **Vite** | Tool that builds and serves React apps fast | Admin dashboard dev server | A really fast microwave for code |

---

## 2. How Does The Backend Server Work?

The backend is the **brain** of the whole system. It lives in the `backend/` folder.

### The Main File: `backend/server.js`

Think of it like the front desk of a hotel. When someone walks in (makes a request), the front desk person figures out what they need and sends them to the right room.

```
Someone makes a request to the server
    │
    ▼
server.js receives it
    │
    ├── Is it about logging in?      → Send to authRoutes.js
    ├── Is it about emergencies?     → Send to incidentRoutes.js
    ├── Is it about firetruck GPS?   → Send to firetruckTrackingRoutes.js
    ├── Is it about Twilio calls?    → Send to twilioTokenRoutes.js
    ├── Is it about fire stations?   → Send to fireStations.js
    ├── Is it about news/safety?     → Send to newsRoutes.js / safetyRoutes.js
    └── Is it a health check?        → Say "I'm alive!"
```

### How server.js Actually Starts:

1. **Loads settings** from `backend/.env` (secret passwords, API keys)
2. **Creates HTTP server** on port 5000
3. **Attaches Socket.IO** to that server (for real-time walkie-talkie)
4. **Sets up security**: CORS (who can talk to us), Helmet (security headers), rate limiting (stop hackers from guessing passwords)
5. **Registers all routes** (the rooms in our hotel)
6. **Starts listening** — "I'm ready for customers!"
7. **Updates Twilio** — tells Twilio "here's my new address" (because Cloudflare tunnel URL changes)

### What Are Routes?

Routes are like different departments in a store:

| File | URL Path | What It Handles |
|------|----------|----------------|
| `authRoutes.js` | `/api/login`, `/api/end-user-signup`, `/api/send-otp`, `/api/verify-otp` | Signing up, logging in, OTP verification |
| `incidentRoutes.js` | `/api/create-incident`, `/api/incidents`, `/api/incidents/:id/accept` | Creating emergencies, listing them, accepting them |
| `firetruckTrackingRoutes.js` | `/api/firetrucks/track`, `/api/firetrucks/status`, `/api/firetrucks/active` | GPS tracking, alarm level updates |
| `twilioTokenRoutes.js` | `/api/twilio/token`, `/api/twilio/voice` | Getting Twilio access tokens, voice call webhooks |
| `fireStations.js` | `/api/fire-stations` | Getting list of fire stations |
| `readinessRoutes.js` | `/api/readiness` | Station readiness checklist |

---

## 3. How Does The Database Work?

We use **Supabase**, which is a cloud database (PostgreSQL). Think of it like a bunch of spreadsheets in the cloud that everyone shares.

### How We Talk To The Database

The file `backend/supabaseClient.js` creates a connection to Supabase using two secret keys:

- **SUPABASE_URL**: The address of our database (like a phone number)
- **SUPABASE_SERVICE_ROLE_KEY**: The master password (lets us do anything)

When we want to read or write data:

```javascript
// Read: "Give me all alarms that are pending"
const { data, error } = await supabase
  .from('_alarms')                          // Which spreadsheet?
  .select('alarm_id, status, call_time')    // Which columns?
  .eq('status', 'Pending Dispatch');        // Which rows?

// Write: "Create a new alarm"
const { data, error } = await supabase
  .from('_alarms')
  .insert([{
    end_user_id: 5,
    user_latitude: 6.9214,
    user_longitude: 122.0790,
    initial_alarm_level: '1st Alarm',
    status: 'Pending Dispatch'
  }]);

// Update: "Change this alarm's level"
const { data, error } = await supabase
  .from('_alarms')
  .update({ current_alarm_level: '2nd Alarm' })
  .eq('alarm_id', 42);
```

**Think of it like this:** `supabase.from('_alarms')` means "open the _alarms spreadsheet." `.select()` means "show me these columns." `.eq()` means "only show rows where this equals that." `.insert()` means "add a new row." `.update()` means "change some values."

---

## 4. How Does Real-Time Communication Work?

There are two ways our apps talk to the backend:

### Way 1: REST API (HTTP Requests) — "Sending a Letter"

This is like mailing a letter. You send a request, wait, and get a response.

```
📱 App: "Hey server, here's a new emergency" (POST /api/create-incident)
🖥️ Server: "Got it! Here's the alarm ID: 42" (Response: { alarmId: 42 })
```

Used for: Creating data, fetching lists, logging in — things that happen once.

### Way 2: Socket.IO — "Walkie-Talkie"

This is like a walkie-talkie. Once you connect, both sides can talk anytime without asking first.

```
📱 App connects to server's Socket.IO
    │
    ├── Server can PUSH messages to the app at any time:
    │     "Hey! New emergency just came in!" (incoming-incident)
    │     "Truck #1 just changed to 2nd Alarm!" (alarm-level-update)
    │
    └── App can PUSH messages to the server at any time:
          "I'm a fire station, I'm online!" (station-online)
          "Here's my truck's GPS location!" (truck-status-update)
```

### Socket.IO Rooms

Rooms are like group chats. Only people in the room hear the message.

| Room Name | Who's In It | What Messages Go Here |
|-----------|------------|----------------------|
| `main-admin` | BFP Admin dashboard | Emergency fallback after all substations reject |
| `station-3` | Substation 3 dashboard | Emergencies dispatched to station 3 |
| `alarm-42` | Anyone watching alarm #42 | Updates about that specific alarm |
| `truck-1` | Firetruck #1 driver | Dispatch orders for that truck |

### All Socket.IO Events

| Event | Who Sends It | Who Receives It | What It Does |
|-------|-------------|----------------|-------------|
| `station-online` | Substation dashboard | Server | "I'm online and ready for emergencies" |
| `join-main-admin` | BFP Admin dashboard | Server | "I'm the main boss, add me to the main-admin room" |
| `join-truck` | Firetruck driver app | Server | "I'm truck #1, add me to the truck-1 room" |
| `incoming-incident` | Server | Station room | "New emergency for your station!" |
| `incident-received` | Station dashboard | Server | "I got the emergency, thanks!" (ACK handshake) |
| `truck-status-update` | Firetruck driver | Server → All | "I changed status to En Route and alarm to 2nd Alarm" |
| `alarm-level-update` | Server | All + alarm room | "Alarm level just changed from 1st to 2nd Alarm!" |
| `auto-reject` | Server | Station/Admin | "Time's up! Emergency reassigned to next station" |
| `call-cancelled` | Civilian app | Server | "Nevermind, I cancelled my call" |
| `stations-online-update` | Server | All | "Here's the updated list of online stations" |

---

## 5. How Does The Alarm System Work?

### What Tables Are Involved?

Think of these as different notebooks:

| Table | Purpose | Like This... |
|-------|---------|-------------|
| `_alarms` | Master record of every emergency | The main incident logbook |
| `firetruck_status` | Current status of each truck (one row per truck) | A whiteboard showing "Truck #1: En Route, 2nd Alarm" |
| `firetruck_location_history` | GPS breadcrumb trail | A map with dots showing everywhere the truck has been |
| `alarm_response_log` | Audit trail of every action | Writing down everything that happened in order |

### How Alarm Escalation Works (Step By Step)

```
1. Driver is at the fire scene with alarm set to "1st Alarm"
    │
2. Fire is spreading! Driver opens the alarm picker on their phone
    │
3. Driver selects "2nd Alarm"
    │
    ▼
4. MissionContext.tsx runs handleAlarmChange("2nd Alarm")
    │
    ├── Sets local state: alarmLevel = "2nd Alarm"
    │
    ├── Calls broadcastStatus("En Route", "2nd Alarm")
    │     │
    │     ├── Socket.IO emit: { truckId: 1, alarmLevel: "2nd Alarm", ... }
    │     │     → Server rebroadcasts to ALL clients instantly
    │     │
    │     └── REST API: PUT /api/firetrucks/status
    │           │
    │           ▼
    │     5. Backend (firetruckTrackingRoutes.js):
    │           │
    │           ├── Reads current alarm level from _alarms table: "1st Alarm"
    │           │
    │           ├── Updates _alarms table: current_alarm_level = "2nd Alarm"
    │           │
    │           ├── Upserts firetruck_status table: alarm_level = "2nd Alarm"
    │           │
    │           ├── Emits truck-status-update to ALL clients
    │           │
    │           ├── Compares: "1st Alarm" ≠ "2nd Alarm" → IT CHANGED!
    │           │
    │           └── Emits alarm-level-update:
    │                 {
    │                   alarmId: 42,
    │                   truckId: 1,
    │                   previousAlarmLevel: "1st Alarm",
    │                   newAlarmLevel: "2nd Alarm",
    │                   driverName: "Juan Dela Cruz"
    │                 }
    │
    ▼
6. Admin dashboards (App.jsx):
    │
    ├── FIRST: truck-status-update arrives
    │     → Dedup key: "1-En Route-2nd Alarm" (not seen before)
    │     → Shows bell notification: "Truck #1 — En Route"
    │     → Shows toast: "Truck #1 is now 'En Route' | Alarm: 2nd Alarm"
    │
    └── THEN: alarm-level-update arrives
          → Shows bell notification: "ALARM ESCALATED — Incident #42"
          → Shows STICKY toast: "🚨 ALARM ESCALATED: 1st Alarm → 2nd Alarm | Truck #1"
          → Has "View Incident" button
```

### Deduplication (Why We Don't Show The Same Notification Twice)

The socket might send the same update multiple times (it happens!). We use a **dedup key** to prevent spam:

```
Dedup key = truckId + fireStatus + alarmLevel
Example:   "1-En Route-2nd Alarm"
```

The admin app keeps a Set (like a checklist) of keys it has already shown. If a key is already in the checklist, it skips the notification. When the alarm level changes (e.g., "2nd Alarm" → "3rd Alarm"), the key is different, so a NEW notification appears.

---

## 6. How Does The Firetruck Tracking Work?

### Two Tables — Two Jobs

**`firetruck_status`** — This is the "whiteboard":
- ONE row per truck (always updated, never grows)
- Shows the CURRENT state right now
- Contains: truck_id, alarm_id, alarm_level, fire_status, latitude, longitude, driver_name
- Used by: Alarm notifications, active truck list

**`firetruck_location_history`** — This is the "breadcrumb trail":
- Adds a NEW row every 5 seconds per truck (always growing)
- Shows WHERE the truck HAS BEEN
- Contains: truck_id, latitude, longitude, speed, heading, accuracy, recorded_at
- Used by: Map display (plotting the truck icon), route replay

### How Location Gets Saved

There are TWO paths — one fast, one reliable:

```
🚒 Firetruck Driver App (every 5 seconds)
    │
    ├── Path 1: Socket.IO (FAST, no auth needed)
    │     App emits truck-status-update event
    │     → Server receives it
    │     → Server saves lat/lng to firetruck_location_history
    │     → Server rebroadcasts to all admins
    │     → Admin map updates instantly
    │
    └── Path 2: REST API (RELIABLE, needs auth token)
          App calls POST /api/firetrucks/track
          → Server validates truck assignment
          → Server saves to firetruck_location_history
          → Response: "Location saved!"

🖥️ Admin Map (every 5 seconds)
    │
    └── Polls GET /api/firetruck-locations
          → Gets latest location per truck from firetruck_location_history
          → Draws truck icon on the Leaflet map
```

**Why two paths?** If the auth token expires (Path 2 fails), the socket path (Path 1) still works. The map always has data.

---

## 7. How Does The Dispatch System Work?

This is the most complex part. When a civilian creates an emergency, the system needs to find the best fire station to handle it.

### The KNN Algorithm (Finding The Nearest Station)

KNN stands for "K-Nearest Neighbors." It's like asking: "Who lives closest to the fire?"

```
Step 1: Get the fire location (latitude, longitude)

Step 2: Get ALL fire stations from the database

Step 3: Filter out:
    ❌ Stations that are NOT ready (readiness_status ≠ "READY")
    ❌ Stations that are NOT online (no Socket.IO connection)

Step 4: For each remaining station, calculate distance:
    distance = Haversine formula(fire location, station location)
    (This is fancy math that measures distance on a round Earth)

Step 5: Sort stations by distance (closest first)

Step 6: Send the emergency to station #1 (closest)
```

### The Failover Chain

If the closest station doesn't respond, the emergency bounces to the next one:

```
Station #1 (closest) gets the emergency
    │
    ├── Timer starts: 20 seconds...
    │
    ├── IF station accepts → DONE! Cancel timer.
    │
    ├── IF station rejects OR timer expires:
    │     │
    │     ├── Cancel timer for Station #1
    │     │
    │     └── Send to Station #2 (next closest)
    │           │
    │           ├── Timer starts: 20 seconds...
    │           │
    │           ├── IF accepts → DONE!
    │           │
    │           └── IF rejects or expires:
    │                 │
    │                 └── ... keep going ...
    │                       │
    │                       └── Eventually: Send to MAIN ADMIN (last resort)
```

### Accept Is Atomic (First-Come-First-Served)

What if two stations try to accept at the same time? The backend uses an atomic lock:

```
Station A: "I accept alarm 42!"  ←─┐
Station B: "I accept alarm 42!"  ←─┼── Both arrive at the same time
                                    │
Backend checks: Is alarm 42 already accepted?
    │
    ├── Station A arrives first → Accepted! ✅ alarm.status = "Dispatched"
    │
    └── Station B arrives second → "Sorry, already taken!" ❌
```

---

## 8. How Does Authentication Work?

### JWT Tokens (The Wristband System)

When you log in, the server gives you a **JWT token**. This is like a wristband at a theme park — it proves you're allowed to be here.

```
📱 "I want to log in! Here's my ID and password."
    │
    ▼
🖥️ Server checks: "Is this ID real? Is the password correct?"
    │
    ├── YES → Creates a JWT token containing:
    │         { userId: 5, role: "admin", stationId: 1 }
    │         Signs it with JWT_SECRET (so nobody can fake it)
    │         Sends token back
    │
    └── NO → "Wrong credentials!" ❌
```

Every time the app makes a request after login:

```
📱 "Give me the incident list!" + Authorization: Bearer <token>
    │
    ▼
🖥️ middleware/auth.js checks the token:
    │
    ├── Is the token valid (not expired, signature matches)?
    │     YES → Let the request through
    │     NO → "Unauthorized!" 401
    │
    ▼
🖥️ middleware/role.js checks the role:
    │
    ├── Does this user have permission for this action?
    │     YES → Process the request
    │     NO → "Forbidden!" 403
```

### Role-Based Access

| Role | Can Do | Can't Do |
|------|--------|----------|
| `admin` | Everything | Nothing restricted |
| `substation_admin` | See own station's incidents, manage readiness | See other stations' data |
| `driver` | Send GPS, update truck status | Manage incidents or stations |
| `end_user` | Create emergencies, call stations | Access admin dashboards |

---

## 9. How Does Twilio Voice/SMS Work?

### VoIP Calls (Voice Over Internet)

Twilio is a phone company for apps. Here's how a VoIP call works:

```
📱 Civilian wants to call the fire station
    │
    ├── App asks server: "Give me a Twilio token!"
    │     GET /api/twilio/token?identity=CIV_639171234567
    │
    ▼
🖥️ Server creates a Twilio access token with voice grants
    │
    └── Sends token back to the app
    │
    ▼
📱 App uses the token to connect to Twilio's servers
    │
    ├── App says: "Call ADM_SUB_3" (the fire station's identity)
    │
    ▼
📞 Twilio's servers route the call:
    │
    ├── Twilio calls our webhook: POST /api/twilio/voice
    │
    ├── Server responds with TwiML (phone instructions):
    │     <Response>
    │       <Dial ringTone="us">
    │         <Client>ADM_SUB_3</Client>
    │       </Dial>
    │     </Response>
    │
    ├── This means: "Ring the station admin's browser with a US ring tone"
    │
    ▼
🖥️ Station admin's browser (which also has a Twilio token) rings!
    │
    └── Admin clicks "Accept" → Two-way voice call is live!
```

### SMS OTP (One-Time Password)

```
📱 User signs up → Server calls Twilio:
    │
    ▼
🖥️ "Send SMS to +63917XXXXXXX with message: Your BFP code is 834521"
    │
    ▼
📞 Twilio sends the SMS
    │
    ▼
📱 User receives SMS, types "834521" into the app
    │
    ▼
🖥️ Server checks: otpStore.get("+63917XXXXXXX") === "834521"?
    │
    ├── YES → Mark user as verified ✅
    └── NO → "Wrong code!" ❌
```

---

## 10. How Does The Cloudflare Tunnel Work?

The backend runs on your computer (localhost:5000). But phones and browsers on other devices can't reach "localhost." That's where Cloudflare Tunnel comes in.

```
Your Computer                     The Internet
┌──────────────┐                 ┌──────────────────────┐
│ Backend      │                 │ Cloudflare servers    │
│ localhost:   │ ========tunnel==>│                      │
│ 5000         │                 │ outlets-southeast-    │
│              │                 │ vertex-apr.           │
└──────────────┘                 │ trycloudflare.com    │
                                 └──────────┬───────────┘
                                            │
                              ┌─────────────┼───────────┐
                              │             │           │
                           📱 Phone     🖥️ Browser   📱 Phone
                           (Civilian)   (Admin)     (Firetruck)
```

**Important:** Every time you restart `cloudflared`, you get a NEW random URL. That's why you must update:
- `backend/.env` → `PUBLIC_BASE_URL`
- `End-User-Mobile-Proteksyon-main/.env` → `EXPO_PUBLIC_BASE_URL`
- `mobile-firetruck-expo/.env` → `EXPO_PUBLIC_BASE_URL`
- `End-User-Mobile-Proteksyon-main/src/config.ts` → `API_URL`
- `mobile-firetruck-expo/src/config.ts` → `API_URL`

---

## 11. Database Tables Explained

Here's every important table in Supabase and what each column means:

### `_alarms` — The Emergency Logbook

| Column | What It Stores | Example |
|--------|---------------|---------|
| alarm_id | Unique number for this emergency | 42 |
| end_user_id | Who called (links to users table) | 5 |
| user_latitude | Where the fire is (north/south) | 6.9214 |
| user_longitude | Where the fire is (east/west) | 122.0790 |
| initial_alarm_level | Alarm level when first created | "1st Alarm" |
| current_alarm_level | Alarm level right now (may have escalated) | "3rd Alarm" |
| status | Current state of the emergency | "Dispatched" |
| assigned_station_id | Which station is handling it | 3 |
| call_time | When the call came in | 2026-03-11T10:30:00Z |
| dispatch_time | When a station accepted | 2026-03-11T10:30:15Z |
| resolve_time | When the fire was resolved | 2026-03-11T12:45:00Z |

### `firetruck_status` — The Truck Whiteboard

| Column | What It Stores | Example |
|--------|---------------|---------|
| id | Row ID | 1 |
| truck_id | Which truck | 1 |
| alarm_id | Which emergency it's responding to | 42 |
| alarm_level | Current alarm level | "2nd Alarm" |
| fire_status | Current phase | "On Scene" |
| latitude | Truck's current location (north/south) | 6.9200 |
| longitude | Truck's current location (east/west) | 122.0785 |
| driver_name | Who's driving | "Juan Dela Cruz" |
| updated_at | When this was last updated | 2026-03-11T10:45:00Z |

### `firetruck_location_history` — The Breadcrumb Trail

| Column | What It Stores | Example |
|--------|---------------|---------|
| location_id | Row ID | 5001 |
| truck_id | Which truck | 1 |
| alarm_id | Which emergency (optional) | 42 |
| latitude | Where the truck was | 6.9201 |
| longitude | Where the truck was | 122.0786 |
| speed | How fast (km/h) | 45.5 |
| heading | Which direction (degrees) | 180.0 |
| accuracy | GPS accuracy (meters) | 15.3 |
| recorded_at | When this point was recorded | 2026-03-11T10:45:05Z |

### `users` — Everyone Who Uses The System

| Column | What It Stores | Example |
|--------|---------------|---------|
| user_id | Unique number | 5 |
| first_name | First name | "Juan" |
| last_name | Last name | "Dela Cruz" |
| phone_number | Phone | "+639171234567" |
| email | Email | "juan@gmail.com" |
| role | What type: admin, substation_admin, driver, end_user | "substation_admin" |
| assigned_station_id | Which fire station (for staff) | 3 |
| is_verified | Did they verify their account? | true |

### `fire_stations` — The Fire Stations

| Column | What It Stores | Example |
|--------|---------------|---------|
| station_id | Unique number | 3 |
| station_name | Name | "Poblacion Fire Station" |
| station_type | main or substation | "substation" |
| latitude | Station location | 6.9100 |
| longitude | Station location | 122.0750 |
| address | Street address | "Poblacion, Zamboanga City" |

### `firetrucks` — The Trucks

| Column | What It Stores | Example |
|--------|---------------|---------|
| truck_id | Unique number | 1 |
| truck_code | Display code | "FT-001" |
| assigned_station_id | Which station owns this truck | 3 |
| current_alarm_id | Which alarm it's responding to (if any) | 42 |
| plate_number | License plate | "ABC 1234" |

---

## 12. File Structure Explained

```
BFP-SE2-ready_na_po/
│
├── backend/                          ← THE BRAIN (Node.js server)
│   ├── server.js                     ← Main entry point (starts everything)
│   ├── supabaseClient.js             ← Connects to the database
│   ├── package.json                  ← Lists all dependencies (npm install)
│   ├── .env                          ← Secret keys (NEVER commit this!)
│   ├── config/
│   │   └── database.js               ← Database config
│   ├── middleware/
│   │   ├── auth.js                   ← JWT verification (checks wristbands)
│   │   └── role.js                   ← Role checking (admin vs user)
│   ├── routes/
│   │   ├── authRoutes.js             ← Login, signup, OTP
│   │   ├── incidentRoutes.js         ← Emergency creation, dispatch, accept/reject
│   │   ├── firetruckTrackingRoutes.js← GPS tracking, alarm level updates
│   │   ├── twilioTokenRoutes.js      ← Twilio voice tokens and webhooks
│   │   ├── fireStations.js           ← Fire station CRUD
│   │   ├── readinessRoutes.js        ← Station readiness checklist
│   │   ├── newsRoutes.js             ← News articles
│   │   ├── safetyRoutes.js           ← Safety tips
│   │   ├── contactRoutes.js          ← Emergency contacts
│   │   └── messageRoutes.js          ← Messages
│   ├── services/
│   │   ├── onlineStations.js         ← Tracks which stations are connected
│   │   └── dispatchService.js        ← KNN algorithm + failover timers
│   └── migrations/                   ← Database schema change scripts
│
├── BFP_Stations-main/               ← ADMIN DASHBOARDS (React + Vite)
│   ├── BFP_ADMIN/                    ← Main station dashboard (:5173)
│   │   ├── src/
│   │   │   ├── App.jsx               ← Root component (Socket.IO, call handling)
│   │   │   ├── pages/
│   │   │   │   ├── dashboard.jsx     ← Statistics and charts
│   │   │   │   ├── emergencycallHistory.jsx
│   │   │   │   ├── IncidentReport.jsx
│   │   │   │   └── ...
│   │   │   ├── components/
│   │   │   │   ├── topnavbar.jsx     ← Bell notifications + avatar
│   │   │   │   ├── sidenavbar.jsx    ← Navigation menu
│   │   │   │   ├── MapContainer.jsx  ← Leaflet map with truck markers
│   │   │   │   └── ...
│   │   │   └── context/
│   │   │       ├── AuthContext.jsx    ← Login state + JWT token
│   │   │       ├── NotificationContext.jsx ← Bell notification state
│   │   │       ├── CallContext.jsx    ← Incoming/ongoing call state
│   │   │       └── StatusContext.jsx  ← Station readiness state
│   │   └── .env                      ← VITE_API_URL, VITE_STATION_ID
│   │
│   └── Substation_admin/             ← Branch station dashboard (:5174)
│       └── (same structure as BFP_ADMIN)
│
├── End-User-Mobile-Proteksyon-main/  ← CIVILIAN APP (Expo React Native)
│   ├── App.tsx                       ← Root app
│   ├── src/
│   │   ├── config.ts                 ← API_URL (Cloudflare tunnel URL)
│   │   ├── screens/
│   │   │   ├── Auth/
│   │   │   │   ├── RegisterScreen.tsx  ← Signup (phone/email toggle)
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── VerifyOtpScreen.tsx ← OTP verification
│   │   │   └── Emergency/
│   │   │       └── EmergencyCallScreen.tsx ← The "CALL FOR HELP" button
│   │   ├── hooks/
│   │   │   └── useTwilioVoice.ts     ← Twilio Voice SDK integration
│   │   └── context/                  ← Auth state, app state
│   └── .env                          ← EXPO_PUBLIC_BASE_URL
│
├── mobile-firetruck-expo/            ← FIRETRUCK DRIVER APP (Expo React Native)
│   ├── App.tsx                       ← Root app
│   ├── src/
│   │   ├── config.ts                 ← API_URL (Cloudflare tunnel URL)
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx        ← Status phases + alarm picker
│   │   │   └── TrackingScreen.tsx    ← GPS tracking display
│   │   └── context/
│   │       ├── MissionContext.tsx     ← Alarm levels, fire status, broadcasting
│   │       └── AuthContext.tsx        ← Driver login state
│   └── .env                          ← EXPO_PUBLIC_BASE_URL, EXPO_PUBLIC_SUPABASE_*
│
└── Documentation/
    ├── SESSION_CHANGES.md            ← Log of everything we changed
    ├── SYSTEM_FLOW_GUIDE.md          ← How the system works (simple)
    ├── SYSTEM_TECHNICAL_GUIDE.md     ← How the system works (technical)
    ├── HOW_TO_RUN.md                 ← How to start everything
    └── SETUP_GUIDE.md                ← Initial setup instructions
```

---

## 13. How To Start Everything

Here's the order — start from the bottom up:

### Step 1: Start Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:5000
```

This gives you a URL like `https://outlets-southeast-vertex-apr.trycloudflare.com`. Copy it.

### Step 2: Update All Config Files With The New URL

Update these files/env vars with the new URL:
- `backend/.env` → `PUBLIC_BASE_URL=https://your-new-url.trycloudflare.com`
- `End-User-Mobile-Proteksyon-main/.env` → `EXPO_PUBLIC_BASE_URL=https://your-new-url.trycloudflare.com`
- `mobile-firetruck-expo/.env` → `EXPO_PUBLIC_BASE_URL=https://your-new-url.trycloudflare.com`

### Step 3: Start Backend Server

```bash
cd backend
node server.js
```

You should see: `Server is running on http://localhost:5000`

### Step 4: Start Admin Dashboards

```bash
# Terminal 1
cd BFP_Stations-main/BFP_ADMIN
npm run dev
# Opens at http://localhost:5173

# Terminal 2
cd BFP_Stations-main/Substation_admin
npm run dev
# Opens at http://localhost:5174
```

### Step 5: Start Mobile Apps

```bash
# Terminal 3
cd End-User-Mobile-Proteksyon-main
npx expo start
# Scan QR code with Expo Go app

# Terminal 4
cd mobile-firetruck-expo
npx expo start
# Scan QR code with Expo Go app
```

### Step 6: Test The Flow

1. Open Substation Admin (localhost:5174) → Log in → You should see "Connected to socket server"
2. Open BFP Admin (localhost:5173) → Log in → Check socket connection
3. Open End-User app → Sign up → Verify OTP → Hit Emergency Call
4. The emergency should pop up on the nearest substation's dashboard!
5. Accept it, then open Firetruck app → Change alarm level → Admin should get notification!
