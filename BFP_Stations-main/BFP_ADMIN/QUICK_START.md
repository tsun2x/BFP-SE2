# Quick Start Guide - Authentication System

## ⚡ 5-Minute Setup

### Step 1: Database Setup (One-time)

```bash
# Navigate to project root
cd c:\Users\ERN FRANCIS\OneDrive\Desktop\ReactProject\school\mitz

# Create database and tables
mysql -u root -p < bfp_emergency_system.sql

# Apply authentication migration
mysql -u root -p bfp_emergency_system < backend/migrations/001_add_auth_columns.sql
```

### Step 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies (first time only)
npm install

# Start the server
node server.js
```

Expected output:
```
Database connection established successfully.
Server is running on http://localhost:5000
```

### Step 3: Frontend Setup (New Terminal)

```bash
# Navigate to project root
cd c:\Users\ERN FRANCIS\OneDrive\Desktop\ReactProject\school\mitz

# Install dependencies (first time only)
npm install

# Start the frontend
npm run dev
```

Expected output:
```
  VITE v... ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 4: Test Login

1. Open browser and go to `http://localhost:5173`
2. You should see the login page (NOT the dashboard)
3. Login with test credentials:
   - ID: `BFP-00001`
   - Password: `admin123`
4. You should now see the dashboard

## 🧪 Test the Authorization

### Verify Login Required
1. Go to `http://localhost:5173`
2. Try to access `http://localhost:5173/` (dashboard) directly
3. You should be redirected to login page

### Verify Session Persistence
1. Login with `BFP-00001` / `admin123`
2. Refresh the page (F5 or Ctrl+R)
3. You should stay logged in

### Verify Logout (if implemented)
1. Click logout button (if available)
2. You should be redirected to login page
3. Accessing dashboard should redirect to login

## 📝 Available Test Users

| ID Number | Password | Role | Name |
|-----------|----------|------|------|
| BFP-00001 | admin123 | Admin | Admin User |
| BFP-00002 | admin123 | Substation Admin | John Doe |
| BFP-00003 | admin123 | Driver | Jane Smith |

## 🚀 Create New User

1. Go to Sign Up page
2. Fill in the form:
   - First Name: (any)
   - Last Name: (any)
   - ID Number: `BFP-XXXXX` format
   - Substation: (any)
   - Rank: (any)
   - Password: (min 8 chars, good strength)
3. Click Sign Up
4. Login with new credentials

## 📱 Frontend Structure

All pages are now **protected**:
- `/` → Dashboard
- `/reports` → Reports
- `/emergency-calls` → Emergency Call History
- `/officers` → Officers Login History
- `/incident-report` → Incident Report
- `/branch-status` → Branch Status
- `/settings` → Settings
- `/content-management` → Content Management

**Public pages:**
- `/login` → Login page (always accessible)
- `/signup` → Sign up page (always accessible)

## 🔗 API Endpoints

### Login
```
POST http://localhost:5000/api/login
Content-Type: application/json

{
  "idNumber": "BFP-00001",
  "password": "admin123"
}
```

### Signup
```
POST http://localhost:5000/api/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "idNumber": "BFP-00004",
  "substation": "Station Name",
  "rank": "Fire Officer",
  "password": "securePass123"
}
```

## ❌ Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Cannot connect to database" | Make sure MySQL is running and .env has correct credentials |
| "404 /api/login" | Backend server not running - run `node server.js` in backend folder |
| CORS error | Make sure backend is running on port 5000 |
| "Invalid ID or password" | Use correct test credentials from table above |
| Still seeing dashboard without login | Clear localStorage: Open DevTools → Storage → Clear localStorage |

## 🛠️ Troubleshooting

### Check Backend Status
```bash
# Test if backend is running
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": "Connected to MySQL"
}
```

### Check Frontend
1. Open DevTools (F12)
2. Go to Console tab
3. Check for any red errors
4. Go to Network tab
5. Try login and check if `/api/login` request is successful

### Reset Everything
```bash
# Clear frontend
# Open DevTools → Storage → Clear localStorage

# Restart backend
# Kill terminal and run: node server.js

# Restart frontend
# Kill terminal and run: npm run dev
```

## 📚 Full Documentation

See `AUTHENTICATION_SETUP.md` for detailed documentation about:
- How authorization works
- API endpoint details
- File structure
- Security considerations
- Next steps for production

---

**Happy coding! 🎉**
