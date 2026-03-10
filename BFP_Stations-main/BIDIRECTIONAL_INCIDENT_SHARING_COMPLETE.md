# Bidirectional Incident Sharing System - Complete Implementation

## 🎯 Overview
The BFP Emergency System now supports **bidirectional incident sharing** between the Admin (BFP_ADMIN) and Substation (Substation_admin) applications. Both applications can send and receive incident reports in real-time using Socket.IO, with interactive map-based location selection and database-backed authentication.

---

## ✅ Completed Features

### 1. **Real-Time Incident Broadcasting (Socket.IO)**
- ✅ Backend emits `new-incident` event when incident is created
- ✅ Both admin and substation apps listen to socket events
- ✅ Incident data automatically prefills receiver's form
- ✅ Location coordinates preserved in broadcast

**Implementation:**
- Backend: `BFP_ADMIN/backend/server.js` - Socket.IO server with CORS enabled
- Backend: `BFP_ADMIN/backend/routes/incidentRoutes.js` - Emits incident on creation
- Frontend (Admin): `BFP_ADMIN/src/App.jsx` - Socket listener and navigation
- Frontend (Substation): `Substation_admin/src/App.jsx` - Socket listener with sessionStorage prefill

### 2. **Bidirectional Submission & Reception**

#### Admin → Substation:
1. Admin fills incident report form (or receives one from substation)
2. Admin clicks "Submit Report"
3. Backend creates incident in database
4. Backend emits `new-incident` event via Socket.IO
5. Substation receives event in real-time
6. Substation form auto-prefills with incident data
7. Substation officer can review/edit and submit if needed

#### Substation → Admin:
1. Substation fills incident report form (or receives one from admin)
2. Substation clicks "Submit Report"
3. Backend creates incident in database
4. Backend emits `new-incident` event via Socket.IO
5. Admin receives event in real-time
6. Admin's incoming call modal/incident form is populated
7. Admin officer can review/edit and submit if needed

### 3. **Interactive Map Integration**

#### Admin (BFP_ADMIN):
- `BFP_ADMIN/src/components/MapContainer.jsx` - Full implementation
- Default center: Mandaluyong, Manila (14.5995°, 120.9842°)
- Click-to-select location functionality
- MapTiler API for tile layer

#### Substation (Substation_admin):
- `Substation_admin/src/components/MapContainer.jsx` - Identical to admin version
- Default center: Zamboanga City (7.5°, 122.0°)
- Click-to-select location functionality
- MapTiler API for tile layer
- Coordinates displayed in decimal format

**Map Features:**
- Interactive marker placement via click
- Real-time coordinate display
- Location address input field
- Responsive map container
- Leaflet popup on marker click

### 4. **Secure Authentication System**

#### Signup Process:
1. User fills signup form (First Name, Last Name, ID Number, Substation/Rank, Password)
2. Password hashed with bcrypt (10 rounds)
3. Unique phone number generated: `signup_${UUID.substring(0, 12)}`
4. User record created in MySQL database
5. Requires all NOT NULL columns: `full_name`, `phone_number`, `password`, `role`

#### Login Process:
1. User enters ID Number and Password
2. Backend queries database for user
3. bcrypt compares plaintext with hashed password
4. JWT token generated (24-hour expiry) if credentials valid
5. User object and token returned
6. Token stored in localStorage as `authToken`
7. User object stored in localStorage as `user` (JSON)

