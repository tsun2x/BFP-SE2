# Database & Testing Guide

## 📊 Database Setup Verification

### 1. Verify MySQL Database Exists

```bash
# Connect to MySQL
mysql -u root -p

# List databases
SHOW DATABASES;
```

### 2. Verify Tables and Schema

```sql
USE bfp_emergency_system;

-- Check users table
DESCRIBE users;

-- Check alarms table
DESCRIBE alarms;

-- Check alarm_response_log table
DESCRIBE alarm_response_log;
```

### 3. Expected Table Structure

#### Users Table
```sql
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  id_number VARCHAR(50) UNIQUE NOT NULL,
  rank VARCHAR(100),
  substation VARCHAR(100),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Alarms Table
```sql
CREATE TABLE alarms (
  alarm_id INT PRIMARY KEY AUTO_INCREMENT,
  end_user_id INT NOT NULL,
  user_latitude DECIMAL(10, 8),
  user_longitude DECIMAL(11, 8),
  initial_alarm_level VARCHAR(50),
  current_alarm_level VARCHAR(50),
  status VARCHAR(50),
  dispatched_station_id INT,
  dispatched_truck_id INT,
  call_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispatch_time TIMESTAMP NULL,
  resolve_time TIMESTAMP NULL,
  FOREIGN KEY (end_user_id) REFERENCES users(user_id)
);
```

#### Alarm Response Log Table
```sql
CREATE TABLE alarm_response_log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  alarm_id INT NOT NULL,
  action_type VARCHAR(100),
  details TEXT,
  performed_by_user_id INT,
  action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alarm_id) REFERENCES alarms(alarm_id),
  FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id)
);
```

---

## 🧪 Testing Scenarios

### Scenario 1: New User Registration

**Test Goal:** Verify signup creates user in database with proper hashing

**Steps:**
1. Open Substation App → Sign Up
2. Fill form:
   - First Name: `TestFirst`
   - Last Name: `TestLast`
   - ID Number: `TEST001`
   - Rank: `Officer`
   - Substation: `Zamboanga Station 1`
   - Password: `TestPass123!`
   - Confirm: `TestPass123!`
3. Click "Sign Up"
4. Should see: "User registered successfully. Please login."

**Database Verification:**
```sql
SELECT user_id, id_number, full_name, phone_number, role, created_at 
FROM users 
WHERE id_number = 'TEST001';

-- Expected output:
-- user_id: [some number]
-- id_number: TEST001
-- full_name: TestFirst TestLast
-- phone_number: signup_[uuid-based-unique]
-- role: substation_admin
-- created_at: [current timestamp]
```

**Password Verification:**
```sql
-- Password should be hashed, not plaintext
SELECT id_number, password FROM users WHERE id_number = 'TEST001';
-- password should look like: $2b$10$... (bcrypt hash)
-- NOT: TestPass123!
```

---

### Scenario 2: User Login

**Test Goal:** Verify login authenticates user and returns JWT token

**Steps:**
1. Open Admin App → Login
2. Enter:
   - ID Number: `TEST001`
   - Password: `TestPass123!`
3. Click "Login"
4. Should see dashboard (logged in)

**Browser Console Check:**
```javascript
// In DevTools Console:
localStorage.getItem('authToken')
// Should return: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

localStorage.getItem('user')
// Should return: {"id":..., "idNumber":"TEST001", "name":"TestFirst TestLast",...}
```

**Negative Test - Wrong Password:**
```
Enter ID Number: TEST001
Enter Password: WrongPassword
Expected: "Invalid ID Number or password"
```

---

### Scenario 3: Create Incident from Admin

**Test Goal:** Verify incident creation and socket broadcast

**Steps:**
1. Both apps logged in and running
2. In Admin app, navigate to "Incident Report"
3. Click map at location: Makati City (14.5547°N, 121.0244°E)
4. Fill form:
   - First Name: `Maria`
   - Last Name: `Santos`
   - Phone: `09171111111`
   - Incident Type: `Fire`
   - Alarm Level: `Alarm 2`
   - Narrative: `House fire on Main Street`
5. Click "Submit Report" then "Confirm"

**Expected Results:**
- Admin: Success toast "Incident created successfully! Alarm ID: [number]"
- Form resets after 2 seconds
- Substation app receives notification and auto-fills form

**Database Verification:**
```sql
-- Check incident created
SELECT a.alarm_id, u.full_name, a.user_latitude, a.user_longitude, 
       a.initial_alarm_level, a.status, a.call_time
