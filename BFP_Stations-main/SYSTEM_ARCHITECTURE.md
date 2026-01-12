# System Architecture & Communication Flow

## 🏗️ Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BFP Emergency System                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────┐          ┌────────────────────────┐         │
│  │   BFP_ADMIN Frontend   │          │  Substation_admin      │         │
│  │  (React 19.2.0)        │          │  Frontend              │         │
│  │                        │          │  (React 19.2.0)        │         │
│  │  ┌──────────────────┐  │          │  ┌──────────────────┐  │         │
│  │  │ Incident Report  │  │          │  │ Incident Report  │  │         │
│  │  │ ┌──────────────┐ │  │          │  │ ┌──────────────┐ │  │         │
│  │  │ │ Map Container│ │  │          │  │ │ Map Container│ │  │         │
│  │  │ │ (Leaflet)    │ │  │          │  │ │ (Leaflet)    │ │  │         │
│  │  │ └──────────────┘ │  │          │  │ └──────────────┘ │  │         │
│  │  │ ┌──────────────┐ │  │          │  │ ┌──────────────┐ │  │         │
│  │  │ │ Form Fields  │ │  │          │  │ │ Form Fields  │ │  │         │
│  │  │ └──────────────┘ │  │          │  │ └──────────────┘ │  │         │
│  │  └──────────────────┘  │          │  └──────────────────┘  │         │
│  │                        │          │                        │         │
│  │  ┌──────────────────┐  │          │  ┌──────────────────┐  │         │
│  │  │ Login/Signup     │  │          │  │ Login/Signup     │  │         │
│  │  │ (AuthContext)    │  │          │  │ (AuthContext)    │  │         │
│  │  └──────────────────┘  │          │  └──────────────────┘  │         │
│  │                        │          │                        │         │
│  │ Socket.IO Client       │          │ Socket.IO Client       │         │
│  │ Port: 5000             │          │ Port: 5000             │         │
│  └────────────┬───────────┘          └────────────┬───────────┘         │
│               │                                    │                     │
│               └────────────────┬───────────────────┘                     │
│                                │                                         │
│                   ┌────────────▼────────────┐                           │
│                   │  Socket.IO Relay        │                           │
│                   │  (Broadcast Events)     │                           │
│                   └────────────┬────────────┘                           │
│                                │                                         │
│          ┌─────────────────────┴──────────────────────┐                 │
│          │                                            │                 │
│          ▼                                            ▼                 │
│  ┌─────────────────────┐              ┌──────────────────────────┐     │
│  │  HTTP Server        │              │  Express Backend         │     │
│  │  (Port 5000)        │              │  (Node.js)               │     │
│  │                     │              │  Socket.IO Server        │     │
│  │ Attached Routes:    │              │                          │     │
│  │ • /api/login        │              │ Routes:                  │     │
│  │ • /api/signup       │────────────►│ • POST /api/login        │     │
│  │ • /api/create-      │              │ • POST /api/signup       │     │
│  │   incident          │              │ • POST /api/create-      │     │
│  │ • /api/incidents    │              │   incident               │     │
│  │ • /api/health       │              │ • GET /api/incidents     │     │
│  └─────────────────────┘              │                          │     │
│                                       └──────────────┬───────────┘     │
│                                                      │                 │
│                                                      ▼                 │
│                                       ┌──────────────────────────┐     │
│                                       │  MySQL Database          │     │
│                                       │  bfp_emergency_system    │     │
│                                       │                          │     │
│                                       │ Tables:                  │     │
│                                       │ • users                  │     │
│                                       │ • alarms                 │     │
│                                       │ • fire_stations          │     │
│                                       │ • firetrucks             │     │
│                                       │ • alarm_response_log     │     │
│                                       └──────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Incident Creation & Broadcast Flow

### Admin Creates Incident → Both Apps Notified

