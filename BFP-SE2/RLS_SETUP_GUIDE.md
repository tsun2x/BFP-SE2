# How to Apply RLS Policies to Supabase

## Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Sign in to your account
3. Open your BFP Emergency System project

## Step 2: Execute the RLS SQL Policy Script

### Option A: Using SQL Editor (Recommended)
1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire content from `backend/migrations/005_setup_rls_policies.sql`
4. Paste it into the query editor
5. Click **Run** button (or press Ctrl+Enter)
6. Wait for it to complete - you should see a success message

### Option B: Copy-Paste Individual Policies
If Option A doesn't work, you can manually enable RLS:

#### For Each Table:
1. Go to **Tables** in the left sidebar
2. Click each table name:
   - `users`
   - `fire_stations`
   - `incidents`
   - `station_readiness`
   - `firetrucks`
   - `alarms`
3. Click the **RLS** button (toggle in the top right)
4. Set it to **ON**
5. For each table, click **New Policy** and create:
   - SELECT: Allow all
   - INSERT: Allow all
   - UPDATE: Allow all
   - DELETE: Allow all

## Step 3: Verify Policies are Applied

1. Go to Supabase **Tables** section
2. Click on each table name
3. You should see a **green lock icon** 🔒 next to the table name
4. Click the lock icon to see the policies

## Step 4: Test the Backend

Restart your backend server and test:

```bash
cd backend
node server.js
```

Then try logging in from the admin app. You should see:
- ✅ No more 401 (Unauthorized) errors
- ✅ No more "Database error" messages
- ✅ Login should work successfully

## Troubleshooting

### If you still get 401 errors:
1. Make sure RLS is **enabled** on all tables (green lock icon)
2. Make sure policies allow **SELECT, INSERT, UPDATE, DELETE**
3. Check that you're using the correct Supabase **anon key** in your `.env` file

### If you get "Table does not exist":
1. The RLS script only works on existing tables
2. Make sure your database schema is fully created
3. Run the migration files first if you haven't already

### To disable RLS temporarily (for testing):
1. In Supabase, click the green lock icon next to the table
2. Click **Disable RLS** (if you're sure you want to)
3. This removes security but allows all access

## Production Note
⚠️ The policies above allow anonymous access to everything. For **production**:
- Implement row-level security based on user roles
- Consider using service_role key for the backend instead
- Restrict access by `user_id`, `station_id`, etc.

---

**Need help?** Check the Supabase RLS documentation:
https://supabase.com/docs/guides/auth/row-level-security
