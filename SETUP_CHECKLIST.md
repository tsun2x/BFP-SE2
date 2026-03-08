# ✅ SUPABASE SETUP CHECKLIST

**Project:** BFP Emergency System  
**Date:** February 10, 2026  
**Status:** Ready to Deploy

---

## 📋 Pre-Setup Requirements

- [ ] Supabase account created at [https://supabase.com](https://supabase.com)
- [ ] Project created in Supabase dashboard
- [ ] Note down: **Project URL** and **Anon Key**
- [ ] `.env` files ready to be updated with Supabase credentials
- [ ] All team members have access to Supabase project

---

## 🚀 Database Schema Setup (5 minutes)

### Step 1: Run Main Schema
- [ ] Open Supabase SQL Editor
- [ ] Create New Query
- [ ] Copy content from: `COMPLETE_SUPABASE_SCHEMA.sql`
- [ ] Paste into SQL Editor
- [ ] Click **RUN**
- [ ] Wait for success ✅

### Step 2: Verify Tables Created
In Supabase **Table Editor**, verify these 8 tables exist:
- [ ] `users`
- [ ] `fire_stations`
- [ ] `firetrucks`
- [ ] `alarms`
- [ ] `alarm_response_log`
- [ ] `incident_reports`
- [ ] `station_readiness`
- [ ] `firetruck_location_history`

### Step 3: Test Sample Data
- [ ] Sample users created (admin, substation_admin, driver)
- [ ] Sample fire stations created (Central + 2 Substations)
- [ ] Query sample users: `SELECT * FROM users;`
- [ ] Query sample stations: `SELECT * FROM fire_stations;`
- [ ] All queries return results ✅

---

## 🔐 Security Configuration

### Row Level Security (RLS)
- [ ] RLS enabled on all tables (done in schema)
- [ ] **Development:** Current permissive policies allow all operations ✅
- [ ] **Before Production:** Implement role-based RLS policies

See [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security) for production setup.

---

## 🔧 Environment Variables Setup

### Backend (`backend/.env`)
```env
# Existing variables
NODE_ENV=development
PORT=5000

# Add/Update Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret

# Database (if still using MySQL for legacy features)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=bfp_emergency_db
```

- [ ] Update SUPABASE_URL
- [ ] Update SUPABASE_ANON_KEY
- [ ] Verify backend can connect to Supabase

### Admin Web App (`BFP_Stations-main/BFP_ADMIN/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] Update VITE_SUPABASE_URL
- [ ] Update VITE_SUPABASE_ANON_KEY

### Substation Web App (`BFP_Stations-main/Substation_admin/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] Update VITE_SUPABASE_URL
- [ ] Update VITE_SUPABASE_ANON_KEY

### Mobile Firetruck App (`mobile-firetruck-expo/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

- [ ] Update EXPO_PUBLIC_SUPABASE_URL
- [ ] Update EXPO_PUBLIC_SUPABASE_ANON_KEY
- [ ] Update IP address for local network (use your PC's LAN IP)

### Mobile End-User App (`End-User-Mobile-Proteksyon/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

- [ ] Update EXPO_PUBLIC_SUPABASE_URL
- [ ] Update EXPO_PUBLIC_SUPABASE_ANON_KEY
- [ ] Update IP address for local network

---

## 🧪 Connection Testing

### Test 1: Backend to Supabase
```bash
cd backend
npm install
node server.js
```

Check logs for:
```
Supabase connection configured successfully.
```

- [ ] Backend starts without errors
- [ ] Supabase connection successful

### Test 2: API Endpoint
```bash
curl http://localhost:5000/api/health
```

Expected output:
```json
{"status":"OK","database":"Connected"}
```

- [ ] Health check returns OK

### Test 3: User Login
Use Postman or curl:
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9991234567",
    "password": "your_password_here"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "user_id": 1,
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

- [ ] Login successful and JWT token returned

### Test 4: Query Incidents
```bash
curl -X GET http://localhost:5000/api/incidents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

- [ ] Returns incident list (may be empty if no incidents created yet)
- [ ] No authentication errors

---

## 🌐 Web App Testing

### Admin Portal
1. [ ] Start dev server: `npm run dev` in `BFP_ADMIN`
2. [ ] Open http://localhost:5173
3. [ ] Login with: Phone: `9991234567`, Password: (from schema comment or reset)
4. [ ] Verify dashboard loads
5. [ ] Can see buttons for creating incidents
6. [ ] Map displays
7. [ ] No console errors

### Substation Portal
1. [ ] Start dev server: `npm run dev` in `Substation_admin`
2. [ ] Open http://localhost:5174
3. [ ] Login with: Phone: `9995556666`
4. [ ] Verify dashboard loads
5. [ ] Can view incident list (empty or populated)
6. [ ] No console errors

---

## 📱 Mobile App Testing

### Firetruck App
```bash
cd mobile-firetruck-expo
npm install
npx expo start
```

- [ ] Starts successfully
- [ ] Can log in (use driver account)
- [ ] Map displays truck location
- [ ] Real-time location updates work (check DB updates every 10 seconds)

### End-User App
```bash
cd End-User-Mobile-Proteksyon
npm install
npx expo start
```

- [ ] Starts successfully
- [ ] Can see fire stations on map
- [ ] Can create emergency call
- [ ] Location tracking works

---

## 🔄 End-to-End Flow Testing

### Scenario 1: Complete Incident Workflow
1. **End-User Mobile App**
   - [ ] Opens emergency call page
   - [ ] Clicks on map to set location
   - [ ] Enters phone number, incident type
   - [ ] Submits incident

2. **Check Database**
   - [ ] New entry in `alarms` table
   - [ ] New entry in `alarm_response_log` table
   - [ ] Entry in `users` table for caller (if new)

3. **Admin Portal**
   - [ ] Real-time notification received via Socket.IO
   - [ ] Incident appears in incident list
   - [ ] Can assign truck/station
   - [ ] Can update alarm level
   - [ ] Can mark as resolved

4. **Database Verification**
   - [ ] `alarms.status` updated to "Dispatched"
   - [ ] `alarms.dispatch_time` recorded
   - [ ] New entries in `alarm_response_log`

---

### Scenario 2: Truck Location Tracking
1. **Firetruck Mobile App**
   - [ ] Driver logs in
   - [ ] App continuously updates location (every 10 seconds)

2. **Check Database**
   - [ ] `firetrucks.current_latitude/longitude` updated
   - [ ] `firetrucks.last_location_update` recent
   - [ ] New entries in `firetruck_location_history`

3. **Admin Portal**
   - [ ] Can see truck positions on map
   - [ ] Positions update in real-time

---

## 🛠️ Troubleshooting Checklist

### Issue: "relation does not exist"
- [ ] Check SQL schema ran completely without errors
- [ ] Verify all tables in Table Editor
- [ ] Rerun schema if tables missing

### Issue: "permission denied (RLS)"
- [ ] Verify RLS policies created (check SQL editor history)
- [ ] Temporarily disable RLS for testing: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`
- [ ] Ensure anon key has proper permissions in Supabase Settings

### Issue: "connection refused" from backend
- [ ] Verify SUPABASE_URL is correct (no trailing slash)
- [ ] Verify SUPABASE_ANON_KEY is correct
- [ ] Check internet connection to Supabase servers
- [ ] Try testing connection in Supabase SQL editor first

### Issue: "Invalid JWT token" on API calls
- [ ] Ensure token is fresh (< 1 hour old)
- [ ] Check Authorization header format: `Bearer YOUR_TOKEN`
- [ ] Verify JWT_SECRET in backend matches token generation

### Issue: Slow queries
- [ ] Check if indexes created properly: `\d+ table_name` in SQL editor
- [ ] Verify no large scans without WHERE clause
- [ ] Consider pagination for large result sets

---

## 📊 Monitoring & Maintenance

### Weekly Checks
- [ ] Monitor Supabase usage (go to Project Settings → Usage)
- [ ] Check database size
- [ ] Review error logs in Supabase dashboard

### Monthly Maintenance
- [ ] Review and clean up old test data
- [ ] Check RLS policies are working as intended
- [ ] Verify backups are configured
- [ ] Review query performance

### Before Production
- [ ] [ ] Load test with realistic incident volume
- [ ] [ ] Set up proper RLS policies (not allow-all)
- [ ] [ ] Enable database backups (auto-backup enabled by default)
- [ ] [ ] Configure monitoring alerts
- [ ] [ ] Review security settings
- [ ] [ ] Test disaster recovery procedures

---

## 📞 Quick Reference

### Supabase Dashboard
- **URL:** [https://app.supabase.com](https://app.supabase.com)
- **Project Settings:** Top right → Project Settings
- **SQL Editor:** Left sidebar → SQL Editor
- **Table Editor:** Left sidebar → Table Editor
- **Usage Stats:** Left sidebar → Usage

### Important Files
- **Schema:** `COMPLETE_SUPABASE_SCHEMA.sql`
- **Setup Guide:** `SUPABASE_SETUP_INSTRUCTIONS.md`
- **Query Examples:** `DATABASE_QUERY_EXAMPLES.md`
- **Migration Files:** `backend/migrations/*.sql`

### Documentation
- [Supabase Official Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎉 Final Verification

When all items are checked, your system is ready!

**Before Going Live:**
- [ ] All 8 tables created and tested
- [ ] Sample data inserted and queryable
- [ ] Web apps (Admin + Substation) working
- [ ] Mobile apps (Firetruck + End-User) working
- [ ] Real-time Socket.IO communication working
- [ ] End-to-end incident workflow tested
- [ ] Truck location tracking tested
- [ ] No console errors in any app
- [ ] Environment variables configured in all apps
- [ ] Team members trained on database structure
- [ ] Backups configured
- [ ] Documentation reviewed

---

**Status:** ✅ READY TO DEPLOY

**Last Updated:** February 10, 2026  
**Created by:** Development Team  
**Database Version:** PostgreSQL (Supabase)
