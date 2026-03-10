# BFP Emergency System — Session Changes Log

> **Date Started:** March 2026  
> **Last Updated:** March 11, 2026  
> **Summary:** Full debugging and feature session covering auth, signup/OTP, Twilio VoIP, dispatch, firetruck tracking, alarm escalation notifications, and admin call acceptance across all 5 apps.

---

## Table of Contents

1. [Backend Server Hardening](#1-backend-server-hardening)
2. [Substation Login Fix (PGRST116)](#2-substation-login-fix-pgrst116)
3. [JWT Auth Fix (Invalid Signature)](#3-jwt-auth-fix-invalid-signature)
4. [Cloudflare Tunnel Restart + Config Update](#4-cloudflare-tunnel-restart--config-update)
5. [Station ID Corrections](#5-station-id-corrections)
6. [Twilio Ringback Tone](#6-twilio-ringback-tone)
7. [Station Readiness Fix](#7-station-readiness-fix)
8. [Civilian (CIV_) Token Auth Bypass](#8-civilian-civ_-token-auth-bypass)
9. [End-User Signup Rewrite (RegisterScreen)](#9-end-user-signup-rewrite-registerscreen)
10. [Phone / Email Toggle on Signup](#10-phone--email-toggle-on-signup)
11. [Duplicate Email Constraint Fix](#11-duplicate-email-constraint-fix)
12. [OTP Send & Verify Flow](#12-otp-send--verify-flow)
13. [OTP Verification Mismatch Fix](#13-otp-verification-mismatch-fix)
14. [Admin Reactive Token State](#14-admin-reactive-token-state)
15. [Twilio Call Stuck-on-Ring Fix (Pending Accept)](#15-twilio-call-stuck-on-ring-fix-pending-accept)
16. [Dispatch Failover Race Condition Fix](#16-dispatch-failover-race-condition-fix)

---

## 1. Backend Server Hardening

**Files changed:**
- `backend/server.js`

**What was wrong:**  
Backend was missing `trust proxy` setting, which broke IP detection behind the Cloudflare tunnel. CORS was too restrictive and blocked admin dashboards.

**What was done:**
- Added `app.set('trust proxy', 1)` so `X-Forwarded-For` headers from Cloudflare are trusted
- Updated CORS to dynamically allow `localhost:5173`, `localhost:5174`, and any `*.trycloudflare.com` subdomain
- Rate limiter on auth routes (10 requests / 15 min window)

**Dependencies:**  
- Cloudflare tunnel must be running for `trust proxy` to matter
- `ALLOWED_ORIGINS` in `backend/.env` lists allowed origins

---

## 2. Substation Login Fix (PGRST116)

**Files changed:**
- `backend/routes/authRoutes.js`

**What was wrong:**  
Substation login failed with error `PGRST116` ("JSON object requested, multiple (or no) rows returned"). The Supabase query used `.single()` which throws when zero rows match.

**What was done:**
- Changed `.single()` → `.maybeSingle()` in the login query so it returns `null` instead of throwing when no user is found

**Dependencies:**  
- Supabase `users` table must have the user with correct `id_number` or `phone_number`

---

## 3. JWT Auth Fix (Invalid Signature)

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/context/AuthContext.jsx`
- `BFP_Stations-main/Substation_admin/src/context/AuthContext.jsx`

**What was wrong:**  
After login, the JWT token stored in `localStorage` was being read but not placed in React state. When the Twilio voice hook tried to use it, it sent a stale or empty token, causing "invalid signature" errors.

**What was done:**
- Added reactive `token` state: `useState(() => localStorage.getItem('authToken'))`
- `token` is now exposed through AuthContext so Twilio hook re-renders when login happens
- On verify failure: `setToken(null)` clears stale tokens
- On verify success: `setToken(stored)` ensures Twilio gets the current JWT

**Dependencies:**  
- `JWT_SECRET` in `backend/.env` must match the secret used to sign tokens at login
- Current value: `your_super_secret_jwt_key_change_this_in_production`

---

## 4. Cloudflare Tunnel Restart + Config Update

**Files changed:**
- `backend/.env` → `PUBLIC_BASE_URL`
- `End-User-Mobile-Proteksyon-main/src/config.ts` → `API_URL`, `NODE_API_URL`
- `mobile-firetruck-expo/src/config.ts` → `API_URL`

**What was wrong:**  
Previous Cloudflare tunnel URL expired (tunnels get a new URL every restart). All apps pointed to the dead URL.

**What was done:**
- Ran `cloudflared tunnel --url http://localhost:5000` to get a fresh URL
- Updated all config files to the new URL: `https://member-hart-williams-programmers.trycloudflare.com`
- Restarted backend so TwiML App voice URL was updated via the Twilio API

**Dependencies:**  
- `cloudflared` must be installed
- After every tunnel restart, ALL config files need the new URL + backend must restart
- The backend auto-updates the TwiML App `voiceUrl` on startup using the Twilio REST API

---

## 5. Station ID Corrections

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/.env` → `VITE_STATION_ID=1`
- `BFP_Stations-main/Substation_admin/.env` → `VITE_STATION_ID=3`

**What was wrong:**  
Station IDs in `.env` files used old values (`101`, `103`) that didn't match the Supabase `fire_stations` table.

**What was done:**
- Corrected to actual DB station IDs:
  - `1` = Central Fire Station (Main)
  - `2` = Sta. Catalina Fire Station
  - `3` = Poblacion Fire Station
  - `4` = San Jose Gusu Fire Station
  - `5` = Tetuan Fire Station

**Dependencies:**  
- `fire_stations` table in Supabase must have these exact `station_id` values
- Users' `assigned_station_id` in the `users` table must match

---

## 6. Twilio Ringback Tone

**Files changed:**
- `backend/routes/twilioTokenRoutes.js`

**What was wrong:**  
When a civilian called a station, they heard dead silence while the call was connecting. No indication that the call was ringing.

**What was done:**
- Added `ringTone: 'us'` to the TwiML `<Dial>` verb for Client-to-Client calls
- The civilian now hears the standard US phone ringing sound while waiting

**Dependencies:**  
- Twilio account must be active
- `TWILIO_TWIML_APP_SID` must point to the correct TwiML App

---

## 7. Station Readiness Fix

**Files changed:**
- Database: `station_readiness` table in Supabase

**What was wrong:**  
Stations showed as "NOT READY" because the `station_readiness` table was missing records.

**What was done:**
- Inserted `READY` records for all 5 stations (station_id 1–5)

**Dependencies:**  
- `station_readiness` table must exist in Supabase
- Each station needs at least one row with `status = 'READY'`

---

## 8. Civilian (CIV_) Token Auth Bypass

**Files changed:**
- `backend/routes/twilioTokenRoutes.js`
- `End-User-Mobile-Proteksyon-main/src/hooks/useTwilioVoice.ts`

**What was wrong:**  
Civilian users (identity starts with `CIV_`) don't always have a JWT token (especially during emergency calls). The Twilio token endpoint required JWT, blocking civilian VoIP.

**What was done:**
- **Backend (`twilioTokenRoutes.js`):** Added middleware check — if identity starts with `CIV_`, skip JWT auth and call `next()` directly
- **Mobile hook (`useTwilioVoice.ts`):** CIV_ identities skip the `authToken` requirement for initialization; `fetchToken` sends `Authorization` header only if token exists

**Dependencies:**  
- Only CIV_ prefixed identities bypass auth — all admin/station identities still require JWT
- The civilian identity format is `CIV_` + phone digits (e.g., `CIV_639171234567`)

---

## 9. End-User Signup Rewrite (RegisterScreen)

**Files changed:**
- `End-User-Mobile-Proteksyon-main/src/screens/Auth/RegisterScreen.tsx`

**What was wrong:**  
Original signup used Supabase Auth OTP directly, which was inconsistent with the backend's user management. Users were created in Supabase Auth but not in the `public.users` table.

**What was done:**
- Complete rewrite: RegisterScreen now calls backend `POST /api/end-user-signup`
- Backend creates the user in `public.users` with bcrypt hashed password
- After signup, calls `POST /api/send-otp` to send verification code
- Navigates to `VerifyOtp` screen

**Dependencies:**  
- Backend must be running at the URL in `config.ts`
- `users` table must have columns: `id_number`, `first_name`, `last_name`, `phone_number`, `email`, `password_hash`, `role`, `address`, `is_verified`

---

## 10. Phone / Email Toggle on Signup

**Files changed:**
- `End-User-Mobile-Proteksyon-main/src/screens/Auth/RegisterScreen.tsx`

**What was wrong:**  
User complained that the phone/email signup option was missing after the rewrite.

**What was done:**
- Added `signUpMethod` state: `'phone' | 'email'`
- Toggle tabs rendered in the header — user can switch between phone and email registration
- Phone input shows when `signUpMethod === 'phone'`, email input shows when `signUpMethod === 'email'`
- Phone validation: must start with `09`, `+63`, or `63`

**Dependencies:**  
- Backend `/api/end-user-signup` accepts either `phone` or `gmail` field
- Backend `/api/send-otp` sends SMS for phone or Supabase Auth email for email

---

## 11. Duplicate Email Constraint Fix

**Files changed:**
- `backend/routes/authRoutes.js`

**What was wrong:**  
Signup failed with `23505` error (unique constraint violation on `users_email_key`) because empty email strings collided and `id_number` column was too short for email-based IDs.

**What was done:**
- Empty email strings converted to `null` before insert
- Email-based signup uses short timestamp IDs: `CIV_${Date.now().toString(36)}` (fits varchar(20))
- Added `23505` error catch to return "Phone number or email already registered" instead of crashing

**Dependencies:**  
- `users.email` column allows `null`
- `users.id_number` column is `varchar(20)`
- Unique constraints exist on `email` and `phone_number`

---

## 12. OTP Send & Verify Flow

**Files changed:**
- `backend/routes/authRoutes.js` (new endpoints)
- `End-User-Mobile-Proteksyon-main/src/screens/Auth/RegisterScreen.tsx`
- `End-User-Mobile-Proteksyon-main/src/screens/Auth/VerifyOtpScreen.tsx`

**What was wrong:**  
After the signup rewrite, the OTP flow was broken. Signup no longer opened the OTP screen.

**What was done:**
- **Backend:** Created `POST /api/send-otp` endpoint:
  - Phone: generates 6-digit code, stores in `otpStore` (in-memory Map), sends via Twilio SMS
  - Email: calls `supabase.auth.signInWithOtp({ email })` which sends a magic code
- **Backend:** Created `POST /api/verify-otp` endpoint:
  - Phone: checks code against `otpStore`, marks user `is_verified = true`
  - Email: calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`, marks user verified
- **RegisterScreen:** After successful signup, calls `/api/send-otp`, then navigates to `VerifyOtp`
- **VerifyOtpScreen:** Sends code to `/api/verify-otp`, on success navigates to Login

**Dependencies:**  
- Twilio SMS requires valid `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_CALLER_ID`
- Supabase email OTP requires Supabase Auth to be configured with email provider
- `otpStore` is in-memory — OTPs are lost if backend restarts (5-minute expiry)

---

## 13. OTP Verification Mismatch Fix

**Files changed:**
- `backend/routes/authRoutes.js`

**What was wrong:**  
Email OTP was sent by Supabase Auth (its own code) but verified against the in-memory `otpStore` (which had a different code). Verification always failed for email users.

**What was done:**
- Email verification now uses `supabase.auth.verifyOtp({ email, token, type: 'email' })` instead of checking in-memory store
- Phone verification still uses `otpStore` (since phone OTPs are generated and stored by the backend)

**Dependencies:**  
- Supabase Auth email templates must be configured
- The OTP code the user receives via email comes from Supabase, not from our backend

---

## 14. Admin Reactive Token State

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/context/AuthContext.jsx`
- `BFP_Stations-main/Substation_admin/src/context/AuthContext.jsx`

**What was wrong:**  
Token was stored in `localStorage` but not in React state. Components consuming AuthContext (like the Twilio voice hook) never re-rendered when the token changed.

**What was done:**
- Added `const [token, setToken] = useState(...)` initialized from `localStorage`
- Exposed `token` through the context provider
- Updated on login/verify success: `setToken(newToken)`
- Cleared on auth failure: `setToken(null)`
- Substation has additional optimistic restore — if network fails but localStorage has user data, keeps `isAuthenticated = true` to avoid dropping active calls

**Dependencies:**  
- All components that need the auth token must use `useAuth()` hook instead of reading `localStorage` directly
- Twilio voice hooks receive `token` as a prop from `useAuth()`

---

## 15. Twilio Call Stuck-on-Ring Fix (Pending Accept)

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/App.jsx`
- `BFP_Stations-main/Substation_admin/src/App.jsx`

**What was wrong:**  
When admin clicks "Accept" on the incoming emergency modal BEFORE the Twilio SDK incoming call arrives, the code checks `if (twilioIncomingCall)` — but it's still `null`. So the Twilio audio call is never accepted. Both caller and admin are stuck on "ringing" forever even though the admin has "accepted."

**Root cause:** The Socket.IO `incoming-incident` event (which shows the modal) arrives faster than the Twilio SDK `incoming` event (which delivers the audio call). If the admin clicks Accept in that gap, the Twilio call is missed.

**What was done:**
- Added `pendingTwilioAccept` state flag (boolean)
- Accept button: if `twilioIncomingCall` exists → immediately accept; if not → set `pendingTwilioAccept = true`
- Added `useEffect` that watches `[pendingTwilioAccept, twilioIncomingCall]` — when both are truthy, auto-accepts the Twilio call and clears the flag

**Dependencies:**  
- `useTwilioVoice` hook must expose `twilioIncomingCall` and `twilioAcceptIncoming`
- Socket.IO `incoming-incident` event from backend must include `alarmId`
- Backend `POST /api/incidents/:id/accept` emits `call-accepted` to civilian socket room

---

## 16. Dispatch Failover Race Condition Fix

**Files changed:**
- `backend/routes/incidentRoutes.js`
- `backend/services/dispatchService.js`

**What was wrong:**  
When no substations were online, the backend immediately emitted `failover-redirect` at alarm creation time — but the civilian's socket hadn't joined the alarm room yet, so they never received the event.

**What was done:**
- Removed premature `failover-redirect` emit from the create-alarm endpoint
- Failover now only triggers from the dispatch service after the station's 15-second timer expires
- Added KNN debug logging to track station ranking decisions

**Dependencies:**  
- `onlineStations` service tracks which stations are connected via Socket.IO
- Failover timeout is 15 seconds per station (configurable in `dispatchService.js`)
- Station must emit `station-online` on socket connect to be considered "online"

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Civilian Mobile App                        │
│  (Expo React Native + @twilio/voice-react-native-sdk)       │
│  Identity: CIV_639XXXXXXXXX                                  │
└──────────────┬──────────────────────┬───────────────────────┘
               │ HTTP (signup/alarm)   │ Socket.IO (failover)
               │ VoIP (Twilio)         │
               ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Backend (:5000)                     │
│  Express + Socket.IO + Twilio + Supabase                     │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐    │
│  │ authRoutes   │ │ incidentRoutes│ │ twilioTokenRoutes  │    │
│  │ (login/otp)  │ │ (dispatch)    │ │ (voice webhook)    │    │
│  └─────────────┘ └──────────────┘ └────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐         │
│  │ dispatchService (KNN + failover timers)          │         │
│  └─────────────────────────────────────────────────┘         │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │ Supabase          │ Twilio            │ Socket.IO
       ▼                   ▼                   ▼
┌────────────┐    ┌──────────────┐    ┌──────────────────────┐
│  Supabase  │    │   Twilio     │    │  Admin Dashboards    │
│  Postgres  │    │  (Voice/SMS) │    │  Main (:5173)        │
│  + Auth    │    │              │    │  Sub  (:5174)        │
└────────────┘    └──────────────┘    │  Identity: ADM_MAIN  │
                                       │  / ADM_SUB_{id}      │
                                       └──────────────────────┘
```

---

## File Change Index

| # | File | What Changed |
|---|------|-------------|
| 1 | `backend/server.js` | trust proxy, CORS, rate limiter |
| 2 | `backend/.env` | PUBLIC_BASE_URL tunnel URL |
| 3 | `backend/routes/authRoutes.js` | login (.maybeSingle), end-user-signup, send-otp, verify-otp, duplicate handling |
| 4 | `backend/routes/twilioTokenRoutes.js` | CIV_ auth bypass, ringTone: 'us' |
| 5 | `backend/routes/incidentRoutes.js` | Removed premature failover-redirect, call-accepted emit |
| 6 | `backend/services/dispatchService.js` | KNN debug logging, failover timer fixes |
| 7 | `backend/middleware/auth.js` | JWT verification (unchanged, listed for reference) |
| 8 | `BFP_Stations-main/BFP_ADMIN/.env` | VITE_STATION_ID=1 |
| 9 | `BFP_Stations-main/BFP_ADMIN/src/App.jsx` | pendingTwilioAccept auto-accept |
| 10 | `BFP_Stations-main/BFP_ADMIN/src/context/AuthContext.jsx` | Reactive token state |
| 11 | `BFP_Stations-main/Substation_admin/.env` | VITE_STATION_ID=3 |
| 12 | `BFP_Stations-main/Substation_admin/src/App.jsx` | pendingTwilioAccept auto-accept |
| 13 | `BFP_Stations-main/Substation_admin/src/context/AuthContext.jsx` | Reactive token state |
| 14 | `End-User-Mobile-Proteksyon-main/src/config.ts` | Cloudflare tunnel URL |
| 15 | `End-User-Mobile-Proteksyon-main/src/screens/Auth/RegisterScreen.tsx` | Full rewrite: backend signup + phone/email toggle |
| 16 | `End-User-Mobile-Proteksyon-main/src/screens/Auth/VerifyOtpScreen.tsx` | Calls /api/verify-otp |
| 17 | `End-User-Mobile-Proteksyon-main/src/hooks/useTwilioVoice.ts` | CIV_ auth skip |
| 18 | `End-User-Mobile-Proteksyon-main/src/screens/Emergency/EmergencyCallScreen.tsx` | callPhase states, socket join-alarm, failover handling |
| 19 | `mobile-firetruck-expo/src/config.ts` | Cloudflare tunnel URL |

---

## Database Station IDs (Supabase `fire_stations` table)

| station_id | station_name | station_type |
|------------|-------------|-------------|
| 1 | Central Fire Station (Main) | main |
| 2 | Sta. Catalina Fire Station | substation |
| 3 | Poblacion Fire Station | substation |
| 4 | San Jose Gusu Fire Station | substation |
| 5 | Tetuan Fire Station | substation |

## Twilio Identity Naming Convention

| Pattern | Who | Example |
|---------|-----|---------|
| `ADM_MAIN` | Main admin dashboard | `ADM_MAIN` |
| `ADM_SUB_{station_id}` | Substation admin | `ADM_SUB_3` |
| `CIV_{phone_digits}` | Civilian mobile user | `CIV_639171234567` |
| `TRUCK_{truck_id}` | Firetruck driver | `TRUCK_1` |

---

# March 10, 2026 — Session Changes

## 17. Map Icons — Caller Phone Icon & Firetruck SVG Icon

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/components/MapContainer.jsx`
- `BFP_Stations-main/Substation_admin/src/components/MapContainer.jsx`
- `BFP_Stations-main/BFP_ADMIN/src/style/mapcontainer.css`
- `BFP_Stations-main/Substation_admin/src/style/mapcontainer.css`

**What was done:**
- **Caller/Incident marker:** Replaced the default blue Leaflet marker with a custom red circle containing a white phone SVG icon. Added a pulsing glow animation so the caller location stands out on the map.
- **Firetruck marker:** Replaced the emoji `🚒` with a proper SVG firetruck icon (red truck inside a white circle with red border and drop shadow).
- Added new CSS classes: `.caller-marker` and `.firetruck-marker`.

---

## 18. Firetruck Notification Deduplication (Show Once Only)

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/App.jsx`
- `BFP_Stations-main/Substation_admin/src/App.jsx`

**What was done:**
- Added a `notifiedTruckStatusRef` (`Set`) to track which truck+status combos have already been notified.
- Duplicate `truck-status-update` socket events for the same truck+status are silently skipped.

---

## 19. Firetruck Location Tracking — Database Table Fix

**Files changed:**
- `backend/routes/firetruckTrackingRoutes.js`

**What was done:**
- `POST /api/firetrucks/track` was inserting into non-existent `firetruck_locations` table. Changed to `firetruck_location_history` (the correct table).
- Mapped payload fields to match actual columns.

---

## 20. Socket-Based Location Persistence (Fallback)

**Files changed:**
- `backend/server.js`

**What was done:**
- The `truck-status-update` socket handler now also saves GPS coordinates to `firetruck_location_history`.
- Acts as a fallback for map display even if REST tracking endpoint fails.

---

## 21. Firetruck #1 Database Record

**What was done:**
- Inserted Firetruck #1 into `firetrucks` table (`truck_id: 1`, `truck_code: FT-001`, `assigned_station_id: 3`).

---

## 22. Mobile Firetruck App — Environment File

**Files created:**
- `mobile-firetruck-expo/.env`

**What was done:**
- Created `.env` with `EXPO_PUBLIC_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

# March 11, 2026 — Session Changes

## 23. End-User Mobile App — Environment File

**Files created:**
- `End-User-Mobile-Proteksyon-main/.env`

**What was done:**
- The End-User mobile app was crashing on launch with `EXPO_PUBLIC_BASE_URL is required`. Only `.env.example` existed.
- Created `.env` with the current Cloudflare tunnel URL matching the backend's `PUBLIC_BASE_URL`.

---

## 24. Alarm Level Escalation Notifications — Backend

**Files changed:**
- `backend/routes/firetruckTrackingRoutes.js`

**What was done:**
- `PUT /api/firetrucks/status` now **detects alarm level changes** by comparing the previous `current_alarm_level` in the `_alarms` table before updating.
- When the alarm level changes (e.g., "1st Alarm" → "2nd Alarm" → "General Alarm"), the backend emits a dedicated **`alarm-level-update`** Socket.IO event to:
  - All connected clients (`io.emit`)
  - The specific `alarm-{alarmId}` room
- The event payload includes: `alarmId`, `truckId`, `previousAlarmLevel`, `newAlarmLevel`, `fireStatus`, `driverName`, `updatedAt`.

---

## 25. Alarm Level Escalation Notifications — Admin Dashboards

**Files changed:**
- `BFP_Stations-main/BFP_ADMIN/src/App.jsx`
- `BFP_Stations-main/Substation_admin/src/App.jsx`

**What was done:**
- **Fixed dedup key** from `truckId-status` to `truckId-status-alarmLevel` so alarm escalations always create a new notification (e.g., Truck #1 changing from 1st Alarm to 2nd Alarm triggers a new notification).
- Added **`alarm-level-update`** socket listener in both admin apps:
  - Bell notification: "ALARM ESCALATED — Incident #42"
  - Sticky toast: "🚨 ALARM ESCALATED: 1st Alarm → 2nd Alarm | Truck #1 (Driver Name)"
  - "View Incident" action button on the toast navigates to `/incident-report`.
- Notification `type` changed from generic `'incident'` to `'truck-status'` and `'alarm-escalation'` for better categorization.

---

## Updated File Change Index (Full)

| # | Date | File | What Changed |
|---|------|------|-------------|
| 1 | Mar 2026 | `backend/server.js` | trust proxy, CORS, rate limiter, socket location save |
| 2 | Mar 2026 | `backend/.env` | PUBLIC_BASE_URL tunnel URL |
| 3 | Mar 2026 | `backend/routes/authRoutes.js` | login fix, signup, OTP send/verify, duplicate handling |
| 4 | Mar 2026 | `backend/routes/twilioTokenRoutes.js` | CIV_ auth bypass, ringTone |
| 5 | Mar 2026 | `backend/routes/incidentRoutes.js` | Removed premature failover-redirect |
| 6 | Mar 2026 | `backend/services/dispatchService.js` | KNN debug logging, failover fixes |
| 7 | Mar 10 | `backend/routes/firetruckTrackingRoutes.js` | Correct DB table, alarm level detection |
| 8 | Mar 2026 | `BFP_Stations-main/BFP_ADMIN/.env` | VITE_STATION_ID=1 |
| 9 | Mar 11 | `BFP_Stations-main/BFP_ADMIN/src/App.jsx` | pendingTwilioAccept, alarm-level-update listener, dedup fix |
| 10 | Mar 2026 | `BFP_Stations-main/BFP_ADMIN/src/context/AuthContext.jsx` | Reactive token state |
| 11 | Mar 10 | `BFP_Stations-main/BFP_ADMIN/src/components/MapContainer.jsx` | SVG caller + firetruck icons |
| 12 | Mar 10 | `BFP_Stations-main/BFP_ADMIN/src/style/mapcontainer.css` | Icon CSS, pulse animation |
| 13 | Mar 2026 | `BFP_Stations-main/Substation_admin/.env` | VITE_STATION_ID=3 |
| 14 | Mar 11 | `BFP_Stations-main/Substation_admin/src/App.jsx` | pendingTwilioAccept, alarm-level-update listener, dedup fix |
| 15 | Mar 2026 | `BFP_Stations-main/Substation_admin/src/context/AuthContext.jsx` | Reactive token state |
| 16 | Mar 10 | `BFP_Stations-main/Substation_admin/src/components/MapContainer.jsx` | SVG caller + firetruck icons |
| 17 | Mar 10 | `BFP_Stations-main/Substation_admin/src/style/mapcontainer.css` | Icon CSS, pulse animation |
| 18 | Mar 2026 | `End-User-Mobile-Proteksyon-main/src/config.ts` | Cloudflare tunnel URL |
| 19 | Mar 2026 | `End-User-Mobile-Proteksyon-main/src/screens/Auth/RegisterScreen.tsx` | Full rewrite: backend signup + phone/email toggle |
| 20 | Mar 2026 | `End-User-Mobile-Proteksyon-main/src/screens/Auth/VerifyOtpScreen.tsx` | Calls /api/verify-otp |
| 21 | Mar 2026 | `End-User-Mobile-Proteksyon-main/src/hooks/useTwilioVoice.ts` | CIV_ auth skip |
| 22 | Mar 11 | `End-User-Mobile-Proteksyon-main/.env` | Created — EXPO_PUBLIC_BASE_URL |
| 23 | Mar 10 | `mobile-firetruck-expo/.env` | Created — Supabase env vars |
| 24 | Mar 2026 | `mobile-firetruck-expo/src/config.ts` | Cloudflare tunnel URL |