```
ADMIN APP                           BACKEND SERVER                    SUBSTATION APP
═══════════════════════════════════════════════════════════════════════════════════

User Fills Form
  • Location (map click)
  • Caller Info
  • Incident Details
        │
        ▼
Validate Form
  • Phone required
  • Location required
        │
        ▼
submitIncidentReport()
        │
        ├─► Create JSON payload:
        │   {
        │     firstName: "...",
        │     lastName: "...",
        │     phoneNumber: "...",
        │     location: "...",
        │     latitude: 14.5995,
        │     longitude: 120.9842,
        │     alarmLevel: "Alarm 1",
        │     narrative: "..."
        │   }
        │
        ├─► Add Authorization header:
        │   Bearer ${token}
        │
        ▼
POST /api/create-incident    ─────────────────┐
                                              │
                                              ▼
                                    authenticateToken middleware
                                    Verify JWT is valid
                                              │
                                              ▼
                                    Extract user info from token
                                              │
                                              ▼
                                    Validate required fields
                                              │
                                              ▼
                                    Get database connection
                                              │
                                              ▼
                                    INSERT INTO alarms
                                    INSERT INTO alarm_response_log
                                              │
                                              ▼
                                    io.emit('new-incident', {
                                      alarmId: 12345,
                                      firstName: "...",
                                      lastName: "...",
                                      phoneNumber: "...",
                                      location: "...",
                                      coordinates: {
                                        latitude: 14.5995,
                                        longitude: 120.9842
                                      },
                                      alarmLevel: "Alarm 1",
                                      narrative: "...",
                                      status: "Pending Dispatch"
                                    })
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
Response 201:              (Broadcast to all      Socket listener fires:
{                          connected clients)     socket.on('new-incident', data)
  alarmId: 12345,                                        │
  status: "OK"                                           ▼
}                                                sessionStorage.setItem(
        │                                          'incomingIncident',
        ▼                                          JSON.stringify(data)
showToast(                                        )
  "Incident created       
   successfully!                                        │
   Alarm ID: 12345"                                     ▼
)                                                   navigate('/incident-report')
        │                                                │
        ▼                                                ▼
Form Resets                                       setFormData({...from socket data})
                                                  setSelectedLocation({...coordinates})
                                                        │
                                                        ▼
                                                  showToast(
                                                    "New incident received
                                                     from admin station"
                                                  )
                                                        │
                                                        ▼
                                                  Render Form with Pre-filled Data
```

---

## 🔐 Authentication Flow

### Login Process

```
LOGIN PAGE                              BACKEND                         DATABASE
═══════════════════════════════════════════════════════════════════════════════════

User enters:
  • ID Number: 123456
  • Password: myPassword123
        │
        ▼
Form Validation
  • Check both fields filled
        │
        ▼
handleLogin()
        │
        ├─► Call AuthContext.login(idNumber, password)
        │
        ├─► POST /api/login
        │   {
        │     idNumber: "123456",
        │     password: "myPassword123"
        │   }
        │
        ▼
                                    Receive POST /api/login
                                              │
                                              ▼
                                    Query database:
                                    SELECT * FROM users
                                    WHERE id_number = '123456'
                                              │
                                              ▼
                                    ┌─────────────────────────────────┐
                                    │ User found?                     │
                                    └────────────┬────────────────────┘
                                                 │
                                   ┌─────────────┴─────────────┐
                                   │ Yes                      No
                                   ▼                          ▼
                                              Return 401:
                        User.password:         "Invalid ID/password"
                        $2b$10$abcd...(hash)           │
                                   │                   ▼
                                   ▼              showToast(error)
                        bcrypt.compare(        Disable submit button
                        "myPassword123",       Form stays on login
                        hash)
                                   │
                                   ▼
                    ┌───────────────────────────────────┐
                    │ Passwords Match?                  │
                    └────────────┬──────────────────────┘
                                 │
                       ┌─────────┴──────────┐
                       │ Yes              No
                       ▼                  ▼
                                    Return 401:
            jwt.sign({           "Invalid ID/password"
              id: 1,                    │
              idNumber: "123456",       ▼
              name: "John Doe",    showToast(error)
              substation: "Zone1"
            },
            JWT_SECRET,
            {expiresIn: '24h'})
                       │
                       ▼
                Response 200:
                {
                  token: "eyJhbGc...",
                  user: {
                    id: 1,
                    idNumber: "123456",
                    name: "John Doe",
                    firstName: "John",
                    lastName: "Doe",
                    rank: "Captain",
                    substation: "Zone1"
                  }
                }
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
localStorage.setItem(         localStorage.setItem(
  'authToken',                  'user',
  token                         JSON.stringify(user)
)                             )
        │                             │
        ▼                             ▼
Router.navigate('/')
        │
        ▼
showToast("Login successful")
```

