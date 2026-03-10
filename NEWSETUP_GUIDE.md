# NEWSETUP_GUIDE (simple and complete)

## What we changed
1) **End-User (Civilian) app – MapScreen**
   - Switched to WebView + Leaflet (no Google Maps key needed), uses MapTiler tiles.
   - Shows live firetrucks and fire stations from the backend; refreshes every 5 seconds; legend shows counts.

2) **End-User (Civilian) app – FireTruckTrackingScreen**
   - Uses real data from `/api/firetruck-locations`.
   - Pull-to-refresh + auto-refresh every 5 seconds; status colors; last-online time.

3) **End-User (Civilian) app – Config/Deps**
   - Added `react-native-webview` for the map.
   - Added `expo-build-properties` plugin with JitPack repo and longer Gradle HTTP timeouts (120s) in `app.json`.
   - Needs `expo-font` (peer dependency for @expo/vector-icons).

4) **Backend**
   - `PUBLIC_BASE_URL` now `https://eugene-computing-rough-quizzes.trycloudflare.com` (Twilio voice URL correct after restart).

5) **Admin dashboards (Main + Substation)**
   - Twilio token URL fixed (no double `/api`).

## Prepare the End-User app (before build)
1) Terminal in `End-User-Mobile-Proteksyon-main`.
2) Install deps:
   ```bash
   npx expo install react-native-webview expo-build-properties expo-font
   ```
3) (Optional) Use a **square** icon for `icon` and `adaptiveIcon.foregroundImage`.
4) Commit changes (example):
   ```bash
   git add app.json package.json package-lock.json
   git commit -m "Add WebView map, JitPack timeouts, and deps"
   ```

## Build a new Android dev client (EAS cloud)
1) Make sure you’re logged in to Expo (`eas login`). (log in creds: tsun2x / rpg123abc)
2) From `End-User-Mobile-Proteksyon-main`, run:
   ```bash
   eas build -p android --profile development
   ```
3) When done, download the APK from the EAS dashboard and install on your phone.
4) Start the tunnel and scan the QR with the **new dev client**:
   ```bash
   npx expo start --tunnel
   ```
   The map works because `react-native-webview` is bundled in this build.

## If EAS build times out (JitPack)
- It’s just a network fetch timing out at `https://www.jitpack.io`. Retry the build.
- If it keeps happening, we can bump the Gradle HTTP timeouts higher than 120s and retry.

## Quick status checklist
- MapScreen: WebView + Leaflet, live trucks/stations. 
- FireTruckTrackingScreen: real trucks list. 
- Backend `PUBLIC_BASE_URL` updated to current tunnel. 
- Twilio token URL fixed in both admin dashboards. 
- Pending: successful EAS Android build (JitPack timeouts). 

## What to tell 
- We changed the map to a simple web map that doesn’t need a special key.
- The truck list now shows real trucks from the server.
- We told the build to wait longer when downloading so it doesn’t quit too soon.
- We need to install the app again after the new build so the map works.
