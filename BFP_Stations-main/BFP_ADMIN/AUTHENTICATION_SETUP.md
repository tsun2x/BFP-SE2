# BFP Emergency System - Authentication Setup Guide

## Authorization System Overview

This project now includes a complete authorization system that:
- ✅ Shows **login page only** for unauthenticated users
- ✅ Protects all dashboard routes - users are redirected to login if not authenticated
- ✅ Connects to MySQL database for credential validation
- ✅ Uses JWT tokens for session management
- ✅ Includes sign-up functionality for new users

## Database Setup

### 1. Create the Database

Run the main SQL file to create the database and tables:

```bash
mysql -u root -p < bfp_emergency_system.sql
```

### 2. Apply Authentication Migrations

After the database is created, apply the authentication migration to add the necessary columns:

```bash
mysql -u root -p bfp_emergency_system < backend/migrations/001_add_auth_columns.sql
```

This migration:
- Adds `id_number` column (unique identifier for BFP officers)
- Adds `first_name`, `last_name`, `rank`, `substation` columns
- Renames `password_hash` to `password` for consistency
- Creates sample test users for development

### Test Credentials

After running the migration, you can login with:

**User 1 (Super Admin):**
- ID Number: `BFP-00001`
- Password: `admin123`
- Role: Admin

**User 2 (Substation Admin):**
- ID Number: `BFP-00002`
- Password: `admin123`
- Role: Substation Admin

**User 3 (Driver):**
- ID Number: `BFP-00003`
- Password: `admin123`
- Role: Driver

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create or update `.env` file in the backend folder:

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=bfp_emergency_system
DB_PORT=3306
PORT=5000
JWT_SECRET=your_jwt_secret_key
```

### 3. Start the Backend Server

```bash
node server.js
```

The server will run on `http://localhost:5000`

## Frontend Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Frontend

```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is in use)

## How the Authorization Works

### 1. **Initial Load**
- When users visit the app, `AuthContext` checks if there's a stored auth token in localStorage
- If no token, user is redirected to `/login`
- If token exists, user is logged in automatically

### 2. **Login Process**
- User enters ID Number and Password
- Frontend sends credentials to `/api/login` endpoint
- Backend validates credentials against the database
- If valid, JWT token is generated and returned
- Token and user info are stored in localStorage
- User is redirected to dashboard

### 3. **Protected Routes**
- All dashboard routes are wrapped with `ProtectedRoute` component
- If user tries to access a protected route without authentication, they're redirected to login
- If user is authenticated, they see the dashboard

### 4. **Logout**
- User info and token are removed from localStorage
- User is redirected to login page

## API Endpoints

### POST `/api/login`
Login with credentials

**Request:**
```json
{
  "idNumber": "BFP-00001",
  "password": "admin123"
}
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "idNumber": "BFP-00001",
    "name": "Admin User",
    "firstName": "Admin",
    "lastName": "User",
    "rank": "Chief Officer",
    "substation": "Central Fire Station"
  }
}
```

### POST `/api/signup`
Register a new user

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "idNumber": "BFP-00004",
  "substation": "Central FSS FT 1",
  "rank": "Fire Officer 2",
  "password": "securePassword123"
}
```

**Response (Success):**
```json
{
  "message": "User registered successfully. Please login."
}
```

## File Structure

```
src/
├── App.jsx                      # Main app with ProtectedRoute wrapper
├── context/
│   ├── AuthContext.jsx         # Authentication context and logic
│   └── StatusContext.jsx        # Existing status context
├── components/
│   └── ProtectedRoute.jsx      # Route protection component
├── pages/
│   ├── login.jsx               # Updated login page
│   ├── signup.jsx              # Updated signup page
│   └── ... (other protected pages)

backend/
├── server.js                   # Main server with auth routes
├── config/
│   └── database.js             # Database connection pool
├── routes/
│   └── authRoutes.js           # Login and signup endpoints
└── migrations/
    └── 001_add_auth_columns.sql # Database migration
```

## Features Implemented

✅ **Authentication Context** - Global state management for auth
✅ **Protected Routes** - Automatic redirect to login for unauthenticated users
✅ **JWT Tokens** - Secure session management
✅ **Password Hashing** - Bcrypt for secure password storage
✅ **Database Integration** - MySQL with connection pooling
✅ **Login Form** - Validates credentials against database
✅ **Signup Form** - Registers new users with validation
✅ **Persistent Sessions** - Users stay logged in after refresh
✅ **Error Handling** - Proper error messages for auth failures

## Troubleshooting

### "Cannot connect to database"
- Check if MySQL is running
- Verify credentials in `.env` file
- Make sure database exists and migration was applied

### "Invalid ID Number or password"
- Verify you're using correct test credentials
- Check if the migration was applied successfully
- Make sure the users table has the auth columns

### "404 /api/login"
- Make sure backend server is running on port 5000
- Check that `authRoutes.js` is imported in `server.js`
- Verify frontend is making requests to `http://localhost:5000`

### CORS errors
- Backend already has CORS enabled
- If still having issues, check browser console for specific error

## Next Steps

1. **Add more roles and permissions** - Implement role-based access control
2. **Add password reset** - Implement forgot password functionality
3. **Add audit logging** - Log all authentication events
4. **Add 2FA** - Two-factor authentication for security
5. **Add user management** - Admin panel to manage users

## Security Considerations

⚠️ **For Production:**
- Use strong JWT secret (update `JWT_SECRET` in `.env`)
- Use HTTPS only
- Implement rate limiting on login endpoint
- Add CSRF protection
- Implement session timeout
- Add password strength validation
- Use secure cookies instead of localStorage for tokens