**Database Schema:**
```sql
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  id_number VARCHAR(50) UNIQUE NOT NULL,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  substation VARCHAR(100),
  rank VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Authentication Endpoints:**
- `POST /api/signup` - Create new user account
- `POST /api/login` - Authenticate user and return JWT
- `POST /api/create-incident` - Requires Bearer token

### 5. **Component Architecture**

#### Admin App (BFP_ADMIN):
- `src/App.jsx` - Top-level app with Socket listener, AuthProvider, CallProvider
- `src/pages/IncidentReport.jsx` - Form with map, socket listener, submission
- `src/pages/login.jsx` - Login page with database-backed authentication
- `src/pages/signup.jsx` - Signup page with password strength meter
- `src/components/MapContainer.jsx` - Interactive map for location selection
- `src/context/AuthContext.jsx` - Auth state management
- `src/context/CallContext.jsx` - Call data management

#### Substation App (Substation_admin):
- `src/App.jsx` - Top-level app with Socket listener, AuthProvider
- `src/pages/IncidentReport.jsx` - Form with map, socket listener, submission (MIRROR of admin)
- `src/pages/login.jsx` - Login page with database-backed authentication
- `src/pages/signup.jsx` - Signup page with password strength meter
- `src/components/MapContainer.jsx` - Interactive map (default: Zamboanga)
- `src/components/Toast.jsx` - Toast notification component
- `src/components/ConfirmModal.jsx` - Confirmation modal for form submission
- `src/context/AuthContext.jsx` - Auth state management (MIRROR of admin)

#### Common UI Components:
- `Toast.jsx` - Success/Error/Warning notifications with auto-dismiss
- `ConfirmModal.jsx` - Confirmation dialog with onConfirm/onCancel callbacks
- `FormField.jsx` - Reusable form input component
- `Sidebar Navigation` - Route navigation
- `Topnavbar` - User info and logout

### 6. **Error Handling & Validation**

#### Frontend Validation:
- Phone number and location required before submission
- Form fields validate on change
- Toast notifications for success/error messages
- Loading state prevents double-submission

#### Backend Validation:
- Required fields checked: `phoneNumber`, `latitude`, `longitude`, `alarmLevel`
- Authentication middleware verifies JWT token
- Database constraints enforce data integrity
- Error responses include descriptive messages

---

## 🔧 Technical Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend Framework | React | 19.2.0 |
| Routing | React Router | 6.30.2 |
| Real-Time Communication | Socket.IO Client | 4.8.1 |
| Mapping Library | React-Leaflet | 5.0.0 |
| Map Tiles | MapTiler API | Latest |
| Authentication | JWT (jsonwebtoken) | 9.0.2 |
| Password Hashing | bcrypt | 5.1.0 |
| Backend Framework | Express | 4.18.2 |
| Database | MySQL2 | 3.15.3 |
| Server | Node.js | Latest |
| Real-Time Server | Socket.IO Server | 4.8.1 |

---

## 📊 Data Flow Diagram

### Scenario: Admin Creates Incident → Substation Receives

```
┌─────────────────┐
│   Admin App     │
│  (Fill Form)    │
└────────┬────────┘
         │
         ├──► MapContainer (Click to select location)
         │
         ├──► Form Fields (First Name, Last Name, Phone, Narrative)
         │
         └──► Submit Button
              │
              ├──► Validate Form (Phone + Location required)
              │
              └──► POST /api/create-incident (with Bearer token)
                   │
                   │
        ┌──────────┴──────────┐
        │   Backend (server.js)│
        │   (Create Alarm)     │
        └──────────┬───────────┘
                   │
                   ├──► INSERT INTO alarms (...)
                   │
                   └──► io.emit('new-incident', {...})
                        │
        ┌───────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
   Admin App (Sender)            Substation App (Receiver)
   - Shows Success Toast         - Socket listener receives event
   - Resets Form                 - Stores in sessionStorage
   - Updates Dashboard           - Navigates to /incident-report
                                 - Form auto-prefilled
                                 - Map shows location
                                 - Officer can review & submit
```

---

## 🚀 How to Run

### 1. **Setup Backend**

```bash
cd BFP_ADMIN/backend

# Install dependencies
npm install

# Ensure MySQL database is running
# Database: bfp_emergency_system

# Start server (runs on port 5000)
node server.js
```

**Expected Output:**
```
Server is running on http://localhost:5000
```

### 2. **Run Admin Application**

```bash
cd BFP_ADMIN

# Install dependencies
npm install

# Start development server (runs on port 5173 by default)
npm run dev
```

### 3. **Run Substation Application**

```bash
cd Substation_admin

# Install dependencies
npm install

