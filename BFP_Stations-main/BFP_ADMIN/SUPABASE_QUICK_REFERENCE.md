# Quick Reference - BFP Admin Backend Supabase Integration

## Start the Backend
```bash
cd "c:\3rd_year_files\It_elective_4\to_convert_SE\BFP-SE2\BFP_Stations-main\BFP_ADMIN\backend"
node server.js
```
Server will run on: `http://localhost:5000`

## Start the Frontend (New Terminal)
```bash
cd "c:\3rd_year_files\It_elective_4\to_convert_SE\BFP-SE2\BFP_Stations-main\BFP_ADMIN"
npm install  # First time only
npm run dev
```
Frontend will run on: `http://localhost:5173`

## Available API Endpoints

### Authentication
- `POST /api/login` - Login with ID and password
- `POST /api/signup` - Register new user
- `POST /api/signup-station` - Register fire station
- `PUT /api/update-station` - Update station info (authenticated)
- `GET /api/stations` - List all stations
- `POST /api/verify-password` - Verify password (authenticated)

### Incidents
- `POST /api/create-incident` - Create incident (authenticated)
- `GET /api/incidents` - Get all incidents (authenticated)
- `GET /api/incidents/:alarmId` - Get incident details (authenticated)
- `PATCH /api/incidents/:alarmId/update-alarm-level` - Update alarm level (authenticated)
- `POST /api/enduser/create-alarm` - End-user alarm creation

### Fire Stations
- `GET /api/firestations` - List all stations
- `GET /api/firestations/:id` - Get station details
- `POST /api/firestations` - Create station (admin only)
- `PUT /api/firestations/:id` - Update station (admin only)
- `DELETE /api/firestations/:id` - Delete station (admin only)

### Station Readiness
- `POST /api/station-readiness` - Submit readiness (authenticated)
- `GET /api/station-readiness/:stationId` - Get latest readiness
- `GET /api/stations-readiness-overview` - Get all stations readiness

### Firetruck
- `GET /api/firetrucks/current-alarm?truck_id=X` - Get firetruck's current alarm

### Health
- `GET /api/health` - Check server and database status

## Database Connection
- **Type:** Supabase PostgreSQL
- **URL:** https://gapgayhnovmukfhprhup.supabase.co
- **Client:** `@supabase/supabase-js`
- **Config:** `backend/config/supabase.js`

## Configuration Files
- `.env` - Environment variables
- `config/supabase.js` - Supabase client and helper functions
- `server.js` - Express server with Socket.io
- `routes/` - API endpoint handlers
- `middleware/` - Authentication and role checking

## Debugging

### Check Server Status
```bash
curl http://localhost:5000/api/health
```

### View Server Logs
Watch the terminal where `node server.js` is running

### Check Supabase Connection
- Visit Supabase dashboard: https://app.supabase.com
- Check database tables and data
- Verify Row Level Security (RLS) policies

## Common Queries

### Get all users
```javascript
// In any route file
const users = await supabase.from('users').select('*');
```

### Get user by ID number
```javascript
const user = await db.getUser(idNumber);
```

### Get all incidents with related data
```javascript
const incidents = await db.getAlarms(50);
```

### Create new incident
```javascript
const alarm = await db.createAlarm({
  end_user_id: userId,
  user_latitude: 8.5,
  user_longitude: 123.0,
  initial_alarm_level: 'Alarm 1',
  current_alarm_level: 'Alarm 1',
  status: 'Pending Dispatch'
});
```

## Socket.io Events

### Server emits:
- `new-incident` - When new incident is created
- `incoming-incident` - Sent to specific station

### Server listens for:
- `join-station` - Client joins station room
- `new-incident` - Socket-based incident creation

## Frontend Integration

The frontend (Vite + React) should:
1. Get JWT token from `/api/login`
2. Use token in Authorization header for protected endpoints
3. Listen to Socket.io events for real-time updates
4. Display incidents, stations, and readiness status

## Troubleshooting Checklist

- [ ] Supabase project is accessible
- [ ] Database tables exist with correct schema
- [ ] Foreign key relationships are set up
- [ ] JWT_SECRET in .env is correct
- [ ] SUPABASE_URL and SUPABASE_ANON_KEY are correct
- [ ] Node.js server is running
- [ ] Frontend can reach backend at localhost:5000
- [ ] No CORS errors in browser console

## Performance Tips

- Database queries use relationships for eager loading
- Socket.io broadcasts to specific station rooms
- JWT tokens expire after 24 hours
- Use pagination/limits on large queries

## Security Notes

- Passwords are hashed with bcrypt
- JWT tokens include user role
- Protected routes check authentication
- Row Level Security (RLS) can be configured in Supabase
- Environment variables should not be committed to git

---

**Last Updated:** January 28, 2026
**Backend Status:** ✅ Running
**Database:** ✅ Supabase Connected
