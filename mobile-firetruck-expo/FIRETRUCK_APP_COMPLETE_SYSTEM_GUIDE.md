# Firetruck App Complete System Guide

This document is a full technical guide for the firetruck mobile app.

Project path:
- mobile-firetruck-expo

Audience:
- Developers
- Integrators
- QA testers
- Operations and deployment owners

Scope:
- App architecture and modules
- Backend and platform dependencies
- Data flows (REST, Socket.IO, FCM, Twilio)
- Mission and status lifecycle
- Build/deploy requirements
- Failure modes and troubleshooting

## 1) What This App Does

The firetruck app is the driver-facing mobile client in the BFP system. It allows a driver to:
- Log in using a driver account
- Receive dispatch incidents in real time
- Claim an assigned mission
- Send live location updates
- Update mission status and alarm level
- View mission map with ETA and distance
- Place and receive station calls through Twilio Voice
- Receive incoming call push notifications via FCM

## 2) High-Level Architecture

Core stack:
- React Native + Expo (dev client workflow)
- React Context for app state (auth + mission)
- Socket.IO client for realtime dispatch/status events
- REST APIs for persistence and secure actions
- Expo Location for GPS tracking
- WebView + Leaflet + MapTiler for map display
- Twilio Voice SDK for calls
- Firebase Cloud Messaging for incoming-call notifications

App entry and navigation:
- App.tsx
- AuthProvider gates access to tabs
- MissionProvider wraps main tabs and drives mission state
- Tabs: Home, Tracking, Map, Profile

## 3) Folder and Module Breakdown

Top-level files:
- App.tsx: main navigation and dispatch overlay modal
- app.json: Expo config, plugins, Android package/permissions
- eas.json: EAS build profiles and env vars
- package.json: JS dependencies and scripts
- plugins/withTwilioVoice.js: custom config plugin for Twilio Android integration

Source modules:
- src/config.ts: validates EXPO_PUBLIC_BASE_URL and exports API_URL
- src/context/AuthContext.tsx: authentication/session storage and lifecycle
- src/context/MissionContext.tsx: realtime dispatch, mission, status state and socket logic
- src/hooks/useTwilioVoice.ts: Twilio token fetch, registration, calling, mute/speaker controls
- src/hooks/useFcmIncomingCall.ts: FCM token registration and incoming-call push listeners
- src/screens/LoginScreen.tsx: driver login UI
- src/screens/HomeScreen.tsx: mission control/status and mission claim actions
- src/screens/TrackingScreen.tsx: live location streaming + call station controls
- src/screens/MapScreen.tsx: mission map, routing line, ETA, status chips
- src/screens/ProfileScreen.tsx: user/station profile and direct station phone call
- src/utils/supabaseClient.ts: Supabase client setup (if used by additional modules)

## 4) Authentication and Session Flow

Primary logic:
- src/context/AuthContext.tsx

Flow:
1. Driver submits idNumber + password
2. App calls POST /api/login
3. Backend returns JWT token + user payload
4. App validates token shape (JWT regex)
5. App saves token/user in AsyncStorage
6. App immediately calls GET /api/me to refresh canonical user/station info
7. On app startup, stored session is restored and refreshed through /api/me

Security controls in app:
- Only role=driver is accepted for this app
- Malformed token is rejected and cache is cleared
- Auth headers use Bearer token

Storage keys:
- firetruck_token
- firetruck_user

Logout behavior:
- Calls POST /api/logout if token exists
- Clears local auth cache

## 5) Mission, Dispatch, and Status State

Primary logic:
- src/context/MissionContext.tsx

State tracked:
- fireStatus (Standby, En Route, On Scene, Fire Out)
- alarmLevel (1st Alarm, 2nd Alarm, ... General Alarm)
- activeAlarmId
- incidentTarget coordinates + label
- pendingIncident and modal visibility
- truckId assigned to logged-in driver
- socket connection state

How dispatch arrives:
- Socket event incoming-incident
- App vibrates, schedules local notification, and opens dispatch modal
- Driver can Accept Mission (claimMission) or Later (dismiss modal only)

Claim mission flow:
1. Driver taps Accept Mission
2. App calls POST /api/incidents/:alarmId/driver-accept with truckId
3. On success app sets active mission fields and closes dispatch modal
4. On conflict app shows claim failed (e.g., another driver claimed first)

Status updates:
- Optimistic local state update in app
- broadcastStatus emits truck-status-update over socket
- broadcastStatus also PUTs /api/firetrucks/status for persistence