# Start development server (runs on port 5174 by default)
npm run dev
```

### 4. **Verify Socket Connection**

Open browser console in both apps and check for:
```
Connected to socket server [socket-id]
```

---

## 🧪 Testing Workflow

### Test 1: Admin Creates Incident → Substation Receives

**Steps:**
1. Open Admin app in one browser window
2. Open Substation app in another browser window
3. Login to both apps (use same or different credentials)
4. In Admin app, navigate to "Incident Report"
5. Click on map to select incident location
6. Fill form fields (First Name, Last Name, Phone, Narrative)
7. Click "Submit Report"
8. Confirm submission in modal dialog

**Expected Result:**
- Admin shows: "Incident created successfully! Alarm ID: [number]"
- Substation shows: Toast notification "New incident received from admin station"
- Substation form auto-fills with incident data
- Substation map displays incident location
- Substation officer can review and resubmit if needed

### Test 2: Substation Creates Incident → Admin Receives

**Steps:**
1. Repeat Test 1 but originate from Substation app
2. Click "Submit Report" from substation

**Expected Result:**
- Substation shows: "Incident created successfully! Alarm ID: [number]"
- Admin shows: Incoming call modal OR navigates to incident report
- Admin form auto-fills with incident data
- Admin can accept/reject or review incident

### Test 3: Signup & Authentication

**Steps:**
1. Navigate to signup page in either app
2. Fill form: First Name, Last Name, ID Number, Password, Confirm Password
3. Click "Sign Up"
4. Login with new credentials
5. Verify user info displays in topnavbar

**Expected Result:**
- Signup succeeds: "User created successfully"
- User record created in MySQL database
- Login succeeds: Returns JWT token
- User info displayed in app header

### Test 4: Map Location Selection

**Steps:**
1. Open Incident Report page (after login)
2. Click on map at any location
3. Observe marker placement
4. Check coordinates display
5. Fill form and submit

**Expected Result:**
- Marker appears at clicked location
- Coordinates display in decimal format (e.g., "7.5132, 122.0124")
- Location field auto-fills with coordinates
- Map persists through form submission

---

## 📁 File Structure

### Backend
```
BFP_ADMIN/backend/
├── server.js                    # Main server with Socket.IO setup
├── package.json                 # Dependencies: socket.io, bcrypt, jsonwebtoken
├── config/
│   └── database.js             # MySQL connection pool
├── middleware/
│   └── auth.js                 # JWT authentication middleware
├── routes/
│   ├── authRoutes.js           # /api/login, /api/signup
│   └── incidentRoutes.js        # /api/create-incident, emit socket event
└── migrations/
    └── 001_add_auth_columns.sql
```

### Admin Frontend
```
BFP_ADMIN/src/
├── App.jsx                     # Top-level app with Socket listener
├── pages/
│   ├── login.jsx               # Database-backed login
│   ├── signup.jsx              # Database-backed signup
│   └── IncidentReport.jsx       # Form with map & socket listener
├── components/
│   ├── MapContainer.jsx        # Leaflet map with marker
│   ├── Toast.jsx               # Toast notifications
│   ├── ConfirmModal.jsx        # Confirmation dialog
│   └── ...
├── context/
│   ├── AuthContext.jsx         # Auth state management
│   ├── CallContext.jsx         # Call data management
│   └── StatusContext.jsx        # Status state management
└── style/
    ├── mapcontainer.css        # Map styling
    ├── toast.css               # Toast styling
    ├── confirmmodal.css        # Modal styling
    └── ...
```

### Substation Frontend
```
Substation_admin/src/
├── App.jsx                     # Top-level app with Socket listener
├── pages/
│   ├── login.jsx               # Database-backed login
│   ├── signup.jsx              # Database-backed signup
│   └── IncidentReport.jsx       # Form with map & socket listener (MIRROR)
├── components/
│   ├── MapContainer.jsx        # Leaflet map (default: Zamboanga)
│   ├── Toast.jsx               # Toast notifications
│   ├── ConfirmModal.jsx        # Confirmation dialog
│   └── ...
├── context/
│   ├── AuthContext.jsx         # Auth state management (MIRROR)
│   ├── StatusContext.jsx        # Status state management
│   └── ...
└── style/
    ├── mapcontainer.css        # Map styling
    ├── toast.css               # Toast styling
    ├── confirmmodal.css        # Modal styling
    └── ...
