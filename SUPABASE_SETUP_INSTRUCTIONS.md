# 🗄️ COMPLETE SUPABASE DATABASE SETUP GUIDE

**Updated:** February 10, 2026  
**Status:** Ready to Deploy  
**Scope:** Works for Web + Mobile Applications

---

## 📋 What's Included

This complete PostgreSQL schema includes **8 tables** with all relationships, indexes, and constraints needed for your BFP Emergency System:

| Table | Purpose | Status |
|-------|---------|--------|
| **users** | Authentication & user management | ✅ Complete |
| **fire_stations** | Station registry (Main + Substations) | ✅ Complete |
| **firetrucks** | Fleet management & tracking | ✅ Complete |
| **alarms** | Emergency incidents/calls | ✅ Complete |
| **alarm_response_log** | Incident audit trail | ✅ Complete |
| **incident_reports** | Detailed incident documentation | ✅ Complete |
| **station_readiness** | Daily equipment status | ✅ Complete |
| **firetruck_location_history** | GPS location archive | ✅ Complete |

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your BFP project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Copy & Paste the Schema
1. Open the file: `COMPLETE_SUPABASE_SCHEMA.sql`
2. Copy **all content**
3. Paste into Supabase SQL Editor
4. Click **RUN** button

### Step 3: Wait for Completion
- SQL will execute automatically
- Takes ~10-30 seconds
- Should see ✅ success message

### Step 4: Verify Tables Created
In Supabase dashboard, go to **Table Editor** and confirm you see:
- users
- fire_stations
- firetrucks
- alarms
- alarm_response_log
- incident_reports
- station_readiness
- firetruck_location_history

---

## 📊 Table Descriptions

### 1. **users** - Central Authentication
```sql
-- Stores: Admin, Substation Admins, Drivers, Emergency Callers
-- Key fields:
--   id_number: Unique BFP ID (e.g., "BFP-00001")
--   phone_number: Unique phone (login identifier)
--   role: admin | substation_admin | driver | end_user
--   assigned_station_id: Which station they belong to
```

**Used by:**
- ✅ Web Admin Portal (login)
- ✅ Web Substation Portal (login)
- ✅ Mobile Firetruck App (driver tracking)
- ✅ Mobile End-User App (emergency caller)

---

### 2. **fire_stations** - Station Registry
```sql
-- Stores: Central Fire Station + All Substations
-- Key fields:
--   station_type: "Main" (1 only) | "Substation" (many)
--   latitude/longitude: Station GPS location
--   head_officer: OIC name
```

**Used by:**
- ✅ Station dispatch routing (Main vs Substation)
- ✅ Mobile app map display
- ✅ KNN nearest station calculation

---

### 3. **firetrucks** - Fleet Management
```sql
-- Stores: Physical fire engines/trucks
-- Key fields:
--   truck_code: Unique identifier (e.g., "TR-001")
--   assigned_station_id: Home station
--   is_active: Operational status
--   current_latitude/longitude: LIVE GPS position
--   driver_id: Assigned driver user
```

**Used by:**
- ✅ Mobile truck app (real-time location updates)
- ✅ Web dashboard (truck dispatch)
- ✅ Location tracking

---

### 4. **alarms** - Emergency Incidents
```sql
-- Stores: Every emergency call/incident
-- Key fields:
--   end_user_id: Who called (FK to users)
--   user_latitude/longitude: Incident location
--   initial_alarm_level: "Alarm 1", "Alarm 2", etc.
--   current_alarm_level: May change
--   status: Pending Dispatch → Resolved
--   assigned_station_id: Dispatched station
--   assigned_truck_id: Dispatched truck
```

**Used by:**
- ✅ Incident creation & storage
- ✅ Real-time dispatch updates
- ✅ Incident list queries
- ✅ Historical records

---

### 5. **alarm_response_log** - Audit Trail
```sql
-- Stores: Every action taken on an incident
-- Key fields:
--   alarm_id: Reference to incident
--   action_type: "Initial Dispatch", "On Scene", "Resolved", etc.
--   performed_by_user_id: Who took the action
--   action_timestamp: When it happened
```

**Used by:**
- ✅ Incident history timeline
- ✅ Compliance/audit reporting
- ✅ Action tracking

---

### 6. **incident_reports** - Documentation
```sql
-- Stores: Detailed incident descriptions
-- Key fields:
--   alarm_id: Reference to main incident
--   incident_type: "House Fire", "Medical Emergency", etc.
--   narrative: Detailed description
--   injuries_reported: Count
--   deaths_reported: Count
```

**Used by:**
- ✅ Incident form storage
- ✅ After-action reports
- ✅ Statistics & analytics

---

### 7. **station_readiness** - Daily Status
```sql
-- Stores: Equipment & personnel readiness per station
-- Key fields:
--   station_id: Which station
--   status: "READY" | "PARTIALLY_READY" | "NOT_READY"
--   readiness_percentage: 0-100
--   equipment_checklist: JSON {firetruck: bool, scba: bool, ...}
```

**Used by:**
- ✅ Daily readiness reporting
- ✅ Equipment status tracking
- ✅ Maintenance scheduling

