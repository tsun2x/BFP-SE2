# Incident Report Database Submission Guide

## Overview
The incident report form now fully integrates with the MySQL database. When an admin receives a phone call and fills out the incident report, the data is saved to the database with complete caller information, location coordinates, and alarm level.

## Data Flow

### 1. **Phone Call Received**
```
Phone Call → App receives data
  ↓
Form Auto-fills (name, phone, location)
  ↓
Admin reviews/edits form
  ↓
Admin clicks "Submit Report"
```

### 2. **Incident Submitted to Database**
The form data is sent to the backend:
```
POST /api/create-incident
{
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "09171234567",
  location: "123 Main St, Barangay 1",
  incidentType: "Fire",
  alarmLevel: "1st Alarm",
  narrative: "Building is on fire...",
  latitude: 14.5995,
  longitude: 120.9842
}
```

### 3. **Backend Processing**
1. **Caller Check**: Verifies if caller already exists in database
   - If not: Creates new `end_user` in `users` table
   - If yes: Uses existing caller ID

2. **Alarm Creation**: Inserts incident into `alarms` table
   ```sql
   INSERT INTO alarms (
     end_user_id,
     user_latitude,
     user_longitude,
     initial_alarm_level,
     current_alarm_level,
     status
   ) VALUES (...)
   ```

3. **Log Creation**: Records action in `alarm_response_log` table
   - Tracks "Initial Dispatch"
   - Stores incident type, location, narrative
   - Records which admin created the incident

### 4. **Response to Frontend**
```json
{
  "message": "Incident created successfully",
  "alarmId": 2,
  "callerId": 202,
  "status": "Pending Dispatch",
  "coordinates": {
    "latitude": 14.5995,
    "longitude": 120.9842
  }
}
```

## Database Tables Involved

### **users table**
- Stores caller information
- Auto-creates `end_user` role for new callers
- Fields: `user_id`, `full_name`, `phone_number`, `role`

### **alarms table**
- Main incident record
- Fields:
  - `alarm_id`: Unique incident ID
  - `end_user_id`: Who called (FK to users)
  - `user_latitude`, `user_longitude`: Incident location
  - `initial_alarm_level`: What was set at creation
  - `current_alarm_level`: Can be escalated
  - `status`: Pending Dispatch → Dispatched → En Route → On Scene → Resolved
  - `call_time`: When incident was created
  - `dispatch_time`: When units were dispatched (set later)
  - `resolve_time`: When incident was resolved

### **alarm_response_log table**
- Timeline of all actions on an incident
- Fields:
  - `alarm_id`: Which incident
  - `action_type`: Initial Dispatch, Alarm Level Change, Backup Requested, Truck Arrival, Incident Resolved
  - `details`: Description (incident type, location, narrative)
  - `performed_by_user_id`: Which admin made the action
  - `action_timestamp`: When the action occurred

## API Endpoints

### **Create Incident**
```
POST /api/create-incident
Header: Authorization: Bearer {token}

Request Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "09171234567",
  "location": "123 Main St",
  "incidentType": "Fire",
  "alarmLevel": "1st Alarm",
  "narrative": "Describe situation...",
  "latitude": 14.5995,
  "longitude": 120.9842
}

Response:
{
  "message": "Incident created successfully",
  "alarmId": 2,
  "callerId": 202,
  "status": "Pending Dispatch"
}
```

### **Get All Incidents**
```
GET /api/incidents
Header: Authorization: Bearer {token}

Response:
{
  "incidents": [
    {
      "alarm_id": 2,
      "full_name": "John Doe",
      "phone_number": "09171234567",
      "user_latitude": 14.5995,
      "user_longitude": 120.9842,
      "current_alarm_level": "1st Alarm",
      "status": "Pending Dispatch",
      "call_time": "2025-11-29T12:03:29.000Z",
      "station_name": null,
      "plate_number": null
    }
  ],
  "total": 1
}
```

### **Get Incident Details**
```
GET /api/incidents/:alarmId
Header: Authorization: Bearer {token}

Response:
{
  "incident": { ... },
  "timeline": [
    {
      "log_id": 1,
      "action_timestamp": "2025-11-29T12:03:29.000Z",
      "action_type": "Initial Dispatch",
      "details": "Incident: Fire | Location: 123 Main St | Narrative: Building is on fire",
      "performed_by_user_id": 1
    }
  ]
}
```

### **Update Alarm Level**
```
PATCH /api/incidents/:alarmId/update-alarm-level
Header: Authorization: Bearer {token}

Request Body:
{
  "newAlarmLevel": "2nd Alarm"
}

Response:
{
  "message": "Alarm level updated",
  "alarmId": 2,
  "newAlarmLevel": "2nd Alarm"
}
```

## Frontend Implementation