End mission:
- Resets mission state to standby
- Broadcasts standby + default alarm level

## 6) Realtime Socket.IO Contract

Socket connection:
- io(API_URL, { transports: ["websocket", "polling"] })

Join events emitted by driver app:
- join-truck: { truckId }
- join-driver-station: { token, stationId }

Events listened by driver app:
- incoming-incident
- incident-status-updated
- driver-mission-claimed
- connect/disconnect

Events emitted by driver app:
- truck-status-update

Operational behavior:
- On connect/reconnect, app re-joins truck/station channels
- Dispatch overlay is tied to pending incident state
- If another driver claims same mission, local pending mission is cleared

## 7) Live Location Tracking Flow

Primary logic:
- src/screens/TrackingScreen.tsx
- src/screens/MapScreen.tsx

TrackingScreen behavior:
- Requests foreground location permission
- Gets initial high-accuracy fix
- Starts watchPositionAsync at 5s interval
- Sends each coordinate to POST /api/firetrucks/track
- Also triggers broadcastStatus with current coordinates

Location payload sent:
- truck_id
- latitude
- longitude
- speed
- heading
- accuracy
- alarm_level
- fire_status

MapScreen behavior:
- Maintains independent watch for local map freshness (balanced accuracy)
- Computes distance with Haversine formula
- Estimates ETA from speed (fallback speed when unknown)
- Renders truck and incident markers with route polyline

## 8) Voice Calling (Twilio) Flow

Primary logic:
- src/hooks/useTwilioVoice.ts
- src/screens/TrackingScreen.tsx

Identity model:
- Driver identity: TRUCK_<userId>
- Parent station target:
  - Station 1 -> ADM_MAIN
  - Other station -> ADM_SUB_<stationId>

Voice lifecycle:
1. Hook fetches Twilio access token from POST /api/twilio/token
2. Hook registers Voice SDK with token
3. Outgoing call uses voice.connect(token, { params: { To } })
4. Call event handlers manage status (Connected, Disconnected, ConnectFailure)
5. UI supports mute and speaker toggle

Incoming calls:
- Twilio invite listener in SDK when app is active/registered
- FCM incoming call push wakes app path and prompts SDK readiness retry

Common hard dependency:
- Valid google-services.json and Firebase init are required for reliable Twilio mobile behavior

## 9) Push Notification (FCM) Flow

Primary logic:
- src/hooks/useFcmIncomingCall.ts

Flow:
1. Requests notification permission
2. Reads FCM token from Firebase Messaging
3. Registers token using POST /api/fcm/register with twilioIdentity
4. Handles token refresh and re-registers automatically
5. Listens foreground and opened-app incoming_call payloads
6. Registers background handler for data messages

Expected incoming call push data fields:
- type: incoming_call
- callSid
- callerIdentity
- callerName

## 10) Map Stack and Configuration

Primary logic:
- src/screens/MapScreen.tsx

Map implementation details:
- Uses react-native-webview
- Injected HTML renders Leaflet map
- Tiles served by MapTiler (openstreetmap style)
- Marker icons use HTML entities for truck and incident

Map key sources:
- EXPO_PUBLIC_MAPTILER_API_KEY env var
- Fallback key in code if env is missing

Mission map data source:
- Uses mission context active incident + local GPS watch
- Does not fetch remote incident map tiles from backend

## 11) Backend API Dependencies (Required by Firetruck App)

Mounted under /api in backend/server.js.

Auth and session:
- POST /api/login
- GET /api/me
- POST /api/logout

Mission and dispatch:
- POST /api/incidents/:alarmId/driver-accept

Firetruck tracking/status:
- POST /api/firetrucks/track
- PUT /api/firetrucks/status
- GET /api/firetrucks/my-truck
- Optional additional endpoint used by backend ecosystem: GET /api/firetrucks/current-alarm

Voice and push:
- POST /api/twilio/token
- POST /api/fcm/register

## 12) Database Dependencies (Supabase)

Tables touched directly or indirectly in key routes:
- users
- firetrucks
- alarms
- firetruck_location_history
- firetruck_status
- alarm_response_log
- officer_dispatch_status (indirect in Twilio officer identity preference logic)
- fcm token storage table used by fcm service implementation

Dependency expectations:
- driver user has assigned_station_id
- active firetruck row exists for driver_id
- station and alarm assignments are consistent

## 13) Build and Runtime Dependencies