---

### 8. **firetruck_location_history** - GPS Archive
```sql
-- Stores: Historical truck positions
-- Key fields:
--   truck_id: Which truck
--   alarm_id: Part of which incident
--   latitude/longitude: Position
--   speed: km/h
--   heading: Direction (0-360°)
```

**Used by:**
- ✅ Route history playback
- ✅ Response time analytics
- ✅ Audit trail for GPS data

---

## 🔐 Security: Row Level Security (RLS)

The schema includes RLS policies that allow **all operations** for development. 

**⚠️ IMPORTANT:** Before going to production, implement **role-based RLS policies** like:

```sql
-- Example: Only users can see their own station's data
CREATE POLICY "Users see own station data"
  ON alarms FOR SELECT
  USING (assigned_station_id IN (
    SELECT assigned_station_id FROM users WHERE user_id = auth.uid()
  ));
```

Contact your Supabase admin for production RLS setup.

---

## 🧪 Testing the Database

### Test 1: Check Table Creation
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Expected output: 8 tables listed

### Test 2: Insert Test User
```sql
INSERT INTO users (
  id_number, first_name, last_name, full_name, phone_number, password, role
) VALUES (
  'BFP-99999', 'Test', 'User', 'Test User', '9999999999', 'hashed_pwd', 'end_user'
);
```

### Test 3: Query Sample Data
```sql
SELECT * FROM fire_stations LIMIT 5;
SELECT * FROM users WHERE role = 'admin';
SELECT * FROM firetrucks WHERE is_active = true;
```

---

## 📱 For Mobile Apps

The schema supports **both mobile applications**:

### Mobile Firetruck App (`mobile-firetruck-expo`)
- Reads from: **firetrucks** (current truck), **alarms** (active incidents)
- Writes to: **firetrucks** (location updates), **firetruck_location_history** (tracking)
- Updates: Current position, speed, heading in real-time

### Mobile End-User App (`End-User-Mobile-Proteksyon`)
- Reads from: **fire_stations** (nearest stations), **firetrucks** (truck locations)
- Writes to: **users** (self-register), **alarms** (emergency call), **incident_reports** (description)
- Features: Map view, emergency call, status tracking

---

## 🌐 For Web Apps

### Admin Portal (`BFP_Stations-main/BFP_ADMIN`)
- Reads: All tables (dashboard view)
- Writes: **alarms**, **incident_reports**, **alarm_response_log**
- Features: Incident creation, dispatch, status updates

### Substation Portal (`BFP_Stations-main/Substation_admin`)
- Reads: **fire_stations**, **users**, **alarms**, **firetrucks**
- Writes: **alarms** (local + received), **alarm_response_log**
- Features: Receive incidents, local dispatch, equipment status

---

## 🔄 Data Flow Examples

### Example 1: Emergency Call Creation
```
End-User Mobile App
  ↓
  POST /api/create-incident { lat, lng, phone, incident_type }
  ↓
Backend
  ├─ INSERT users (if not exists)
  ├─ INSERT alarms (new incident)
  ├─ INSERT alarm_response_log (action: "Initial Dispatch")
  └─ Broadcast via Socket.IO
  ↓
Web Admin Portal + All Substations
  └─ Receive incident in real-time
  ├─ PATCH alarms (assign station/truck)
  └─ INSERT alarm_response_log (action: "Dispatched")
```

### Example 2: Firetruck Tracking
```
Mobile Firetruck App
  ├─ Every 5-10 seconds
  ├─ PATCH firetrucks (update current_latitude/longitude)
  └─ INSERT firetruck_location_history (archive position)
  ↓
Web Admin Dashboard
  └─ SELECT firetrucks (live locations on map)
```

---

## 🐛 Troubleshooting

### Error: "relation does not exist"
- Run the full schema again to ensure all tables created
- Check table names match: `users`, `fire_stations`, `firetrucks`, etc.

### Error: "violates foreign key constraint"
- Ensure parent records exist first
- Example: Create fire_station before assigning user to it

### Error: "permission denied (RLS)"
- Check RLS policies are enabled (they should be from the schema)
- Temporarily disable RLS for testing: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`

### Slow queries?
- Check indexes are created: `\d+ table_name` in psql
- Add more indexes if needed on frequently queried columns

---

## 📞 Support

If you need help:
1. Check the [Supabase Docs](https://supabase.com/docs)
2. Review migration files in `backend/migrations/`
3. Check backend routes in `backend/routes/` for usage examples

---

## ✅ Checklist Before Going Live

- [ ] All 8 tables created and visible in Table Editor
- [ ] Sample data inserted successfully
- [ ] Can INSERT/SELECT/UPDATE via API
- [ ] Web admin portal can create incidents
- [ ] Mobile app can see fire stations & trucks
- [ ] Real-time updates working (Socket.IO)
- [ ] RLS policies reviewed (implement stricter policies)
- [ ] Backups configured in Supabase settings
- [ ] Environment variables updated in all apps
- [ ] Load testing completed

---

**You're all set! 🎉 Your database is ready for both web and mobile apps.**