### Signup Process

```
SIGNUP PAGE                             BACKEND                         DATABASE
═══════════════════════════════════════════════════════════════════════════════════

User fills form:
  • First Name: John
  • Last Name: Doe
  • ID Number: 123456
  • Rank: Officer
  • Substation: Zone1
  • Password: newPassword123
  • Confirm: newPassword123
        │
        ▼
Client-side Validation:
  • All fields required
  • Password matches confirm
  • Password strength check
        │
        ▼
handleSignup()
        │
        ├─► Call AuthContext.signup({...fields})
        │
        ├─► POST /api/signup
        │   {
        │     firstName: "John",
        │     lastName: "Doe",
        │     idNumber: "123456",
        │     rank: "Officer",
        │     substation: "Zone1",
        │     password: "newPassword123"
        │   }
        │
        ▼
                                    Receive POST /api/signup
                                              │
                                              ▼
                                    Validate all fields exist
                                              │
                                              ▼
                                    Query existing user:
                                    SELECT * FROM users
                                    WHERE id_number = '123456'
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │ User exists?        │
                                    └────────────┬────────┘
                                                 │
                                       ┌─────────┴──────────┐
                                       │ No              Yes
                                       ▼                 ▼
                                                    Return 400:
                                                    "User already exists"
                                                         │
                                                         ▼
                        ┌────────────────────────┐  showToast(error)
                        │ bcrypt.hash(password)  │
                        │ (10 rounds)            │
                        └──────────┬─────────────┘
                                   │
                                   ▼
                    $2b$10$abcd...(hash)
                                   │
                                   ▼
                    Generate phone placeholder:
                    signup_[UUID-12-chars]
                                   │
                                   ▼
                                              │
                    INSERT INTO users         │
                    (                         │
                      first_name: "John",     │
                      last_name: "Doe",       │
                      id_number: "123456",    │
                      rank: "Officer",        │
                      substation: "Zone1",    │
                      full_name: "John Doe",  │
                      phone_number:           │
                        "signup_abc123...",   │
                      password: [hash],       │
                      role: "substation_admin"│
                    )                         │
                                   │          │
                                   └──────────┼──────┐
                                              │      │
                                              ▼      ▼
                        Response 201:      User created in database
                        {
                          message: "User 
                          registered 
                          successfully.
                          Please login."
                        }
        │
        ▼
showToast("Signup successful")
        │
        ▼
Router.navigate('/login')
        │
        ▼
User enters credentials and logs in
```

---

## 📡 Socket.IO Event Broadcasting

### Connection & Disconnect Flow

