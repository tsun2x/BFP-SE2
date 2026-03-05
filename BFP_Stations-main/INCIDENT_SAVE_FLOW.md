# Incident Save Flow - Database Check

## Summary
**YES - Incidents ARE saved to the database** when submitted through the form AND when received from other stations via Socket.IO.

---

## Flow Breakdown

### Phase 1: Receiving a Phone Call (Socket Event) ✅ NOW SAVED
**What happens:**
1. Station A creates an incident and submits form → saves to DB
2. Backend emits `new-incident` socket event to all connected clients
3. Station B (and others) receive the `new-incident` event
4. Frontend emits the data back to backend socket listener: `socket.emit('new-incident', data)`
5. Backend socket listener receives it and **saves to database immediately**

**Database Tables Updated on Reception:**
- **`users`** table: creates caller if not exists
- **`alarms`** table: inserts incident record
- **`alarm_response_log`** table: logs action as 'Received from Station'

**Status:** ✅ **SAVED TO DATABASE**

### Phase 2: Submitting the Form ✅ SAVED TO DATABASE
**What happens:**
1. Admin fills/verifies form with caller information
2. Admin clicks "Submit" button
3. Form validation occurs (phone number + location required)
4. API call to `POST /api/create-incident` with form data
5. Backend endpoint **saves to database**

**Database Tables Updated:**
- **`users`** table:
  - If caller (phone number) not found → **creates new end_user**
  - If caller exists → uses existing user_id
  
- **`alarms`** table:
  - Inserts new alarm/incident record with:
    - `end_user_id` (caller's user_id)
    - `user_latitude`, `user_longitude`
    - `initial_alarm_level`
    - `current_alarm_level`
    - `status: 'Pending Dispatch'`
  
- **`alarm_response_log`** table:
  - Logs the incident creation with:
    - `alarm_id`
    - `action_type: 'Initial Dispatch'`
    - Details about incident, location, narrative
    - `performed_by_user_id` (admin who submitted)

**Status:** ✅ **SAVED TO DATABASE**

---

## Code Evidence

### Backend: server.js - Socket Listener (NEW)
```javascript
io.on('connection', (socket) => {
  socket.on('new-incident', async (data) => {
    // Check/create caller in users table
    // Create alarm record in alarms table
    // Log action in alarm_response_log table
    console.log('Incident saved to database - alarmId:', alarmId);
  });
});
```

### Frontend: App.jsx - Socket Emit (NEW)
```javascript
socket.on('new-incident', (data) => {
  // Emit back to server to save to database
  socket.emit('new-incident', data);
  
  // Add to CallContext for UI
  addIncomingCall(callObj);
  navigate('/incident-report');
});
```

### Backend: `/create-incident` Route
```javascript
router.post('/create-incident', authenticateToken, async (req, res) => {
  // 1. Check if caller exists in users table
  // 2. If not found, INSERT new user
  // 3. INSERT alarm record
  // 4. INSERT log record
  // 5. Broadcast to other stations via Socket.IO
  // 6. (Other stations receive via socket.on('new-incident'))
  // 7. (Other stations emit back: socket.emit('new-incident', data))
  // 8. (Server socket listener saves to DB)
});
```

---

## Complete Flow Diagram

```
STATION A CREATES INCIDENT
    ↓
Form Submitted → POST /api/create-incident
    ↓
Backend:
  ├─ Save to alarms table
  ├─ Save to alarm_response_log table
  └─ Emit: io.emit('new-incident', {...})
    ↓
STATION B RECEIVES VIA SOCKET
    ↓
socket.on('new-incident', data)
    ↓
Frontend:
  ├─ Emit back: socket.emit('new-incident', data)
  ├─ Add to CallContext
  └─ Navigate to incident-report
    ↓
Backend Socket Listener Receives
    ↓
socket.on('new-incident', async (data))
    ↓
Backend:
  ├─ Check/Create user in users table
  ├─ INSERT INTO alarms
  ├─ INSERT INTO alarm_response_log (action: 'Received from Station')
  └─ Log: alarmId saved
    ↓
✅ BOTH DATABASES NOW HAVE THE SAME INCIDENT
    ↓
(Incident visible in reports for both Station A and Station B)
```

---

## Key Points

| Aspect | Status | Details |
|--------|--------|---------|
| Station A submits form | ✅ **Saved** | Saved immediately in Station A's DB |
| Station B receives event | ✅ **Saved** | Socket listener saves to Station B's DB |
| Incident visible in Station A reports | ✅ Yes | Query alarms table (initial_alarm_level) |
| Incident visible in Station B reports | ✅ Yes | Query alarms table (received from socket) |
| Incident broadcast via Socket.IO | ✅ Yes | All connected clients receive |
| Caller auto-created if new | ✅ Yes | Both on submit and on reception |
| Audit trail on receiving | ✅ Yes | alarm_response_log shows 'Received from Station' |
| In DEV mode without auth token | ⚠️ Simulated | Simulates success but does NOT save to DB |

---

## Database Changes After Complete Flow

### Station A (Originating):
- `users` table: caller record (if new)
- `alarms` table: incident with action_type 'Initial Dispatch'
- `alarm_response_log` table: logged by admin who submitted

### Station B (Receiving):
- `users` table: caller record (if not already exists)
- `alarms` table: same incident with action_type 'Received from Station'
- `alarm_response_log` table: logged as system (performed_by_user_id: 1)

---

## Implementation Details

### What Changed:

1. **Backend (server.js):**
   - Added socket listener for `new-incident` events
   - When receiving an incident via socket, saves it to database
   - Uses same logic as `/create-incident` endpoint
   - Logs action as 'Received from Station' (vs 'Initial Dispatch')

2. **Frontend (App.jsx - BFP_ADMIN and Substation_admin):**
   - When receiving `new-incident` event from socket
   - Immediately emit it back to server: `socket.emit('new-incident', data)`
   - This triggers the backend socket listener to save to DB
   - Then proceed with UI updates (add to CallContext, navigate)

### Why This Works:

- **Socket events are bidirectional:** Frontend receives from server, but can also send to server
- **No authentication needed for socket save:** Socket listener uses system user (id: 1)
- **Automatic replication:** Any incident created on any station is automatically saved to all other stations' databases
- **Maintains consistency:** Same incident data across all stations with proper audit trail