FROM alarms a
JOIN users u ON a.end_user_id = u.user_id
WHERE u.phone_number = '09171111111'
ORDER BY a.call_time DESC
LIMIT 1;

-- Expected output:
-- alarm_id: [some number]
-- full_name: Maria Santos
-- user_latitude: 14.5547
-- user_longitude: 121.0244
-- initial_alarm_level: Alarm 2
-- status: Pending Dispatch
-- call_time: [current timestamp]
```

**API Log Verification:**
```
Backend console should show:
- Socket connected: [socket-id]
- Incident created
- Event emitted to all clients
```

---

### Scenario 4: Socket Event Broadcasting

**Test Goal:** Verify incident broadcasts to other stations in real-time

**Setup:**
- Open Admin app in Browser 1
- Open Substation app in Browser 2
- Both logged in

**Steps:**
1. In Admin Browser, navigate to Incident Report
2. Fill and submit incident with:
   - Phone: `09179999999`
   - Location details
3. Watch Substation Browser

**Expected Results - Substation Browser:**
- Console shows: "Socket received 'new-incident' event"
- Toast appears: "New incident received from admin station"
- Page navigates to "/incident-report"
- Form fields pre-filled:
  - First Name: [matches admin submission]
  - Last Name: [matches admin submission]
  - Phone: `09179999999`
  - Location: [matches coordinates]
  - Alarm Level: [matches admin submission]
  - Narrative: [matches admin submission]
- Map shows marker at exact location

---

### Scenario 5: Reverse Direction - Substation to Admin

**Test Goal:** Verify bidirectional communication works

**Steps:**
1. In Substation Browser, navigate to Incident Report
2. Click map to select location
3. Fill form with test data:
   - First Name: `Juan`
   - Last Name: `Dela Cruz`
   - Phone: `09188888888`
   - Incident Type: `Medical Emergency`
   - Alarm Level: `Alarm 1`
   - Narrative: `Person collapsed at market`
4. Submit and confirm

**Expected Results - Admin Browser:**
- Automatically navigates to Incident Report
- Form pre-filled with incident data
- Map shows incident location
- Can review and edit if needed

---

### Scenario 6: Map Location Selection

**Test Goal:** Verify map click-to-select and coordinate capture

**Steps:**
1. Navigate to Incident Report in either app
2. Observe map displays with default center
3. Click different locations on map:
   - Click 1: North side
   - Click 2: South side
   - Click 3: East side
   - Click 4: West side

**Expected Results:**
- Red marker moves to each clicked location
- Coordinates display and update: "7.5123°, 122.0456°" (example)
- Location field auto-fills with coordinates
- Marker popup shows "Incident Location" and address

**Coordinate Format Verification:**
```
Admin app default: 14.5995°, 120.9842° (Manila)
Substation app default: 7.5°, 122.0° (Zamboanga)
Clicked locations: Update to new latitude, longitude
```

---

### Scenario 7: Error Handling

**Test Goal:** Verify proper error messages and validation

**Test 7A: Missing Phone Number**
- Fill form without phone number
- Click Submit
- Expected: Toast "Phone number and location are required"

**Test 7B: Missing Location**
- Fill form without clicking map
- Click Submit
- Expected: Toast "Phone number and location are required"

**Test 7C: Invalid Login**
- Enter wrong password
- Expected: "Invalid ID Number or password"

**Test 7D: Duplicate ID Number**
- Try to signup with existing ID
- Expected: "User with this ID already exists"

**Test 7E: Backend Not Running**
- Stop backend server
- Try to submit incident
- Expected: Network error in console, toast "Failed to submit incident"

---

## 🔍 Debugging Queries

### Find All Users
```sql
SELECT user_id, id_number, full_name, phone_number, role, created_at 
FROM users 
ORDER BY created_at DESC;
```

### Find Recent Incidents
```sql
SELECT a.alarm_id, u.full_name, u.phone_number, a.user_latitude, a.user_longitude, 
       a.initial_alarm_level, a.status, a.call_time