```
CLIENT (Admin/Substation)              SERVER                    OTHER CLIENTS
════════════════════════════════════════════════════════════════════════════════

App.jsx useEffect() runs:
  const socket = io('http://localhost:5000')
        │
        ▼
Socket connect attempt
        │
        ├──────────► io.on('connection', (socket) => {
        │                console.log('Socket connected')
        │              })
        │                    │
        │                    ▼
        │            Unique socket ID assigned
        │                    │
        │◄─── Connection established
        │      socket.id: "abc123xyz"
        │
        ▼
App logs: "Connected to socket server abc123xyz"
        │
        │ (User now listening for events)
        │
        │ socket.on('new-incident', (data) => {
        │   // Handle incident received
        │ })
        │
        │ (Waiting for broadcasts...)
        │
        ├──────────► [OTHER CLIENT SUBMITS INCIDENT]
        │                    │
        │                    ▼
        │            io.emit('new-incident', data)
        │                    │
        │◄─── Event broadcast
        │      'new-incident' received
        │
        ▼
callback executes:
  setFormData(...)
  setSelectedLocation(...)
  navigate('/incident-report')
  showToast('New incident received')
        │
        │ (User continues using app)
        │
        │ (Eventually navigates away or closes browser)
        │
        └──────────► socket.disconnect()
                          │
                          ▼
                    io.on('disconnect', () => {
                      console.log('Socket disconnected')
                    })
                          │
                          ▼
                    Socket connection closed
```

---

## 📊 Data Model Relationships

### ER (Entity-Relationship) Diagram

```
┌─────────────────────┐
│       USERS         │
├─────────────────────┤
│ user_id (PK)        │
│ id_number (UNIQUE)  │
│ phone_number (UNI)  │
│ first_name          │
│ last_name           │
│ full_name (NOT NULL)│
│ password (NOT NULL) │
│ role (NOT NULL)     │
│ rank                │
│ substation          │
│ email               │
│ created_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │ (user creates alarms)
           │
           ▼
┌─────────────────────┐         ┌──────────────────────┐
│      ALARMS         │────────►│ ALARM_RESPONSE_LOG   │
├─────────────────────┤  1:N    ├──────────────────────┤
│ alarm_id (PK)       │         │ log_id (PK)          │
│ end_user_id (FK)    │         │ alarm_id (FK)        │
│ user_latitude       │         │ action_type          │
│ user_longitude      │         │ details              │
│ initial_alarm_level │         │ performed_by_user_id │
│ current_alarm_level │         │ action_timestamp     │
│ status              │         └──────────────────────┘
│ dispatched_station_ │
│   id (FK opt)       │
│ dispatched_truck_id │
│ call_time           │
│ dispatch_time       │
│ resolve_time        │
└─────────────────────┘
           │
           │ N:1 (optional)
           │
           ▼
┌─────────────────────┐
│   FIRE_STATIONS     │
├─────────────────────┤
│ station_id (PK)     │
│ station_name        │
│ location            │
│ latitude            │
│ longitude           │
│ contact_number      │
└─────────────────────┘
```

---

## 🔀 Bidirectional Communication Sequence

### Both Apps Active - Alternating Incidents

```
TIME    ADMIN APP                   BACKEND                 SUBSTATION APP
════════════════════════════════════════════════════════════════════════════

T1:     ┌──────────────┐
        │ User submits  │
        │ incident      │───────────► Process & INSERT     
        └──────────────┘                   │
                                          emit 'new-incident'
                                           │
                                           ├─────► [Admin receives own 
                                           │        incident echo]
                                           │
        ┌─────────────────────────────────┤
        │                                 │
        ▼                                 ▼
    [Form prefills]             [navigate to form]
                               [Form prefills]
                                │
T2:                                     ┌──────────────┐
                                        │ User submits  │
        [Listening...]                  │ incident      │
                                        └──────────────┘
                                            │
                                       ◄────► Process & INSERT
                                            │
                                           emit 'new-incident'
                                            │
        ◄────────────────────────────────┤
        │ [navigate to form]              │
        │ [Form prefills]                 │
        ▼                                 │
                                        [App echoes]
        ▼
    [Ready for next]                  [Ready for next]
```

---

## 🎯 Component Interaction Map

### Admin App Component Tree