From package and app config:
- Expo SDK 54
- React Native 0.81.x
- @react-native-firebase/app and @react-native-firebase/messaging
- @twilio/voice-react-native-sdk
- socket.io-client
- expo-location
- react-native-webview
- expo-notifications
- expo-dev-client

Android config requirements:
- app.json android.package = com.bfp.mobilefiretruckexpo
- google-services.json present at project root
- Twilio plugin active: ./plugins/withTwilioVoice
- Required permissions include INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, BLUETOOTH, BLUETOOTH_CONNECT

EAS profiles:
- development (internal dev client)
- preview (internal APK)
- production (AAB with autoIncrement)

Critical env vars in eas.json:
- EXPO_PUBLIC_BASE_URL
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_MAPTILER_API_KEY

## 14) End-to-End Operational Flow (Driver)

1. Driver logs in
2. App restores/fetches profile and station mapping
3. App fetches assigned truck id
4. App connects socket and joins station/truck channels
5. App registers FCM token for incoming call notifications
6. Dispatcher sends incident to driver station
7. Driver receives incoming-incident alert modal
8. Driver claims mission using driver-accept endpoint
9. Driver starts location tracking
10. App streams location + status updates (REST + Socket)
11. Map shows route, ETA, and current mission state
12. Driver updates status (En Route, On Scene, Fire Out)
13. Backend syncs incident status and broadcasts updates
14. Driver ends mission and returns to standby

## 15) Failure Points and Troubleshooting

Auth/login issues:
- Symptom: login fails for valid credentials
- Check: role must be driver for this app
- Check: API base URL correctness and backend availability

No truck assigned:
- Symptom: claim mission fails with no firetruck assigned
- Check: /api/firetrucks/my-truck response
- Fix: assign active firetruck to driver_id in database/admin panel

No dispatch received:
- Symptom: driver online but no incident alert
- Check: socket connected state and join-driver-station emission
- Check: assignedStationId consistency from /api/me

Tracking not uploading:
- Symptom: map/admin cannot see movement
- Check: foreground location permission granted
- Check: /api/firetrucks/track status in network logs
- Check: token validity and station authorization checks

Twilio offline or call failures:
- Symptom: call button cannot connect
- Check: /api/twilio/token endpoint and Twilio env on backend
- Check: Firebase configuration and rebuilt dev client
- Check: target identity mapping ADM_MAIN or ADM_SUB_<id>

FCM registration failures:
- Symptom: no incoming call wake/push
- Check: /api/fcm/register response and auth token
- Check: Firebase messaging permission and token refresh

Map issues:
- Symptom: blank map or no tiles
- Check: EXPO_PUBLIC_MAPTILER_API_KEY
- Check: network access from device

## 16) Ops Checklist Before Demo or Deployment

Backend:
- Backend /api is up and reachable from device
- Supabase credentials and tables are healthy
- Twilio credentials configured
- Firebase admin credentials configured for push sending

Firetruck app:
- Correct build profile selected in EAS
- google-services.json matches package name
- Driver test account has assigned station and truck
- Location and notification permissions granted on device

Cross-system:
- Dispatcher web app online and connected to same backend
- Station routing and assignment data is not stale
- Socket and REST traffic both functional

## 17) Important Code References

App and navigation:
- mobile-firetruck-expo/App.tsx

Core config:
- mobile-firetruck-expo/src/config.ts

Contexts:
- mobile-firetruck-expo/src/context/AuthContext.tsx
- mobile-firetruck-expo/src/context/MissionContext.tsx

Hooks:
- mobile-firetruck-expo/src/hooks/useTwilioVoice.ts
- mobile-firetruck-expo/src/hooks/useFcmIncomingCall.ts

Screens:
- mobile-firetruck-expo/src/screens/HomeScreen.tsx
- mobile-firetruck-expo/src/screens/TrackingScreen.tsx
- mobile-firetruck-expo/src/screens/MapScreen.tsx
- mobile-firetruck-expo/src/screens/ProfileScreen.tsx

Backend routes:
- backend/routes/authRoutes.js
- backend/routes/incidentRoutes.js
- backend/routes/firetruckTrackingRoutes.js
- backend/routes/twilioTokenRoutes.js
- backend/routes/fcmRoutes.js
- backend/server.js

## 18) Notes on Legacy Compatibility

Backend contains compatibility routes for older clients, but the current firetruck app flow should use the Node/Express routes listed in this guide.

---

If you want, a second companion document can be generated that is QA-focused only (test cases, expected payloads, and pass/fail criteria per feature).
