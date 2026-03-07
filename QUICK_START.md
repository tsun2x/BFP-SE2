# 🚀 Quick Start Guide - BFP Emergency System

## Prerequisites

- Node.js installed
- MySQL running (XAMPP or standalone)
- Database: `bfp_emergency_system` created and populated

---

## 1️⃣ Start Backend (Node.js)

```bash
cd backend
npm install  # if not done yet
node server.js
```

Expected output:
```
Database connection established successfully.
Server is running on http://localhost:5000
```

✅ Backend is now running on **http://localhost:5000**

---

## 2️⃣ Start Web Admin

In a new terminal:

```bash
cd BFP_Stations-main/BFP_ADMIN
npm install  # if not done yet
npm run dev
```

Expected output:
```
➜  local:   http://localhost:5173/
➜  press h to show help
```

✅ Web admin is now running on **http://localhost:5173**

---

## 3️⃣ Login to Web Admin

Open browser: **http://localhost:5173**

You should see the **LOGIN PAGE** first ✓

Use credentials from your database:

| Field | Value |
|-------|-------|
| **ID Number** | BFP-00013 |
| **Password** | (from your database) |

After login → Dashboard appears ✓

---

## 4️⃣ Test Token Persistence

1. ✅ You're logged in on dashboard
2. Press **F5** (refresh page)
3. Should still be on dashboard (no login needed) ✅
4. Check LocalStorage (DevTools → Application):
   - `authToken` - Contains JWT
   - `user` - Contains officer data

---

## 5️⃣ Run Mobile Apps (Optional)

### End-User Mobile App

```bash
cd End-User-Mobile-Proteksyon-main
npm install
npx expo start
```

### Firetruck Driver Mobile App

```bash
cd mobile-firetruck-expo
npm install
npx expo start
```

---

## Configuration

### If Backend is on Different IP/Port

**Web Admin:** Edit `BFP_Stations-main/BFP_ADMIN/.env`
```env
VITE_API_URL=http://your-ip:5000/api
```

**Mobile Apps:** Edit config files
```typescript
// End-User: src/config.ts
export const API_URL = 'http://your-ip:5000';

// Firetruck: src/config.ts
export const API_URL = 'http://your-ip:5000';
```

---

## Verify Everything Works

### ✅ Backend Health

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "Connected to MySQL"
}
```

### ✅ Web Admin Loads

```
http://localhost:5173
```
Should show login page (no errors in console)

### ✅ Login Works

Use valid credentials from database
Should redirect to dashboard

### ✅ Token Persists

- Login
- Press F5
- Still logged in (no redirect to login)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check MySQL is running, port 5000 is free |
| "Cannot GET /" | Wrong port or backend not running |
| Login fails | Check ID and password in database, ensure role is 'admin' or 'substation_admin' |
| CORS error | Backend not running on http://localhost:5000 |
| Token cleared on refresh | Check browser localStorage not disabled |

---

## Key Files

```
BFP_FINAL/
├── backend/
│   ├── server.js ← Start this first
│   ├── routes/
│   │   ├── authRoutes.js (Login/Signup)
│   │   ├── compatibilityRoutes.js (Mobile endpoints)
│   │   ├── incidentRoutes.js (Create incidents)
│   │   └── readinessRoutes.js (Station readiness)
│   └── .env (Database config)
│
├── BFP_Stations-main/BFP_ADMIN/
│   ├── src/
│   │   ├── context/AuthContext.jsx (JWT handling)
│   │   ├── pages/login.jsx (Login page)
│   │   └── components/ProtectedRoute.jsx (Auth check)
│   └── .env (Backend URL)
│
├── JWT_AUTHENTICATION_GUIDE.md ← Full documentation
└── MIGRATION_COMPLETE.md ← Migration summary
```

---

## Next Steps

1. ✅ Backend running - `node backend/server.js`
2. ✅ Web admin running - `npm run dev` in BFP_ADMIN
3. ✅ Login works - JWT token saved
4. ✅ Refresh persists token - Still logged in
5. 🔄 Test incident creation - See real-time updates

---

## Live Testing

### Test Incident Creation

1. Login to web admin
2. Go to "Incident Report" page
3. Fill form and submit
4. Other connected clients see real-time update (Socket.IO)
5. Check database for new alarm record

### Test Firetruck Tracking

1. Login firetruck driver app
2. Start tracking (if button exists)
3. Real-time location updates
4. Other apps see truck on map

---

## Production Checklist

- [ ] Change JWT secret in `backend/.env`
- [ ] Use HTTPS URLs instead of HTTP
- [ ] Update CORS to allow only your domain
- [ ] Configure appropriate timeouts
- [ ] Set up proper error logging
- [ ] Test with multiple concurrent users
- [ ] Backup database regularly

---

**Status:** ✅ Ready to use

**Need help?** Check the detailed docs:
- `JWT_AUTHENTICATION_GUIDE.md` - Token persistence
- `MIGRATION_COMPLETE.md` - Backend migration
- Backend logs for detailed error info

---

**Happy coding! 🎉**