### **Form Submission Flow**
1. Admin fills form (or auto-filled from call)
2. Clicks "Submit Report" button
3. Confirmation modal appears
4. On confirm, `submitIncidentReport()` is called
5. Data sent to `/api/create-incident`
6. Success toast shown with Alarm ID
7. Form resets

### **Example from IncidentReport.jsx**
```javascript
const submitIncidentReport = async () => {
  const response = await apiClient.post('/create-incident', {
    firstName: formData.firstName,
    lastName: formData.lastName,
    phoneNumber: formData.phoneNumber,
    location: formData.location,
    incidentType: formData.incidentType,
    alarmLevel: formData.alarmLevel,
    narrative: formData.narrative,
    latitude: selectedLocation.lat,
    longitude: selectedLocation.lng
  });
  
  // Show success: Alarm ID 2 created
};
```

## Example Scenario

### **Step 1: Phone Call Received**
```
Admin receives: Call from 09171234567 (John Doe)
System auto-fills form with:
- First Name: John
- Last Name: Doe
- Phone: 09171234567
- Location: 123 Main St, Barangay 1 (if available)
- Map shows coordinates: 14.5995, 120.9842
```

### **Step 2: Admin Reviews & Submits**
```
Form shows:
- Type of Incident: Fire (admin selects)
- Alarm Level: 1st Alarm (admin selects)
- Narrative: "Building structure damage, fire on 2nd floor" (admin types)
- Location: Verified on map, coordinates confirmed
```

### **Step 3: Submitted to Database**
```
Database records:
- New user "John Doe" (if not existing)
- New alarm with status "Pending Dispatch"
- Alarm level set to "1st Alarm"
- Coordinates: 14.5995, 120.9842
- Full incident narrative saved
- Log entry: Initial Dispatch by Admin (user_id=1)
```

### **Step 4: Dispatch System Uses Data**
```
Dispatch Module:
- Uses KNN algorithm to find nearest station
- Assigns appropriate fire truck
- Updates alarm status to "Dispatched"
- Creates log entry: "Dispatched to Station 101"
- Sends push notification to responding units
```

## Error Handling

### **Missing Required Fields**
```json
{
  "message": "Phone number, coordinates, and alarm level are required",
  "status": 400
}
```

### **Unauthorized (No Token)**
```json
{
  "message": "Unauthorized",
  "status": 401
}
```

### **Database Error**
```json
{
  "message": "Failed to create incident",
  "error": "Database connection failed",
  "status": 500
}
```

## Security Features

1. **JWT Authentication**: All incident endpoints require valid auth token
2. **User Context**: System tracks which admin created each incident
3. **Audit Trail**: Every action logged in `alarm_response_log`
4. **Phone Number Validation**: Ensures valid format
5. **Coordinate Validation**: Ensures latitude/longitude are valid ranges

## Next Steps

### **Short Term**
- [ ] Test incident submission with real data
- [ ] Verify database records are being saved
- [ ] Check alarm response logs are created

### **Medium Term**
- [ ] Implement KNN dispatch algorithm
- [ ] Create incident dashboard showing all active alarms
- [ ] Add real-time status updates via WebSocket

### **Long Term**
- [ ] Add backup station escalation (Alarm 1→5)
- [ ] Implement real-time responder tracking
- [ ] Create incident analytics and hotspot heatmap

## Testing the Workflow

### **Test Case 1: Basic Submission**
1. Navigate to Incident Report page
2. Fill all fields manually
3. Click "Submit Report"
4. Verify success toast shows Alarm ID
5. Check database: `SELECT * FROM alarms WHERE alarm_id = <returned_id>`

### **Test Case 2: Auto-Fill from Call**
1. Click "Trigger Incoming Call" button
2. System auto-navigates to Incident Report
3. Form auto-populated with caller data
4. Adjust fields as needed
5. Submit and verify database

### **Test Case 3: Verify Full Data Chain**
```sql
-- Check users table
SELECT * FROM users WHERE phone_number = '09171234567';

-- Check alarms table
SELECT * FROM alarms WHERE end_user_id = <user_id>;

-- Check alarm_response_log
SELECT * FROM alarm_response_log WHERE alarm_id = <alarm_id>;
```

## Troubleshooting

### **"Failed to create incident" error**
- Check backend is running: `npm start` in backend folder
- Verify token is valid (check AuthContext)
- Check database connection: `curl http://localhost:5000/api/health`

### **Form not submitting**
- Verify all required fields are filled
- Check browser console for errors
- Verify selectedLocation is set (click map to select location)

### **Data not appearing in database**
- Check MySQL connection string in `backend/config/database.js`
- Verify credentials: username, password, database name
- Check if `bfp_emergency_system` database exists

### **Authentication fails on submit**
- Re-login to get new token
- Check token expiry (24h)
- Verify JWT_SECRET is set in `.env`
