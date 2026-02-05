# BFP Emergency System - Setup Guide

## 🚀 Quick Start

This project uses **Supabase** as the database and **Node.js** as the backend.

### Prerequisites
- Node.js v16 or higher
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd BFP-SE2
   ```

2. **Set up Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Set up Frontend (BFP Admin)**
   ```bash
   cd ../BFP_Stations-main/BFP_ADMIN
   npm install
   ```

### Running the Application

**Terminal 1 - Start Backend (Port 5000)**
```bash
cd backend
node server.js
```

Expected output:
```
Supabase connection configured successfully.
Server is running on http://localhost:5000
```

**Terminal 2 - Start Frontend (Port 5173)**
```bash
cd BFP_Stations-main/BFP_ADMIN
npm run dev
```

Expected output:
```
➜  Local:   http://localhost:5173/
```

### Access the Application

Open your browser and go to:
```
http://localhost:5173/
```

### Login Credentials

**Main Admin Account:**
- **ID Number:** `BFP-00001`
- **Password:** `Admin123`

**Other Test Accounts:**
- **ID:** `BFP-00002` (Substation Admin)
- **ID:** `BFP-00003` (Driver)

## 📊 Database (Supabase)

The `.env` file contains the Supabase credentials for the shared database:

**backend/.env**
```
SUPABASE_URL=https://gapgayhnovmukfhprhup.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=5000
```

**BFP_Stations-main/BFP_ADMIN/.env**
```
VITE_API_URL=http://localhost:5000/api
VITE_STATION_ID=101
```

### ⚠️ Important

The `.env` files are **committed to this repository** for easy team collaboration. This is fine for development/school projects, but **NEVER do this in production** with real credentials!

For production, use environment variables instead.

## 🏗️ Project Structure

```
BFP-SE2/
├── backend/                    # Node.js Express server
│   ├── routes/                # API endpoints
│   ├── middleware/            # Auth & role middleware
│   ├── supabaseClient.js      # Supabase connection
│   ├── server.js              # Main server file
│   └── .env                   # Database credentials
│
├── BFP_Stations-main/
│   ├── BFP_ADMIN/            # Admin Dashboard (React)
│   │   ├── src/              # React components
│   │   └── .env              # Frontend config
│   └── Substation_admin/     # Substation App (React)
│
├── End-User-Mobile-Proteksyon-main/   # Mobile app (Expo/React Native)
└── mobile-firetruck-expo/             # Firetruck tracking (Expo/React Native)
```

## 🔧 Troubleshooting

### Port Already in Use
If port 5000 or 5173 is in use:
```bash
# Find and kill the process
lsof -i :5000  # Find process on port 5000
kill -9 <PID>  # Kill the process
```

### Supabase Connection Error
Check that:
1. `.env` file exists with correct credentials
2. Internet connection is available
3. Supabase project is active

### npm install fails
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📝 API Endpoints

All endpoints are at `http://localhost:5000/api/`

### Authentication
- `POST /login` - Login with ID number and password
- `POST /signup` - Register new user
- `GET /me` - Get current user info

### Fire Stations
- `GET /firestations` - List all stations
- `GET /firestations/:id` - Get specific station

### Incidents
- `POST /create-incident` - Create new incident
- `GET /incidents` - Get all incidents

## 🤝 Team Collaboration

Both team members share the same:
- ✅ Supabase database (same data)
- ✅ Backend code
- ✅ Frontend code
- ✅ .env file (for quick setup)

When your teammate clones the repo, they just need to:
```bash
npm install  # in backend and frontend
npm run dev  # start the apps
```

No additional setup needed!

## 📚 Documentation

- [QUICK_START.md](./QUICK_START.md) - Quick reference
- [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) - Database setup
- [README.md](./README.md) - Project overview

## 🚀 Deployment

When ready to deploy to production:
1. Change all credentials in `.env`
2. Remove `.env` from git
3. Use proper environment variables
4. Update API URLs to your server

---

**Happy coding! 🎉**
