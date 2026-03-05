# Supabase Integration Guide

## Installation Complete ✅

All three projects have been configured with Supabase:

### Backend (Node.js)
- **Installed:** `@supabase/supabase-js`
- **Config file:** `backend/supabaseClient.js`
- **Environment:** `backend/.env` (with Supabase credentials)

**Usage in backend:**
```javascript
import { supabase } from './supabaseClient.js';

// Example: Query a table
const { data, error } = await supabase
  .from('your_table_name')
  .select('*');
```

### Mobile Apps (Expo React Native)

#### Firetruck App
- **Installed:** `@supabase/supabase-js`
- **Config file:** `mobile-firetruck-expo/src/utils/supabaseClient.ts`
- **Environment:** `mobile-firetruck-expo/.env`

#### End-User App
- **Installed:** `@supabase/supabase-js`
- **Config file:** `End-User-Mobile-Proteksyon-main/src/utils/supabaseClient.ts`
- **Environment:** `End-User-Mobile-Proteksyon-main/.env`

**Usage in mobile apps:**
```typescript
import { supabase } from '@/utils/supabaseClient';

// Example: Query a table
const { data, error } = await supabase
  .from('your_table_name')
  .select('*');
```

## Credentials
- **URL:** `https://gapgayhnovmukfhprhup.supabase.co`
- **Key:** Already configured in `.env` files

## Next Steps

1. **Create tables in Supabase Dashboard** - Go to your project and create tables for:
   - Fire stations
   - Incidents
   - Users
   - Firetrucks
   - Location data
   - etc.

2. **Enable Row Level Security (RLS)** - Secure your data by setting up RLS policies

3. **Set up Authentication** - Use Supabase Auth for user login/signup instead of JWT if preferred

4. **Test connections** - Run the apps and verify they can connect to Supabase

## Useful Supabase Features

- **Real-time subscriptions:** Listen to database changes in real-time
```typescript
supabase
  .from('firetrucks')
  .on('*', payload => {
    console.log('Change received!', payload)
  })
  .subscribe();
```

- **Storage:** Upload/download files like photos, documents
- **Functions:** Run serverless functions (if needed)
- **Auth:** Built-in authentication system

## Documentation
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Database Guide](https://supabase.com/docs/guides/database)
