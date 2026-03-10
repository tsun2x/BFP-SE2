# 🚒 BFP Emergency System — How to Set It All Up

> **Read this like a storybook.** Go step by step. Don't skip anything. If you get lost, come back here and start from where you left off.

---

## 🧩 What Even Is This?

Imagine you see a fire. You open an app on your phone, press a big red button, and the nearest fire station gets a phone call. They pick up, send a firetruck, and the truck driver can update everyone on what's happening — all in real-time.

That's what this project does! It has **5 little apps** that all work together like a team:

| App | What It Does | Who Uses It |
|-----|-------------|-------------|
| **🧠 Backend** | The brain. It connects everything together. | Nobody directly — it just runs in the background. |
| **🏢 Main Admin Dashboard** | A website for the BFP headquarters boss. They see ALL emergencies. | The BFP boss (main admin). |
| **🏠 Substation Dashboard** | A website for each fire station. They get calls for fires near them. | Fire station operators. |
| **📱 Civilian App** | A phone app for regular people to report fires. | You and me — regular people. |
| **🚒 Firetruck App** | A phone app for firetruck drivers to track where to go. | Firetruck drivers. |

**How do they talk to each other?**

Think of it like this: the **Backend** is like a phone operator. Every app calls the Backend, and the Backend connects them.

```
    📱 Civilian App ──┐
                       │
    🏢 Main Admin ────┤
                       ├──→ 🧠 Backend ──→ 💾 Database (Supabase)
    🏠 Substation ────┤                  └──→ 📞 Phone System (Twilio)
                       │
    🚒 Firetruck App ─┘
```

---

## 🛠️ What You Need to Install (Before Anything Else)

You need to put some programs on your computer first. Think of them like tools in a toolbox — you can't build anything without the tools.

### ✅ Install These:

| Tool | What It Does | Where to Get It |
|------|-------------|-----------------|
| **Node.js** (version 18 or newer) | Runs all the code. Like the engine in a car. | Go to https://nodejs.org/ and click the BIG green button. |
| **Git** | Downloads the code from the internet. | Go to https://git-scm.com/ and install it. |
| **VS Code** | Lets you look at the code and edit it. | Go to https://code.visualstudio.com/ |
| **Cloudflared** | Makes a magic tunnel so your phone can talk to your computer. | Go to https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ |

### ✅ Check if Node.js is working:

1. Open **PowerShell** (type "PowerShell" in Windows search and click it)
2. Type this and press Enter:
   ```
   node -v
   ```
3. You should see something like `v18.17.0` or `v20.10.0`
4. If you see an error, Node.js didn't install right — try again

### ✅ Install Expo CLI (for the phone apps):

In the same PowerShell, type:
```
npm install -g expo-cli
```

Wait for it to finish. Done!

---

## 📥 Step 1: Get the Code

Open PowerShell and type:

```
git clone https://github.com/tsun2x/BFP-SE2.git
cd BFP-SE2
```

Now you have a folder with ALL the apps inside. Here's what's in it:

```
BFP-SE2/
├── backend/                          ← 🧠 The brain
├── BFP_Stations-main/
│   ├── BFP_ADMIN/                    ← 🏢 Main admin website
│   └── Substation_admin/             ← 🏠 Substation website
├── End-User-Mobile-Proteksyon-main/  ← 📱 Civilian phone app
└── mobile-firetruck-expo/            ← 🚒 Firetruck phone app
```

---

## 🌐 Step 2: How Does Your Phone Talk to Your Computer?

Your phone apps need to find your computer. There are 2 ways:

### Way A: Same Wi-Fi (Easy Way)

Put your phone and computer on the **same Wi-Fi network**. Then find your computer's IP number:

1. Open PowerShell
2. Type `ipconfig`
3. Look for **IPv4 Address** — it looks like `192.168.1.100`
4. Write it down! We'll call this **YOUR_IP**

> ⚠️ **Some routers (like PLDT) block this.** If your phone can't connect even on the same Wi-Fi, use Way B instead.

### Way B: Cloudflare Tunnel (Magic Way — Always Works)

This makes a special internet link so your phone can reach your computer from anywhere.

