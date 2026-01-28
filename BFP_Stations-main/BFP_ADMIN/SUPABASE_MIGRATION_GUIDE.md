# Supabase Migration Guide - BFP Admin Backend

## Status: In Progress

Your BFP Admin backend is being migrated from MySQL to Supabase. Here's what's been done and what remains.

## ✅ Completed

1. **Environment Setup**
   - Updated `.env` with Supabase credentials
   - Removed MySQL configuration

2. **Supabase Client Configuration**
   - Created `config/supabase.js` with query helpers
   - Helper functions for common operations (users, alarms, stations, firetrucks)

3. **Server.js Updates**
   - Replaced MySQL pool with Supabase client
   - Updated Socket.io incident creation to use Supabase
   - Updated health check endpoint

4. **Dependencies**
   - Installed `@supabase/supabase-js`

## 📋 Remaining Tasks

### 1. Update Route Files

The following files need to be updated to use Supabase queries instead of MySQL:

#### authRoutes.js
- `/login` - Convert MySQL query to Supabase
- `/signup` - Convert INSERT query to Supabase
- `/signup-station` - Convert complex queries to Supabase
- Any other auth endpoints

#### incidentRoutes.js
- `/create-incident` - ✅ Mostly done, needs testing
- `/incidents` - Convert SELECT with JOINs
- `/incidents/:alarmId` - Convert SELECT to Supabase
- Any dispatch/update endpoints

#### fireStations.js
- Station CRUD operations
- Station readiness endpoints
- Location updates

#### readinessRoutes.js
- Readiness status updates
- Readiness queries

#### firetruckRoutes.js
- Firetruck location updates
- Firetruck status queries
- Current alarm assignments

### 2. Database Schema Requirements

Ensure your Supabase database has these tables with proper relationships:

**Tables needed:**
- `users` - BFP staff and end users
- `fire_stations` - Fire station information
- `firetrucks` - Firetruck data
- `alarms` - Emergency incident records
- `alarm_response_log` - Incident action history
- `station_readiness` - Station readiness status (if exists)

**Key relationships:**
- `alarms.end_user_id` → `users.user_id`
- `alarms.dispatched_station_id` → `fire_stations.station_id`
- `alarms.dispatched_truck_id` → `firetrucks.truck_id`
- `users.assigned_station_id` → `fire_stations.station_id`
- `firetrucks.assigned_station_id` → `fire_stations.station_id`

### 3. Migration Pattern

Here's how to convert MySQL queries to Supabase:

**MySQL:**
```javascript
const [rows] = await connection.query(
  'SELECT * FROM users WHERE id_number = ?',
  [idNumber]
);
```

**Supabase (using helper):**
```javascript
const user = await db.getUser(idNumber);
```

**Supabase (manual query):**
```javascript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id_number', idNumber)
  .single();

if (error) throw error;
```

### 4. Key Differences to Watch For

1. **No placeholders** - Use `.eq()`, `.neq()`, `.lt()`, etc.
2. **JOINs** - Use dot notation: `users!foreign_key(column)`
3. **insertId** - Use `data.id` instead of `insertResult.insertId`
4. **Error handling** - Check for `PGRST116` (no rows found)
5. **Transactions** - Use RPC functions if needed

### 5. Testing

After updates:
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"idNumber":"123","password":"test"}'

# Test incident creation
curl -X POST http://localhost:5000/api/create-incident \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 6. Helper Functions Available

From `config/supabase.js`:

```javascript
// Users
await db.getUser(idNumber)
await db.getUserById(userId)
await db.createUser(userData)

// Alarms/Incidents
await db.createAlarm(alarmData)
await db.getAlarms(limit)
await db.getAlarmById(alarmId)
await db.updateAlarm(alarmId, updates)

// Logging
await db.logAlarmResponse(logData)

// Fire Stations
await db.getStation(stationId)
await db.getStations()
await db.createStation(stationData)
await db.updateStation(stationId, updates)

// Firetrucks
await db.getFiretruck(truckId)
await db.getFiretrucksByStation(stationId)
await db.updateFiretruck(truckId, updates)
```

### 7. Next Steps

1. Update `authRoutes.js` first (login/signup)
2. Update `incidentRoutes.js` 
3. Update `fireStations.js`
4. Update `readinessRoutes.js`
5. Update `firetruckRoutes.js`
6. Test all endpoints
7. Deploy

## Useful References

- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript)
- [Supabase Query Guide](https://supabase.com/docs/guides/api)
- Current config: `config/supabase.js`
- Environment: `.env`