FROM alarms a
JOIN users u ON a.end_user_id = u.user_id
ORDER BY a.call_time DESC
LIMIT 20;
```

### Find Specific User's Incidents
```sql
SELECT a.alarm_id, a.user_latitude, a.user_longitude, a.initial_alarm_level, 
       a.status, a.call_time
FROM alarms a
JOIN users u ON a.end_user_id = u.user_id
WHERE u.phone_number = '09171111111'
ORDER BY a.call_time DESC;
```

### Verify Incident Response Log
```sql
SELECT l.log_id, l.action_type, l.details, l.action_timestamp, u.full_name
FROM alarm_response_log l
LEFT JOIN users u ON l.performed_by_user_id = u.user_id
WHERE l.alarm_id = [alarm_id]
ORDER BY l.action_timestamp DESC;
```

### Check for Duplicate Entries
```sql
-- Users with duplicate phone_number
SELECT phone_number, COUNT(*) 
FROM users 
GROUP BY phone_number 
HAVING COUNT(*) > 1;

-- Users with duplicate id_number
SELECT id_number, COUNT(*) 
FROM users 
GROUP BY id_number 
HAVING COUNT(*) > 1;
```

### Clear Test Data (for cleanup)
```sql
-- WARNING: This deletes test incidents and related logs
DELETE FROM alarm_response_log WHERE alarm_id IN (
  SELECT a.alarm_id FROM alarms a
  JOIN users u ON a.end_user_id = u.user_id
  WHERE u.phone_number LIKE 'signup_%'
);

DELETE FROM alarms WHERE end_user_id IN (
  SELECT user_id FROM users WHERE id_number LIKE 'TEST%'
);

DELETE FROM users WHERE id_number LIKE 'TEST%' OR phone_number LIKE 'signup_%';
```

---

## 📈 Performance Testing

### Load Test: Create Multiple Incidents
```sql
-- This creates test data to simulate multiple incidents
-- Run this in MySQL to generate test incidents:

INSERT INTO users (first_name, last_name, id_number, full_name, phone_number, password, role)
VALUES 
('Test', 'User1', 'LOAD001', 'Test User1', '0917-load-001', 'hashed_pw', 'end_user'),
('Test', 'User2', 'LOAD002', 'Test User2', '0917-load-002', 'hashed_pw', 'end_user'),
('Test', 'User3', 'LOAD003', 'Test User3', '0917-load-003', 'hashed_pw', 'end_user');

INSERT INTO alarms (end_user_id, user_latitude, user_longitude, initial_alarm_level, current_alarm_level, status)
SELECT user_id, 14.5995 + (RAND() * 0.1), 120.9842 + (RAND() * 0.1), 'Alarm 1', 'Alarm 1', 'Pending Dispatch'
FROM users WHERE id_number LIKE 'LOAD%';
```

### Test Socket Performance
1. Submit multiple incidents rapidly from admin
2. Verify all incidents broadcast to substation
3. Check no incidents are lost
4. Verify form prefills correctly each time

---

## ✅ Final Checklist

- [ ] Database tables exist and are accessible
- [ ] Schema matches requirements (UNIQUE, NOT NULL constraints)
- [ ] New user signup creates record with hashed password
- [ ] Login authenticates against database
- [ ] JWT token generated on successful login
- [ ] Token persists in localStorage
- [ ] Incident creation stores in alarms table
- [ ] Incident broadcast reaches other station
- [ ] Form prefills with all incident data
- [ ] Map displays and accepts clicks
- [ ] Coordinates saved with incident
- [ ] Error messages display correctly
- [ ] No console errors in either app
- [ ] Socket events logged in backend
- [ ] Database queries return expected results

---

## 🎯 Success Criteria

✅ **System is working correctly when:**

1. User can signup and receive confirmation
2. New user appears in database with hashed password
3. User can login with correct credentials
4. User receives JWT token on login
5. Incident submitted from Admin → appears in database
6. Incident submitted from Admin → broadcasts to Substation in real-time
7. Substation receives incident → form auto-prefills
8. Map shows selected location with marker
9. Coordinates saved accurately with incident
10. Both apps communicate bidirectionally (Admin ↔ Substation)

---

## 📞 Support

If any test fails:
1. Check backend server is running (`node server.js`)
2. Check MySQL is running and database exists
3. Check browser console for errors (F12)
4. Run verification queries above
5. Check network tab for API responses
6. Verify token exists in localStorage
7. Check socket connection in console logs

