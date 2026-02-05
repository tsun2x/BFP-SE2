# Quick Start Guide - Bidirectional Incident Sharing

## 🚀 Start Everything in 3 Steps

### Step 1: Start Backend (Terminal 1)
```bash
cd BFP_ADMIN/backend
node server.js
```
**Expected:** `Server is running on http://localhost:5000`

### Step 2: Start Admin Frontend (Terminal 2)
```bash
cd BFP_ADMIN
npm run dev
```
**Expected:** `VITE v... ready in ... ms` and URL like `http://localhost:5173`

### Step 3: Start Substation Frontend (Terminal 3)
```bash
cd Substation_admin
npm run dev
```
**Expected:** `VITE v... ready in ... ms` and URL like `http://localhost:5174`

---

## 🔐 Login Test Accounts

### Pre-existing Users (if available):
- ID Number: `123456` | Password: `password123`
- ID Number: `654321` | Password: `securepass`

### Or Create New Account:
1. Click "Sign Up" on either app
2. Fill: First Name, Last Name, ID Number, Password, Confirm Password
3. Select Substation and Rank (if available)
4. Click "Sign Up"
5. Login with new credentials

---

## ✅ Test: Bidirectional Incident Sharing

### Test A: Admin → Substation

**In Admin App:**
1. Login
2. Navigate to "Incident Report"
3. Click on map to select location (red marker appears)
4. Fill form:
   - First Name: "John"
   - Last Name: "Doe"
   - Phone: "09171234567"
   - Incident Type: "Fire"
   - Alarm Level: "Alarm 1"
   - Narrative: "Test incident from admin"
5. Click "Submit Report"
6. Click "Confirm"

**In Substation App:**
- ✅ Should see Toast: "New incident received from admin station"
- ✅ Navigate to Incident Report automatically
- ✅ Form should be pre-filled with incident data
- ✅ Map should show incident location

### Test B: Substation → Admin

**In Substation App:**
1. Login
2. Navigate to "Incident Report"
3. Click on map to select location
4. Fill form with incident data
5. Click "Submit Report"
6. Click "Confirm"

**In Admin App:**
- ✅ Should navigate to Incident Report automatically
- ✅ Form should be pre-filled with incident data
- ✅ Map should show incident location

---

## 🗺️ Map Interaction

### Selecting a Location:
1. Open Incident Report page
2. **Click anywhere on the map**
3. Red marker appears at clicked location
4. Coordinates display below map (e.g., "7.5132°, 122.0124°")
5. Location field auto-fills with coordinates
6. Submit form with selected location

### Default Locations:
- **Admin App:** Manila, Philippines (14.5995°, 120.9842°)
- **Substation App:** Zamboanga City, Philippines (7.5°, 122.0°)

---

## 📱 Browser Console Checks

### In Browser DevTools Console (F12):

#### Socket Connected?
```javascript
// Should see: Connected to socket server [socket-id]
// If not, backend might not be running
```

#### Listen for Incidents?
```javascript
// Open Console when submitting incident
// Should see successful POST request to /api/create-incident
// Should see socket event received in other app
```

#### Check Token?
```javascript
// In Console:
localStorage.getItem('authToken')  // Should return JWT token
localStorage.getItem('user')       // Should return user JSON
```

---

## 🎯 Expected Behavior Checklist

- [ ] **Signup:** Create new user, see success message, user appears in database
- [ ] **Login:** Enter credentials, receive token, logged in successfully
- [ ] **Map Click:** Click map, marker appears, coordinates update
- [ ] **Form Submit:** Fill form, submit, see success toast with Alarm ID
- [ ] **Receive Incident:** Other app receives incident, form prefills automatically
- [ ] **Socket Connection:** Both apps show "Connected to socket server" in console
- [ ] **Toast Notifications:** Success/error messages appear and auto-dismiss
- [ ] **Confirmation Modal:** Clicking submit shows confirmation dialog
- [ ] **Location Persistence:** Selected location saves with incident
- [ ] **Token Persistence:** Reloading page keeps user logged in

---

## ❌ Troubleshooting

### Backend not starting?
```bash
# Check if port 5000 is in use
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Then restart:
node server.js
```

### Socket not connecting?
- Check backend is running on port 5000
- Check browser console for errors
- Verify network tab shows no 404s
- Try hard refresh (Ctrl+Shift+R)

### Login failing?
- Verify user ID Number is correct
- Check password matches (case-sensitive)
- Try creating new user via signup
- Check MySQL database is running

### Map not showing?
- Check internet connection (tiles from CDN)
- Verify MapTiler API key in MapContainer.jsx
- Check browser console for CORS errors
- Try different browser

### Incident not syncing?
- Verify both apps connected to same backend (port 5000)
- Check browser console for socket events
- Verify incident form has required fields (phone + location)
- Try submitting from other app to verify socket works both ways

---

## 📊 Database Verification

### Check Created Users:
```sql
USE bfp_emergency_system;
SELECT id_number, full_name, phone_number, role, created_at 
FROM users 
WHERE role IN ('substation_admin', 'admin')
ORDER BY created_at DESC
LIMIT 10;
```

### Check Created Incidents:
```sql
SELECT a.alarm_id, u.full_name, a.user_latitude, a.user_longitude, 
       a.initial_alarm_level, a.status, a.call_time
FROM alarms a
JOIN users u ON a.end_user_id = u.user_id
ORDER BY a.call_time DESC
LIMIT 10;
```

---

## 🔗 App URLs

Once running, access at:
- **Admin App:** http://localhost:5173
- **Substation App:** http://localhost:5174
- **Backend API:** http://localhost:5000/api
- **Backend Health:** http://localhost:5000/api/health

---

## 📞 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "EADDRINUSE" port 5000 | Kill process on port 5000 or use different port |
| Socket won't connect | Check backend running, verify URL in App.jsx |
| Login returns 500 error | Check MySQL running, verify database exists |
| Map won't load | Check internet, verify MapTiler API key valid |
| Form won't submit | Check phone number and location both filled |
| Toast not showing | Check import '../style/toast.css' in Toast.jsx |
| Incident not syncing | Check socket "Connected" message in console |

---

## ✨ Pro Tips

1. **Open DevTools Network Tab** to watch API calls in real-time
2. **Open DevTools Console** to see socket events as they happen
3. **Side-by-side browsers** makes testing incident sharing much easier
4. **Test with different data** to verify incident fields are captured correctly
5. **Check localStorage** to debug token persistence

---

## 🎉 You're All Set!

Follow the 3 steps above to start all services, then test bidirectional incident sharing between the two apps. Check the console for any errors and verify the database entries are created successfully.

**Happy Testing!**
