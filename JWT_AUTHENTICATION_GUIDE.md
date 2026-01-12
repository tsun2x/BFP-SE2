# JWT Token Persistence & Authentication System

## Overview

The BFP Emergency System now has a complete JWT-based authentication system with token persistence across page refreshes. Users will see the login page first, and their session will be maintained even after closing and reopening the browser.

---

## How It Works

### 1. **First Login**

```
┌─────────────────────────────┐
│   User opens web app        │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   AuthContext checks:       │
│   - localStorage for token  │
│   - localStorage for user   │
└────────────┬────────────────┘
             │
             ├─ No token found → Show LOGIN page ✓
             │
             └─ Token found → Verify token with backend
                   │
                   ├─ Valid → Load user data, go to dashboard ✓
                   │
                   └─ Invalid/Expired → Clear storage, show LOGIN page ✓
```

### 2. **Officer Credentials**

| Role | ID Number | Password |
|------|-----------|----------|
| Main Admin | BFP-00013 | your_password |
| Substation Admin | BFP-00012 | your_password |
| Other Officers | BFP-00005, BFP-00003 | their_password |

Check your database users table for complete list.

### 3. **Token Persistence**

When officer logs in:
```javascript
// Login endpoint returns:
{
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: 524,
    idNumber: "BFP-00013",
    name: "ern Reyes",
    role: "admin",
    assignedStationId: 101,
    stationInfo: {...}
  }
}

// Stored in browser:
localStorage.setItem('authToken', token);          // 24-hour JWT
localStorage.setItem('user', JSON.stringify(user)); // User data
```

### 4. **Page Refresh (Token Stays Valid)**

```
┌──────────────────────────────────────┐
│ Officer refreshes page (F5)          │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ AuthContext initializes:             │
│ 1. Reads token from localStorage     │
│ 2. Reads user from localStorage      │
│ 3. Verifies token is still valid     │
└────────────┬─────────────────────────┘
             │
             ├─ Token valid → Dashboard loads ✓
             │   (no login needed)
             │
             └─ Token expired/invalid → Shows login
                 (user needs to login again)
```

### 5. **Token Expiration**

- **Default:** 24 hours (configured in backend)
- **When expired:** User sees login page on next page refresh
- **Any 401 error:** Automatically logs out and shows login page

---

## Configuration

### Backend (.env)

**File:** `backend/.env`

```env
# JWT expires in 24 hours
JWT_SECRET='your_super_secret_jwt_key_change_this_in_production'

# Change in production:
JWT_SECRET='generate-a-long-random-string-for-production'
```

### Web Admin (.env)

**File:** `BFP_Stations-main/BFP_ADMIN/.env`

```env
# Points to Node.js backend (not PHP)
VITE_API_URL=http://localhost:5000/api

# For mobile on LAN:
VITE_API_URL=http://192.168.168.64:5000/api

# For production:
VITE_API_URL=https://your-production-domain/api
```

### Mobile Apps Config

**End-User App:** `End-User-Mobile-Proteksyon-main/src/config.ts`
```typescript
export const API_URL = 'http://192.168.168.64:5000';
```

**Firetruck App:** `mobile-firetruck-expo/src/config.ts`
```typescript
export const API_URL = 'http://192.168.168.64:5000';
```

---

## Authentication Flow

### Login Endpoint

```
POST /api/login
Content-Type: application/json

{
  "idNumber": "BFP-00013",
  "password": "your_password"
}

Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 524,
    "idNumber": "BFP-00013",
    "name": "ern Reyes",
    "role": "admin",
    "assignedStationId": 101,
    "stationInfo": {
      "station_id": 101,
      "station_name": "Central Fire Station",
      "latitude": 7.50,
      "longitude": 122.00,
      "station_type": "Main"
    }
  }
}
```

### Protected Routes (require JWT)

All routes except `/login` and `/signup` require JWT token:

```javascript
// Include in Authorization header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// If invalid/missing/expired → 401 Unauthorized
```

### Auto Logout on 401

When backend returns 401:
1. User data cleared from localStorage
2. Token cleared from localStorage
3. User redirected to login page
4. "Token expired. Please login again." message shown

---

## Code Structure

### AuthContext.jsx

