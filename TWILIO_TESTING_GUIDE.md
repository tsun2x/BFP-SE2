# Twilio VoIP Integration — Step-by-Step Testing Guide

## Prerequisites
- Node.js installed
- ngrok installed (`npm install -g ngrok` or download from https://ngrok.com)
- A Twilio account (free trial works) at https://console.twilio.com
- Your backend `.env` already has `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_CALLER_ID`

---

## STEP 1: Create Twilio API Key

You need an API Key + Secret to generate Twilio Access Tokens for the Voice SDK.

1. Go to **Twilio Console** → https://console.twilio.com/us1/account/keys-credentials/api-keys
2. Click **"Create API Key"**
3. Set:
   - **Friendly Name**: `BFP-VoIP-Key`
   - **Key Type**: `Standard`
4. Click **Create**
5. **IMPORTANT**: Copy the **SID** (starts with `SK...`) and the **Secret** immediately — the secret is only shown once!
6. Update your `backend/.env`:
   ```
   TWILIO_API_KEY=SK...your_key_sid...
   TWILIO_API_SECRET=...your_secret...
   ```

---

## STEP 2: Start ngrok Tunnel

The Twilio TwiML App needs a public URL to reach your local backend.

1. Open a terminal and run:
   ```
   ngrok http 5000
   ```
2. Copy the **Forwarding** HTTPS URL (e.g. `https://xxxx-xxxx.ngrok-free.app`)
3. Update your `backend/.env`:
   ```
   PUBLIC_BASE_URL=https://xxxx-xxxx.ngrok-free.app
   ```
   *(You already have this set — update it if the ngrok URL changed)*

---

## STEP 3: Create TwiML App

The TwiML App tells Twilio where to send voice webhook requests when a Client SDK call is made.

1. Go to **Twilio Console** → https://console.twilio.com/us1/develop/voice/manage/twiml-apps
2. Click **"Create new TwiML App"** (or the **+** button)
3. Set:
   - **Friendly Name**: `BFP Emergency Dispatch`
   - **Voice Request URL**: `https://YOUR-NGROK-URL/api/twilio/voice`
     (use your ngrok URL from Step 2)
   - **Voice Request Method**: `POST`
4. Click **Create**
5. Copy the **TwiML App SID** (starts with `AP...`)
6. Update your `backend/.env`:
   ```
   TWILIO_TWIML_APP_SID=AP...your_twiml_app_sid...
   ```

---

## STEP 4: Verify Your .env

Your `backend/.env` should now have ALL of these filled in with real values:

```env
TWILIO_ACCOUNT_SID=<your Twilio Account SID>
TWILIO_AUTH_TOKEN=<your Twilio Auth Token>
TWILIO_CALLER_ID=<your Twilio phone number>
TWILIO_API_KEY=SK...real_value...
TWILIO_API_SECRET=...real_value...
TWILIO_TWIML_APP_SID=AP...real_value...
PUBLIC_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

**None of these should still say `SKXX...` or `APXX...` or `your_twilio_...`**

---

## STEP 5: Start the Backend

```bash
cd backend
node server.js
```

You should see output like:
```
Server running on port 5000
```

---

## STEP 6: Test the Token Endpoint

Open a new terminal and run:

```bash
curl -X POST http://localhost:5000/api/twilio/token -H "Content-Type: application/json" -d "{\"identity\": \"ADM_SUB_101\"}"
```

**Expected**: A JSON response with a `token` field:
```json
{
  "token": "eyJ0eX...",
  "identity": "ADM_SUB_101"
}
```

If you get an error about missing env vars, double-check Step 4.

---

## STEP 7: Test the Voice Webhook

```bash
curl -X POST http://localhost:5000/api/twilio/voice -H "Content-Type: application/x-www-form-urlencoded" -d "To=client:ADM_SUB_101&From=client:CIV_1234"
```

**Expected**: TwiML XML response containing `<Dial><Client>ADM_SUB_101</Client></Dial>`

Also test with a phone number:
```bash
curl -X POST http://localhost:5000/api/twilio/voice -H "Content-Type: application/x-www-form-urlencoded" -d "To=+17577096408&From=client:CIV_1234"
```

**Expected**: TwiML XML with `<Dial callerId="+17577096408"><Number>+17577096408</Number></Dial>`

---

## STEP 8: Test Admin Dashboard Twilio Device Registration

1. Start the Admin Dashboard:
   ```bash
   cd BFP_Stations-main/BFP_ADMIN
   npm run dev
   ```
2. Open browser, log in to the Admin Dashboard
3. Open **Developer Tools → Console** (F12)
4. Look for these log messages:
   ```
   [Twilio] Status: registering, Identity: ADM_MAIN, Error: none
   [Twilio] Status: ready, Identity: ADM_MAIN, Error: none
   ```
5. You should also see a **small green status indicator** at the bottom-right corner:
   ```
   🟢 Twilio: ready (ADM_MAIN)
   ```

**If you see `offline` or an error**: Check that:
- Your backend is running on port 5000
- `VITE_API_URL` in the Admin's `.env` points to `http://localhost:5000`
- The Twilio API Key/Secret/TwiML App SID are correct

---

## STEP 9: Test Substation Admin Device Registration

1. Start the Substation Admin:
   ```bash
   cd BFP_Stations-main/Substation_admin
   npm run dev
   ```
2. Log in with a substation admin account
3. Check console for:
   ```
   [Twilio] Status: ready, Identity: ADM_SUB_<station_id>
   ```
4. Verify the green status indicator appears

---

## STEP 10: Test End-to-End Incoming Call Flow

This tests the full flow: civilian creates alarm → backend dispatches → station gets VoIP call.

### 10a. Keep both running:
- Backend (`node server.js`)
- Admin or Substation Dashboard (whichever station will be dispatched to)
- ngrok tunnel

### 10b. Create a test alarm via curl:
```bash
curl -X POST http://localhost:5000/api/enduser/create-alarm ^
  -H "Content-Type: application/json" ^
  -d "{\"phoneNumber\": \"+17577096408\", \"latitude\": 6.9093, \"longitude\": 122.0872, \"incidentType\": \"Fire\", \"alarmLevel\": \"Alarm 1\", \"location\": \"Test Location\", \"narrative\": \"Test emergency\"}"
```

### 10c. Expected behavior:
1. Backend logs: finding nearest station, dispatching, starting failover timer
2. **If Twilio Client is registered** on the station: The browser should show an **"Incoming Voice Call"** modal with Accept/Reject buttons
3. Click **Accept** → Green "On Call" banner appears at top-right with Hang Up button
4. Click **Reject** → Modal dismisses, failover timer kicks in after 15s to next station
5. If no action for 15 seconds → automatic failover to next nearest station

---

## STEP 11: Test Accept/Reject API Endpoints

### Accept an incident:
```bash
curl -X POST http://localhost:5000/api/incidents/<ALARM_ID>/accept ^
  -H "Content-Type: application/json" ^
  -d "{\"stationId\": 101}"
```

**Expected**: `{ "message": "Incident accepted", "alarm": {...} }`
Calling accept again should fail with: `{ "error": "Incident already accepted..." }`

### Reject an incident:
```bash
curl -X POST http://localhost:5000/api/incidents/<ALARM_ID>/reject ^
  -H "Content-Type: application/json" ^
  -d "{\"stationId\": 101}"
```

**Expected**: Immediate failover to next station.

---

## STEP 12: Test Failover Timer

1. Create an alarm (Step 10b)
2. Do NOT accept or reject it
3. Watch the backend console — after **15 seconds** you should see:
   ```
   [Failover] Timer expired for alarm <id>, reassigning...
   [Failover] Reassigned alarm <id> to station <next_station_id>
   ```
4. The next nearest READY station should receive the call

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Token request failed: 500` | Check TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID in .env |
| Twilio status stays `offline` | Backend not running or VITE_API_URL not set |
| Twilio status shows `error` | Check browser console for detailed error |
| No incoming call modal | TwiML App voice URL not pointing to your ngrok URL |
| `Error: No ready stations found` | Check `station_readiness` table in Supabase — at least one station needs `readiness_status = 'Ready'` |
| ngrok URL changed | Update both `PUBLIC_BASE_URL` in .env AND the TwiML App Voice URL in Twilio Console |
| Failover not working | Check backend console logs for timer messages |

---

## Quick Reference: Identity Convention

| App | Twilio Client Identity |
|-----|----------------------|
| Main Admin Dashboard | `ADM_MAIN` |
| Substation Admin (station 101) | `ADM_SUB_101` |
| Substation Admin (station 103) | `ADM_SUB_103` |
| Civilian (phone +1234) | `CIV_1234` |

---

## Architecture Diagram

```
Civilian App                    Backend (Node.js)              Admin/Substation Browser
     │                               │                               │
     │ POST /create-alarm            │                               │
     ├──────────────────────────────►│                               │
     │                               │ KNN nearest station           │
     │                               │ Start 15s failover timer      │
     │                               │                               │
     │                               │ Twilio REST API: Call          │
     │                               │ from CALLER_ID                 │
     │                               │ to client:ADM_SUB_<id>        │
     │                               │──────────────────────────────►│
     │                               │                               │ Incoming Call Modal
     │                               │                               │ [Accept] [Reject]
     │                               │                               │
     │                               │ POST /incidents/:id/accept   │
     │                               │◄──────────────────────────────┤
     │                               │ Cancel failover timer         │
     │                               │ Atomic DB lock                │
     │                               │                               │
     │                         (If no accept in 15s)                 │
     │                               │ Failover → next station       │
     │                               │──────────────────────────────►│ (next station)
```
