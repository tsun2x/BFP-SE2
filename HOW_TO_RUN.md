## 🚀 HOW TO RUN THE BFP EMERGENCY SYSTEM

### Step 1: Install Dependencies

**Terminal 1 - Backend:**
```bash
cd BFP-SE2
cd backend
npm install
```

**Terminal 2 - Frontend:**
```bash
cd BFP-SE2
cd BFP_Stations-main/BFP_ADMIN
npm install
```

---

### Step 2: Start the Backend (Terminal 1)

```bash
cd BFP-SE2/backend
node server.js
```

**Expected Output:**
```
Supabase connection configured successfully.
Server is running on http://localhost:5000
```

✅ If you see this, backend is working!

---

### Step 3: Start the Frontend (Terminal 2)

```bash
cd BFP-SE2/BFP_Stations-main/BFP_ADMIN
npm run dev
```

**Expected Output:**
```
VITE v7.2.2  ready in XXX ms

➜  Local:   http://localhost:5173/
```

✅ If you see this, frontend is ready!

---

### Step 4: Open in Browser

Go to: **http://localhost:5173/**

---

### Step 5: Login

Use these credentials:

**Main Admin:**
- ID Number: `BFP-00001`
- Password: `Admin123`

**Other Accounts:**
- ID: `BFP-00002` (Substation Admin)
- ID: `BFP-00003` (Driver)

---

## ⚡ QUICK SUMMARY

### Terminal 1 (Backend):
```
cd BFP-SE2/backend
npm install
node server.js
```

### Terminal 2 (Frontend):
```
cd BFP-SE2/BFP_Stations-main/BFP_ADMIN
npm install
npm run dev
```

### Browser:
```
http://localhost:5173
```

### Login:
```
ID: BFP-00001
Password: Admin123
```

---

## ✅ CHECKLIST

- [ ] `npm install` in backend folder
- [ ] `npm install` in BFP_ADMIN folder
- [ ] `node server.js` in backend (Terminal 1)
- [ ] `npm run dev` in BFP_ADMIN (Terminal 2)
- [ ] Open http://localhost:5173 in browser
- [ ] Login with credentials above
- [ ] Done! 🎉

---

## ❌ TROUBLESHOOTING

### "Port 5000 already in use"
Kill the old process:
```bash
taskkill /F /IM node.exe
```
Then restart `node server.js`

### "npm: command not found"
Install Node.js from: https://nodejs.org/

### "Module not found"
Run `npm install` again in both folders

### "Cannot connect to localhost:5000"
Make sure backend Terminal 1 shows:
```
Server is running on http://localhost:5000
```

### Frontend shows login but can't login
Check that backend Terminal 1 is still running and showing no errors

---

## 🎯 WHAT EACH TERMINAL DOES

**Terminal 1 (Backend - Port 5000):**
- Handles all API requests
- Manages database (Supabase)
- Handles authentication

**Terminal 2 (Frontend - Port 5173):**
- Shows the web interface
- Sends requests to backend
- Displays incidents and data

Both must be running for the system to work!

---

## 📱 WHAT YOU CAN DO

1. **Create Incidents** - Report emergencies
2. **View Fire Stations** - See all available stations
3. **Track Firetrucks** - Real-time location updates
4. **Manage Users** - Admin controls
5. **Real-time Updates** - See changes instantly

---

**That's it! You're ready to go! 🚀**