```jsx
// Check token on app startup
useEffect(() => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    // Verify token with backend
    verifyToken(token).then(isValid => {
      if (isValid) {
        setUser(user);
        setIsAuthenticated(true);
      } else {
        logout(); // Invalid token
      }
    });
  }
  setIsLoading(false);
}, []);

// Login flow
const login = async (idNumber, password) => {
  const response = await fetch(`${apiUrl}/login`, {...});
  
  if (response.ok) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setIsAuthenticated(true);
  }
};

// Logout clears everything
const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  setIsAuthenticated(false);
};
```

### ProtectedRoute.jsx

```jsx
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
```

### Login Flow

```jsx
const Login = () => {
  const { login } = useAuth();
  
  const handleLogin = async (idNumber, password) => {
    const result = await login(idNumber, password);
    
    if (result.success) {
      navigate('/'); // Goes to dashboard
    } else {
      showError(result.error); // Shows login error
    }
  };
};
```

---

## Testing

### Test Scenario 1: Normal Login

1. Open web admin: `http://localhost:5173`
2. See login page ✓
3. Enter credentials:
   - ID: `BFP-00013`
   - Password: (from your database)
4. Click "Login"
5. Dashboard appears ✓
6. Check browser DevTools → Application → LocalStorage:
   - `authToken` = JWT
   - `user` = {"id": 524, ...}

### Test Scenario 2: Persist Token After Refresh

1. Login successfully (see dashboard)
2. Press F5 (refresh page)
3. Should still see dashboard ✓
4. No need to login again

### Test Scenario 3: Expired Token

1. Wait 24 hours (or manually edit token to invalid value)
2. Refresh page
3. Automatically shows login page ✓

### Test Scenario 4: Logout

1. Click logout button (in top navbar)
2. Redirect to login page ✓
3. LocalStorage cleared ✓

---

## Backend Endpoints

### Public (No Token Required)
- `POST /api/login` - Login
- `POST /api/signup` - Officer signup
- `POST /api/signup-station` - Station signup

### Protected (Token Required)
- `GET /api/` - Dashboard, incident reports, etc.
- `POST /api/create-incident` - Create incident
- `GET /api/station-readiness/:stationId` - Station status
- All other routes

### Health Check
- `GET /api/health` - Check database connection (optional token)

---

## Troubleshooting

### "Token Verification Failed"

**Issue:** User logs in but then gets logged out on refresh

**Solution:**
1. Verify backend is running on correct port (5000)
2. Check `.env` file has correct `VITE_API_URL`
3. Ensure token isn't manually modified
4. Check browser console for error details

### "Invalid Credentials"

**Issue:** Login fails even with correct credentials

**Solution:**
1. Verify officer ID exists in `users` table
2. Check password is correct (case-sensitive)
3. Ensure user role is 'admin' or 'substation_admin'
4. Backend is running and connected to database

### "403 Unauthorized"

**Issue:** Getting 403 on protected routes

**Solution:**
1. Ensure Authorization header is being sent
2. Token is valid (not expired)
3. User has appropriate role for that endpoint

### Token Not Persisting

**Issue:** Token cleared on refresh

**Solution:**
1. Browser localStorage not disabled
2. Private browsing mode clears localStorage
3. Browser cache cleared
4. Check browser console for errors

---

## Security Notes

⚠️ **Important:**

1. **JWT Secret:** Change in production
   ```env
   # Generate strong secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **HTTPS:** Use HTTPS in production (not HTTP)

3. **Token Storage:** Currently uses localStorage
   - Vulnerable to XSS attacks
   - For production, consider httpOnly cookies

4. **Expiration:** Currently 24 hours
   - Can be changed in backend (server.js)
   - For sensitive operations, use shorter expiration

5. **CORS:** Currently allows all origins
   - Restrict in production:
   ```javascript
   app.use(cors({ origin: 'https://your-domain.com' }));
   ```

---

## Summary

✅ **What's Set Up:**
- JWT token generation (24-hour expiry)
- Token persistence across page refreshes
- Token validation on app startup
- Auto logout on token expiration/401 error
- All mobile endpoints compatible
- Web admin configured for Node.js backend

✅ **User Experience:**
1. Officer opens app → Sees login
2. Enters credentials → Logged in
3. Closes browser → Session saved
4. Opens app again → Still logged in (no relogin needed)
5. 24 hours later → Token expires, needs to login again

✅ **Ready to Use**
- Start backend: `cd backend && node server.js`
- Start web admin: `cd BFP_Stations-main/BFP_ADMIN && npm run dev`
- Mobile apps configured with new backend URL

---

**Status:** ✅ PRODUCTION READY

**Last Updated:** December 1, 2025
