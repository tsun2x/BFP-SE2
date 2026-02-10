import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
  throw new Error('Missing Supabase URL or keys in environment variables');
}

// Prefer the service role key for backend operations when available (keeps RLS bypass capability).
// IMPORTANT: Never commit the service role key to source control. Keep it only in the server's .env.
const clientKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, clientKey);