```
App
├── AuthProvider
│   └── AuthContext (login, signup, logout)
├── CallProvider
│   └── CallContext (addIncomingCall, etc)
├── StatusProvider
│   └── StatusContext (updateAlarmLevel, etc)
├── BrowserRouter
│   └── AppContent
│       ├── Socket.IO Listener
│       │   └── on('new-incident') → navigate + context update
│       │
│       ├── Auth Routes (no layout)
│       │   ├── /login → Login component
│       │   └── /signup → Signup component
│       │
│       └── Protected Routes (with layout)
│           ├── Sidebar (navigation)
│           ├── Topnavbar (user info)
│           └── Content Area
│               ├── / → Dashboard
│               ├── /incident-report → IncidentReport
│               │   ├── MapContainer (Leaflet map)
│               │   ├── Form fields
│               │   ├── Toast (notifications)
│               │   └── ConfirmModal (confirmation)
│               ├── /reports → Reports
│               ├── /emergency-calls → EmergencyCallHistory
│               ├── /branch-status → BranchStatus
│               └── ... other routes
│
└── Fixed Call Modals (horizontal stack)
    └── CallModal (for each ongoing call)
    
Incoming Call Modals (floating)
└── IncomingCallModal (shows caller info, accept/reject)
```

### Substation App Component Tree

```
App
├── StatusProvider
│   └── StatusContext (updateAlarmLevel, etc)
├── AuthProvider
│   └── AuthContext (login, signup, logout)
├── BrowserRouter
│   └── AppContent
│       ├── Socket.IO Listener
│       │   └── on('new-incident') → sessionStorage + navigate
│       │
│       ├── Auth Routes (no layout)
│       │   ├── /login → Login component
│       │   └── /signup → Signup component
│       │
│       └── Protected Routes (with layout)
│           ├── Sidebar (navigation)
│           ├── Topnavbar (user info)
│           └── Content Area
│               ├── / → Dashboard
│               ├── /incident-report → IncidentReport
│               │   ├── MapContainer (Leaflet map)
│               │   ├── Form fields
│               │   ├── Toast (notifications)
│               │   └── ConfirmModal (confirmation)
│               ├── /emergency-calls → EmergencyCallHistory
│               ├── /station-readiness → StationReadiness
│               └── ... other routes
```

---

## 🔗 Key Data Structures

### Incident Broadcast Payload

```javascript
{
  alarmId: 12345,                    // Database alarm_id
  callerId: 1,                       // User who reported
  firstName: "Maria",                // Caller first name
  lastName: "Santos",                // Caller last name
  phoneNumber: "09171234567",        // Caller phone
  incidentType: "Fire",              // Type of incident
  alarmLevel: "Alarm 2",             // Severity level
  location: "Main St, Barangay 1",   // Description
  narrative: "House fire occurring", // Detailed narrative
  coordinates: {
    latitude: 14.5547,               // Decimal degrees
    longitude: 121.0244
  },
  status: "Pending Dispatch"         // Current status
}
```

### JWT Token Payload

```javascript
{
  id: 1,                        // User ID from database
  idNumber: "123456",           // User's ID number
  name: "John Doe",             // Full name
  substation: "Zone1",          // Assigned substation
  iat: 1234567890,             // Issued at timestamp
  exp: 1234654290              // Expires at timestamp
}
```

### Form State

```javascript
{
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "09171234567",
  location: "123 Main St",
  incidentType: "Fire",
  alarmLevel: "Alarm 1",
  narrative: "Detailed incident description"
}
```

### Selected Location State

```javascript
{
  lat: 14.5995,                // Latitude clicked on map
  lng: 120.9842                // Longitude clicked on map
}
```

---

## ✅ Summary

This architecture ensures:
- **Real-Time Communication:** Socket.IO broadcasts incidents instantly
- **Bidirectional Flow:** Admin ↔ Substation incident exchange works both ways
- **Secure Authentication:** JWT tokens and bcrypt password hashing
- **Data Persistence:** All incidents stored in MySQL database
- **User Experience:** Forms pre-fill, maps show locations, toasts notify users
- **Error Handling:** Validation on client and server, proper error messages
- **Scalability:** Can add more stations by connecting more Socket.IO clients