1. Open a new PowerShell window
2. Type:
   ```
   cloudflared tunnel --url http://localhost:5000
   ```
3. Wait a few seconds. It will show you a link like:
   ```
   https://apple-banana-cherry.trycloudflare.com
   ```
4. **Copy that link!** You'll need it everywhere.

> ⚠️ **This link changes every time you restart the tunnel!** When it changes, you have to update it everywhere (we'll show you where).

---

## 🧠 Step 3: Start the Backend (DO THIS FIRST — ALWAYS)

**Nothing works without the brain.** Always start the backend before everything else.

### 3a. Open a brand new PowerShell window

### 3b. Go to the backend folder:
```
cd backend
```

### 3c. Install everything it needs:
```
npm install
```
This downloads a bunch of helper libraries. Just wait for it to finish.

### 3d. Make sure the secret settings file exists

There's a file called `.env` inside the `backend/` folder. It has all the passwords and secret keys.

**🔑 Ask Mark for this file.** It's secret so it's not on GitHub.

Here's what the file looks like (the actual keys will be different):

```env
JWT_SECRET='your_super_secret_jwt_key_change_this_in_production'
PORT='5000'
NODE_ENV='production'
ALLOWED_ORIGINS='http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176'

SUPABASE_URL=https://ccmwlhbrwrmqjxkgjswj.supabase.co
SUPABASE_ANON_KEY=<the anon key - ask Mark>
SUPABASE_SERVICE_ROLE_KEY=<the service role key - ask Mark>

TWILIO_ACCOUNT_SID=<twilio account sid - ask Mark>
TWILIO_AUTH_TOKEN=<twilio auth token - ask Mark>
TWILIO_CALLER_ID=+17577096408
TWILIO_API_KEY=<twilio api key - ask Mark>
TWILIO_API_SECRET=<twilio api secret - ask Mark>
TWILIO_TWIML_APP_SID=<twilio twiml app sid - ask Mark>
PUBLIC_BASE_URL=https://YOUR-TUNNEL-URL-HERE.trycloudflare.com
```

**What each thing means:**

| Setting | What It Does |
|---------|-------------|
| `JWT_SECRET` | A secret password used to create login tokens. Like a secret handshake. |
| `PORT` | The door number the backend listens on. `5000` means `http://localhost:5000`. |
| `ALLOWED_ORIGINS` | Which websites are allowed to talk to the backend. |
| `SUPABASE_URL` | The address of our database (where all the data lives). |
| `SUPABASE_ANON_KEY` | A key to read public data from the database. |
| `SUPABASE_SERVICE_ROLE_KEY` | A super-admin key for the database (can do anything). |
| `TWILIO_ACCOUNT_SID` | Our Twilio account ID (Twilio = the phone call service). |
| `TWILIO_AUTH_TOKEN` | Password for Twilio. |
| `TWILIO_CALLER_ID` | The phone number Twilio uses to make calls. |
| `TWILIO_API_KEY` | A special key for making voice call tokens. |
| `TWILIO_API_SECRET` | Goes with the API key — like a username and password pair. |
| `TWILIO_TWIML_APP_SID` | Tells Twilio which app to use for voice calls. |
| `PUBLIC_BASE_URL` | The Cloudflare tunnel URL so Twilio can reach our backend from the internet. |

### 3e. Start the backend!
```
node server.js
```

You should see:
```
Server is running on http://localhost:5000
[TwiML] Updated TwiML App voice URL → https://your-tunnel.trycloudflare.com/api/twilio/voice
```

**🚨 DO NOT CLOSE THIS WINDOW.** If you close it, EVERYTHING stops working.

---

## 🔗 Step 4: Start the Cloudflare Tunnel (For Phone Calls)

Twilio (the phone call service) lives on the internet. It needs to reach your backend. But your backend is on YOUR computer, not on the internet. So we make a "tunnel" — like a secret passage.

### 4a. Open a NEW PowerShell window (don't close the backend one!)

### 4b. Run the tunnel:
```
cloudflared tunnel --url http://localhost:5000
```

### 4c. Copy the URL it gives you

It prints something like:
```
https://apple-banana-cherry.trycloudflare.com
```

### 4d. Put that URL in the backend `.env` file

Open `backend/.env` and change this line:
```
PUBLIC_BASE_URL=https://apple-banana-cherry.trycloudflare.com
```

### 4e. Also update the phone app configs

Open `End-User-Mobile-Proteksyon-main/src/config.ts` and change:
```typescript
export const API_URL = 'https://apple-banana-cherry.trycloudflare.com';
export const NODE_API_URL = 'https://apple-banana-cherry.trycloudflare.com';
```

Open `mobile-firetruck-expo/src/config.ts` and change:
```typescript
export const API_URL = 'https://apple-banana-cherry.trycloudflare.com';
```

### 4f. Restart the backend

1. Go to the backend PowerShell window
2. Press `Ctrl + C` to stop it
3. Type `node server.js` again

You should see the `[TwiML] Updated TwiML App voice URL` message with your new URL. That means it worked!

---

## 🏢 Step 5: Start the Main Admin Dashboard

This is the website for the BFP headquarters boss.

### 5a. Open a NEW PowerShell window

### 5b. Go to the folder and install things:
```
cd BFP_Stations-main\BFP_ADMIN
npm install
```

### 5c. Check the `.env` file

There's a file called `.env` in this folder. Make sure it says:

```env
VITE_API_URL=http://localhost:5000/api
VITE_STATION_ID=1
VITE_SUPABASE_URL=https://ccmwlhbrwrmqjxkgjswj.supabase.co
VITE_SUPABASE_ANON_KEY=<same anon key as backend - ask Mark>
```

**What each thing means:**

| Setting | What It Does |
|---------|-------------|
| `VITE_API_URL` | Where the backend is. Since it's on the same computer, it's `localhost:5000`. |
| `VITE_STATION_ID` | This admin's station number. `1` = Central Fire Station (Main). |
| `VITE_SUPABASE_URL` | Same database address as the backend. |
| `VITE_SUPABASE_ANON_KEY` | Same database key as the backend. |

### 5d. Start it!
```
npm run dev
```

### 5e. Open your browser and go to:
```
http://localhost:5173/
```

### 5f. Log in

Use an admin account. **Ask Mark for the username and password.**

> **How it works:** The main admin is the LAST person to get emergency calls. First, the system tries the nearest fire station. If they don't answer in 15 seconds, it tries the next nearest. Only if ALL stations fail, the main admin gets the call.

---

## 🏠 Step 6: Start the Substation Dashboard

This is the website each fire station uses. You can run multiple stations at the same time!

### 6a. Open a NEW PowerShell window

### 6b. Go to the folder and install things (only need to do this once):
```
cd BFP_Stations-main\Substation_admin
npm install
```

### 6c. Check the `.env` file

There's a `.env` file here too. It tells the dashboard WHICH station it is:

```env
VITE_API_URL=http://localhost:5000/api
VITE_STATION_ID=3
```

**Station numbers in the database:**

| Number | Station Name |
|--------|-------------|
| 1 | Central Fire Station (Main) — used by Main Admin only |
| 2 | Sta. Catalina Fire Station |
| 3 | Poblacion Fire Station |
| 4 | San Jose Gusu Fire Station |
| 5 | Tetuan Fire Station |

> 💡 To run a different station, change `VITE_STATION_ID` to a different number. Make sure the user you log in as has the SAME `assigned_station_id` in the database!

### 6d. Start it!
```
npm run dev
```
It runs on port `5174` by default.

### 6e. Open your browser:
```
http://localhost:5174/
```

### 6f. Want to run MORE stations at the same time?

Open ANOTHER PowerShell, go to the same folder, and run with a different port:
```
npx vite --port 5175
```

Then open `http://localhost:5175/` in a **different browser** (like Edge if you used Chrome for the first one).

> ⚠️ **IMPORTANT:** Use **different browsers** for different stations! If you use the same browser for two stations, the phone calls will get confused about which station to ring.

---

## 📱 Step 7: Start the Civilian Phone App

This is the app regular people use to report fires.

### 7a. Open a NEW PowerShell window

### 7b. Go to the folder and install things:
```
cd End-User-Mobile-Proteksyon-main
npm install
```

### 7c. Tell the app where the backend is

Open the file `src/config.ts` and make sure it has the right URL:

**If using Same Wi-Fi (Way A):**
```typescript
export const API_URL = 'http://192.168.1.100:5000';      // ← put YOUR_IP here
export const NODE_API_URL = 'http://192.168.1.100:5000';  // ← same thing
```

**If using Cloudflare Tunnel (Way B):**
```typescript
export const API_URL = 'https://apple-banana-cherry.trycloudflare.com';      // ← your tunnel URL
export const NODE_API_URL = 'https://apple-banana-cherry.trycloudflare.com';  // ← same URL
```

### 7d. Start the app:

**Simple way (for testing how it looks):**
```
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone.

**Full way (for voice calls to actually work):**
```
npx expo start --dev-client
```
or
```
npx expo run:android
```

> ⚠️ **Voice calls (talking to fire stations) ONLY work with a development build**, not Expo Go. Expo Go is fine for testing screens and buttons though.

### 7e. How Signup Works

1. Open the app and tap **Sign Up**
2. You'll see two tabs at the top: **Phone** and **Email** — pick which one you want to use
3. Fill in your name, phone number (or email), address, and password
4. Tap **Sign Up** — the app sends your info to the backend
5. You'll get a text message (if phone) or email (if email) with a 6-digit code
6. Type the code in the next screen
7. If the code is correct, you're verified! Go to the Login screen
8. Log in with your phone number (or email) and password

### 7f. How Emergency Calls Work

1. Open the app while logged in
2. Press the big **EMERGENCY** button
3. A confirmation pops up — tap **YES, CALL NOW**
4. The app does these things automatically:
   - Gets your GPS location
   - Sends an alarm to the backend
   - Dials the nearest fire station using internet phone call (VoIP)
5. You'll see the screen change colors:
   - 🔵 **Locating...** → getting your location
   - 🟡 **Sending alert...** → backend is finding the nearest station
   - 🟡 **Dialing...** → calling the station
   - 🟡 **Ringing...** → the station's phone is ringing (you hear a ring-ring sound)
   - 🟢 **Connected!** → someone picked up! You can talk now!
   - 🔴 **Redirecting...** → station didn't answer, trying the next one

---

## 🚒 Step 8: Start the Firetruck App

This is the app for firetruck drivers.

### 8a. Open a NEW PowerShell window

### 8b. Go to the folder and install things:
```
cd mobile-firetruck-expo
npm install
```

### 8c. Tell the app where the backend is

Open `src/config.ts` and set the URL (same as Step 7c):

```typescript
export const API_URL = 'https://apple-banana-cherry.trycloudflare.com';  // ← your tunnel URL
```

### 8d. Start the app:
```
npx expo start
```
Scan the QR code with Expo Go on your phone.

### 8e. Log in

Use a test account:
- **ID Number:** `BFP-TRUCK01`
- **Password:** `truck123`

### 8f. What the app does

The app has 3 tabs:

1. **🏠 Home (Mission Control):**
   - Shows your current status and alarm level
   - Tap buttons to change status: **Standby → En Route → On Scene → Fire Out**
   - Change alarm level: **1st Alarm → 2nd Alarm → ... → General Alarm**
   - Every change is sent to ALL admin dashboards instantly

2. **📍 Tracking:**
   - Press **START TRACKING** to send your GPS location every 5 seconds
   - Admins can see where you are on a live map as a 🚒 firetruck icon
   - The caller/incident location shows as a 📱 phone icon
   - Location updates are sent via both REST API and Socket.IO for reliability

3. **👤 Profile:**
   - Your info and a Sign Out button

---

## 🔥 How the ENTIRE System Works (The Big Story)

Here's what happens when someone reports a fire — from start to finish:

### Chapter 1: "Help! There's a Fire!"
```
😰 Person opens the Civilian App
     ↓
😰 Presses the big red EMERGENCY button
     ↓
📱 App gets their GPS location
     ↓
📱 App sends alarm to the 🧠 Backend
```

### Chapter 2: "Find the Nearest Station!"
```
🧠 Backend looks at ALL fire stations
     ↓
🧠 Measures the distance from the fire to each station (using math called KNN/Haversine)
     ↓
🧠 Picks the CLOSEST station that is ONLINE and READY
     ↓
🧠 Sends the alarm to that station via Socket.IO
     ↓
🧠 Also makes a VoIP phone call to that station via Twilio
```

### Chapter 3: "Ring Ring Ring..."
```
🏠 Station's dashboard shows a popup: "INCOMING EMERGENCY!"
     ↓
🏠 Station has 15 seconds to click ACCEPT
     ↓
├── ✅ They click ACCEPT:
│    → Voice call connects! They can talk to the person
│    → Civilian app turns GREEN: "Connected!"
│    → Station dispatches a firetruck
│
└── ❌ They DON'T answer in 15 seconds:
     → Backend sends the alarm to the NEXT nearest station
     → Civilian app shows: "Redirecting to another station..."
     → The ringing starts again at the new station
     → This repeats for every station
```

### Chapter 4: "Last Resort"
```
If ALL substations fail to answer:
     ↓
🏢 Main Admin (headquarters) gets the call
     ↓
They have 15 seconds too
     ↓
├── ✅ Main Admin answers → Connected!
│
└── ❌ Main Admin doesn't answer either:
     → Civilian sees: "No answer from any station. Please try again."
```

### Chapter 5: "The Firetruck Is Coming!"
```
🚒 Driver opens the Firetruck App
     ↓
🚒 Presses "En Route" → Everyone sees "Truck is on the way!"
     ↓
🚒 Arrives at the fire → Presses "On Scene"
     ↓
🚒 Fire is bigger than expected → Changes alarm from 1st to 2nd
     → All dashboards update instantly
     ↓
🚒 Fire is out → Presses "Fire Out"
     ↓
🚒 Mission complete → "End Mission" → Back to Standby
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

## 🗃️ Database Info (Supabase)

All data lives in a Supabase PostgreSQL database. Here are the important tables:

### `users` table — Everyone who logs in
| Column | What It Is |
|--------|-----------|
| `id` | Unique number for each user |
| `id_number` | Login ID (like `BFP-001` or `CIV_abc123`) |
| `first_name` | First name |
| `last_name` | Last name |
| `phone_number` | Phone number (format: `+639171234567`) |
| `email` | Email address (can be empty/null) |
| `password_hash` | Encrypted password (bcrypt) |
| `role` | `admin`, `sub-admin`, `end-user`, or `driver` |
| `assigned_station_id` | Which station this person belongs to (matches `fire_stations.station_id`) |
| `is_verified` | `true` if they verified their OTP code |
| `address` | Home address |

### `fire_stations` table — All fire stations
| station_id | station_name | station_type |
|------------|-------------|-------------|
| 1 | Central Fire Station (Main) | main |
| 2 | Sta. Catalina Fire Station | substation |
| 3 | Poblacion Fire Station | substation |
| 4 | San Jose Gusu Fire Station | substation |
| 5 | Tetuan Fire Station | substation |

### `_alarms` table — Every emergency that's been reported
| Column | What It Is |
|--------|-----------|
| `alarm_id` | Unique number |
| `phone_number` | Who reported it |
| `latitude`, `longitude` | Where the fire is |
| `incident_type` | "Fire", etc. |
| `alarm_level` | "Alarm 1", "Alarm 2", etc. |
| `status` | "Pending Dispatch", "Dispatched", "Resolved" |
| `assigned_station_id` | Which station is handling it |
| `location` | Description of the location |
| `narrative` | What happened |

### `station_readiness` table — Which stations are ready
Each station needs a row here with `status = 'READY'` or the system will skip them during dispatch.

### `firetruck_status` table — Live truck tracking
| Column | What It Is |
|--------|-----------|
| `truck_id` | Which truck |
| `alarm_level` | Current alarm level |
| `fire_status` | "Standby", "En Route", "On Scene", "Fire Out" |
| `latitude`, `longitude` | Where the truck is right now |
| `driver_name` | Who's driving |
### `firetruck_location_history` table — GPS location archive
| Column | What It Is |
|--------|----------|
| `location_id` | Unique ID |
| `truck_id` | Which truck |
| `alarm_id` | Which alarm this location relates to |
| `latitude`, `longitude` | GPS coordinates |
| `speed` | Speed in m/s |
| `heading` | Direction of travel |
| `accuracy` | GPS accuracy in meters |
| `recorded_at` | When this position was recorded |

> This is the table that the tracking endpoint writes to and the map reads from.
> 📝 For the full database with ALL tables, see [COMPLETE_SUPABASE_SCHEMA.sql](COMPLETE_SUPABASE_SCHEMA.sql).

---

## 📞 Twilio Info (Phone Call System)

Twilio makes the VoIP (internet phone calls) work. Here's what you need to know:

### How Twilio identities work:

Every person who can make or receive calls gets a **Twilio identity** — like a username for phone calls:

| Identity | Who |
|----------|-----|
| `ADM_MAIN` | Main admin dashboard |
| `ADM_SUB_2` | Sta. Catalina station |
| `ADM_SUB_3` | Poblacion station |
| `ADM_SUB_4` | San Jose Gusu station |
| `ADM_SUB_5` | Tetuan station |
| `CIV_639171234567` | A civilian (phone digits after CIV_) |
| `TRUCK_1` | Firetruck #1 |

### How a voice call works step by step:

```
📱 Civilian App says: "Call ADM_SUB_3"
     ↓
☁️ Twilio receives the call
     ↓
☁️ Twilio asks our backend: "What should I do?"
   (It calls: PUBLIC_BASE_URL/api/twilio/voice)
     ↓
🧠 Backend says: "Ring the client called ADM_SUB_3 with a US ringtone"
     ↓
☁️ Twilio rings ADM_SUB_3 in the station's browser
     ↓
🏠 Station sees: "INCOMING EMERGENCY!" popup
     ↓
🏠 Admin clicks Accept → Audio connects → They talk!
```

> **Why Cloudflare tunnel matters here:** Twilio lives on the internet. It needs to reach `PUBLIC_BASE_URL/api/twilio/voice` on your computer. Without the tunnel, Twilio can't find your backend and calls won't work.

---

## ✅ Quick Start — Just the Commands

Open **6 PowerShell windows** and run these in order:

### PowerShell 1: Backend (START THIS FIRST!)
```powershell
cd backend
npm install
node server.js
```

### PowerShell 2: Cloudflare Tunnel
```powershell
cloudflared tunnel --url http://localhost:5000
```
Copy the URL, put it in `backend/.env` as `PUBLIC_BASE_URL`, update `src/config.ts` in both mobile apps, then restart backend.

### PowerShell 3: Main Admin Dashboard
```powershell
cd BFP_Stations-main\BFP_ADMIN
npm install
npm run dev
```
Open `http://localhost:5173` in Chrome.

### PowerShell 4: Substation Dashboard
```powershell
cd BFP_Stations-main\Substation_admin
npm install
npm run dev
```
Open `http://localhost:5174` in Edge (use a **different browser!**).

### PowerShell 5: Civilian Phone App
```powershell
cd End-User-Mobile-Proteksyon-main
npm install
npx expo start
```
Scan QR code on phone with Expo Go.

### PowerShell 6: Firetruck Phone App
```powershell
cd mobile-firetruck-expo
npm install
npx expo start
```
Scan QR code on another phone (or same phone).

---

## 📋 Summary Table: What Runs Where

| App | Folder | Command | Port / URL | Browser |
|-----|--------|---------|-----------|---------|
| 🧠 Backend | `backend/` | `node server.js` | `localhost:5000` | (runs in terminal) |
| 🔗 Tunnel | anywhere | `cloudflared tunnel --url http://localhost:5000` | random `.trycloudflare.com` URL | (runs in terminal) |
| 🏢 Main Admin | `BFP_Stations-main/BFP_ADMIN/` | `npm run dev` | `localhost:5173` | Chrome |
| 🏠 Substation | `BFP_Stations-main/Substation_admin/` | `npm run dev` | `localhost:5174` | Edge |
| 📱 Civilian | `End-User-Mobile-Proteksyon-main/` | `npx expo start` | QR code | Phone (Expo Go) |
| 🚒 Firetruck | `mobile-firetruck-expo/` | `npx expo start` | QR code | Phone (Expo Go) |

---

## 🔐 Secret Files (.env) — What Goes Where

### `backend/.env`
```env
JWT_SECRET='your_super_secret_jwt_key_change_this_in_production'
PORT='5000'
NODE_ENV='production'
ALLOWED_ORIGINS='http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176'
SUPABASE_URL=https://ccmwlhbrwrmqjxkgjswj.supabase.co
SUPABASE_ANON_KEY=<ask Mark>
SUPABASE_SERVICE_ROLE_KEY=<ask Mark>
TWILIO_ACCOUNT_SID=<ask Mark>
TWILIO_AUTH_TOKEN=<ask Mark>
TWILIO_CALLER_ID=+17577096408
TWILIO_API_KEY=<ask Mark>
TWILIO_API_SECRET=<ask Mark>
TWILIO_TWIML_APP_SID=<ask Mark>
PUBLIC_BASE_URL=https://YOUR-TUNNEL-URL.trycloudflare.com
```

### `BFP_Stations-main/BFP_ADMIN/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_STATION_ID=1
VITE_SUPABASE_URL=https://ccmwlhbrwrmqjxkgjswj.supabase.co
VITE_SUPABASE_ANON_KEY=<same anon key as backend>
```

### `BFP_Stations-main/Substation_admin/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_STATION_ID=3
```
Change `VITE_STATION_ID` to whichever station you want to run (2, 3, 4, or 5).

### `End-User-Mobile-Proteksyon-main/src/config.ts`
```typescript
export const API_URL = 'https://YOUR-TUNNEL-URL.trycloudflare.com';
export const NODE_API_URL = 'https://YOUR-TUNNEL-URL.trycloudflare.com';
export const TEST_CALLER_PHONE = '+639000000000';
```

### `mobile-firetruck-expo/src/config.ts`
```typescript
export const API_URL = 'https://YOUR-TUNNEL-URL.trycloudflare.com';
```

---

## 📦 Backend API Endpoints (What the Backend Can Do)

Here are all the important things you can ask the backend to do:

### Authentication
| Method | URL | What It Does |
|--------|-----|-------------|
| POST | `/api/login` | Log in with id_number, phone, or email + password |
| POST | `/api/end-user-signup` | Create a new civilian account |
| POST | `/api/send-otp` | Send a 6-digit verification code (SMS or email) |
| POST | `/api/verify-otp` | Check if the code is correct |

### Twilio Voice
| Method | URL | What It Does |
|--------|-----|-------------|
| POST | `/api/twilio/token` | Get a Twilio voice token (for making/receiving calls) |
| POST | `/api/twilio/voice` | Voice webhook — Twilio calls this to know what to do |

### Incidents / Alarms
| Method | URL | What It Does |
|--------|-----|-------------|
| POST | `/api/enduser/create-alarm` | Report an emergency (creates alarm + dispatches) |
| POST | `/api/incidents/:id/accept` | Accept an incoming emergency |
| POST | `/api/incidents/:id/reject` | Reject/dismiss an emergency |

### Socket.IO Events (Real-Time)
| Event | Direction | What It Does |
|-------|-----------|-------------|
| `join-station` | Client → Server | Station joins its room (e.g., `station-3`) |
| `join-main-admin` | Client → Server | Main admin joins the `main-admin` room |
| `join-alarm` | Client → Server | Civilian joins alarm room for failover events |
| `station-online` | Client → Server | Station announces it's online and ready |
| `incoming-incident` | Server → Client | "You have an emergency!" popup |
| `call-accepted` | Server → Client | "Station picked up!" (civilian goes green) |
| `failover-redirect` | Server → Client | "Trying next station..." |
| `failover-exhausted` | Server → Client | "Nobody answered." |
| `auto-reject` | Server → Client | "Time's up, moving to next station." |
| `truck-status-update` | Client → Server → Client | Firetruck status broadcast |

---

## 🐛 Something Broken? Read This!

### "My phone can't connect to the backend"
1. Is the backend running? Check the terminal — it should say `Server is running on http://localhost:5000`
2. Is the URL right in `src/config.ts`?
3. If using Wi-Fi: are phone and computer on the SAME Wi-Fi?
4. If Wi-Fi doesn't work: use the Cloudflare tunnel instead

### "Voice calls don't work / No sound"
1. Is the Cloudflare tunnel running?
2. Did you put the tunnel URL in `backend/.env` as `PUBLIC_BASE_URL`?
3. Did you restart the backend AFTER updating the URL?
4. Look in the backend terminal for `[TwiML] Updated TwiML App voice URL` — if you don't see it, something's wrong
5. For the civilian app: voice calls need a **development build** (`expo run:android`), NOT Expo Go

### "Station doesn't get the incoming call popup"
1. Is the station user logged in with the right `assigned_station_id`?
2. Does `VITE_STATION_ID` in the station's `.env` match?
3. Is the station online? Look at the backend terminal for `[Socket] station-online`
4. Try hard-refreshing: `Ctrl + Shift + R`

### "I click Accept but the call stays on ringing"
This was fixed! The system now has a "pending accept" feature. If you click Accept before the Twilio call arrives, it waits and auto-accepts when the call shows up. Make sure you're running the latest code.

### "The tunnel URL changed and now nothing works"
When you restart the Cloudflare tunnel, you need to update **3 files** with the new URL:
1. `backend/.env` → `PUBLIC_BASE_URL`
2. `End-User-Mobile-Proteksyon-main/src/config.ts` → `API_URL` and `NODE_API_URL`
3. `mobile-firetruck-expo/src/config.ts` → `API_URL`
4. **Restart the backend** after updating!

### "Login says wrong password but I'm sure it's right"
- Admin/sub-admin: login uses `id_number` field
- Civilians: login tries `id_number` first, then `phone_number`, then `email`
- Password must have been created through the signup flow (it's encrypted with bcrypt)

### "OTP code doesn't work"
- Phone OTP: code is valid for 5 minutes. If expired, request a new one.
- Email OTP: the code comes from Supabase Auth, not our backend. Check your spam folder.
- If the backend was restarted between sending and verifying: phone OTPs are stored in memory and get erased on restart. Just send a new one.

### "Signup says phone number already registered"
- Each phone number can only have one account
- Each email can only have one account
- To re-register: delete the old user from the Supabase `users` table first

### "Multiple stations ring at the same time"
- Use **different browsers** for different stations (Chrome, Edge, Firefox, Incognito)
- Each browser tab registers its own Twilio device — same browser = confused calls

### "Firetruck tracking is on but no truck icon on the map"
1. Check the backend terminal for `jwt expired` errors — if you see those, **log out and log back in on the firetruck app** to get a fresh token
2. The map now uses both REST polling AND real-time socket events, so trucks should appear even if one method fails
3. Make sure the firetruck app shows "Tracking: Active" on the Tracking tab
4. The truck icon (🚒) only appears if the firetruck has valid GPS coordinates — check that location permissions are granted
5. Locations older than 30 seconds are automatically hidden from the map

### "Firetruck notifications keep repeating every few seconds"
- This was fixed! Notifications now only appear when the truck's **status or alarm level actually changes** (e.g., Standby → En Route), not on every location ping
- If you still see repeats, hard-refresh the admin dashboard: `Ctrl + Shift + R`

---

## 📚 Other Documentation Files

| File | What It's About |
|------|----------------|
| [CHANGES_MARCH10_2026.md](CHANGES_MARCH10_2026.md) | Changes from March 10, 2026: firetruck tracking fix, map icons, notification dedup |
| [SESSION_CHANGES.md](SESSION_CHANGES.md) | Detailed log of every code change in the latest debugging session |
| [COMPLETE_SUPABASE_SCHEMA.sql](COMPLETE_SUPABASE_SCHEMA.sql) | Full database setup SQL |
| [DATABASE_SETUP_SUMMARY.md](DATABASE_SETUP_SUMMARY.md) | Database overview |
| [HOW_TO_RUN.md](HOW_TO_RUN.md) | Quick run instructions |
| [README.md](README.md) | General project info |

---

*Last updated: March 10, 2026*