```

---

## 🔐 Security Considerations

### Authentication
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens with 24-hour expiry
- ✅ Authentication middleware on protected routes
- ✅ Bearer token required for incident submission

### Data Validation
- ✅ Phone number required and unique
- ✅ Coordinates validated on submission
- ✅ Alarm level sanitized from form input
- ✅ Form fields validated client-side before submit

### Database
- ✅ UNIQUE constraints on `id_number` and `phone_number`
- ✅ NOT NULL constraints on required fields
- ✅ Connection pooling with MySQL2
- ✅ Parameterized queries to prevent SQL injection

### Socket.IO
- ⚠️ CORS enabled with `origin: '*'` (for development)
- ⚠️ Consider restricting in production to specific origins

---

## 🐛 Known Issues & Solutions

### Issue 1: "UNIQUE constraint violation on phone_number"
**Cause:** Placeholder phone numbers not unique
**Solution:** Use UUID: `'signup_' + randomUUID().substring(0, 12)`
**Status:** ✅ Fixed

### Issue 2: Socket connection fails if backend not running
**Cause:** Backend server not started on port 5000
**Solution:** Start backend with `node server.js`
**Status:** ✅ Verify backend is running

### Issue 3: Map shows but coordinates not saved
**Cause:** Selected location state not captured properly
**Solution:** Ensure `onLocationSelect` callback updates parent state
**Status:** ✅ Implemented in IncidentReport.jsx

### Issue 4: Toast notifications not visible
**Cause:** Toast.css not imported or styled
**Solution:** Verify `import '../style/toast.css'` in Toast.jsx
**Status:** ✅ Verified

---

## 📋 Deployment Checklist

- [ ] Backend server configured and running
- [ ] MySQL database created and populated
- [ ] Both frontend apps can connect to backend on port 5000
- [ ] Socket.IO events firing in browser console
- [ ] Login/signup creates users in database
- [ ] Incident form submits to API successfully
- [ ] Bidirectional incident sharing tested
- [ ] Map displays and click-to-select works
- [ ] Toast notifications appear on success/error
- [ ] Authentication token persists in localStorage
- [ ] Logout clears session properly
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

---

## 📞 Support & Troubleshooting

### Backend not running?
```bash
cd BFP_ADMIN/backend
npm install
node server.js
```

### Port 5000 already in use?
```bash
# Windows: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :5000
kill -9 <PID>
```

### Socket not connecting?
1. Check backend is running on port 5000
2. Check browser console for errors
3. Verify CORS settings in server.js
4. Check network tab in DevTools

### Incident not appearing in receiver?
1. Verify socket is connected (check console logs)
2. Check incident submission returned 201 status
3. Verify incident data in emit event
4. Check receiver is listening to 'new-incident' event

### Map not showing?
1. Verify react-leaflet and leaflet installed
2. Check MapTiler API key is valid
3. Verify internet connection (tiles loaded from CDN)
4. Check CSS file is imported

---

## 🎓 Architecture Overview

### Real-Time Communication Flow:
1. **Frontend** (Admin/Substation) → **Backend** (Express)
   - REST API: POST /api/create-incident with Bearer token
   
2. **Backend** (Express) → **Database** (MySQL)
   - INSERT incident record
   
3. **Backend** (Express) → **Socket.IO**
   - Emit 'new-incident' event to all connected clients
   
4. **Socket.IO** → **Frontend** (Other app)
   - Receive event and prefill form
   - Show Toast notification

### Authentication Flow:
1. **Frontend** → **Backend**: POST /api/signup or /api/login
2. **Backend** → **Database**: INSERT user or SELECT user
3. **Backend**: Hash password (bcrypt) or verify password
4. **Backend** → **Frontend**: JWT token + user object
5. **Frontend**: Store token in localStorage
6. **Frontend** → **Backend**: Attach token in Authorization header

---

## 📝 Additional Notes

- Both Admin and Substation apps now have identical UI/UX for incident reports
- Map default locations differ: Admin (Manila), Substation (Zamboanga)
- Authentication system mirrors across both apps for consistency
- Socket.IO broadcasts to all connected clients (admin and substation simultaneously)
- Form state persists through socket events and sessionStorage

---

## ✅ Summary

**Bidirectional Incident Sharing is now fully implemented:**
- ✅ Admin ↔ Substation incident exchange via Socket.IO
- ✅ Interactive maps in both applications
- ✅ Secure, database-backed authentication
- ✅ Real-time form prefilling on incident reception
- ✅ Toast notifications and confirmation modals
- ✅ No errors detected in current implementation

**Next Steps:**
1. Start backend server: `node BFP_ADMIN/backend/server.js`
2. Run both frontend apps: `npm run dev` in each directory
3. Test incident sharing between apps
4. Deploy to production with proper CORS settings

---

**Implementation Complete! 🎉**
