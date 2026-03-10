import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function extractProjectRefFromUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname || '';
    // Expected: <ref>.supabase.co
    const parts = host.split('.');
    return parts.length >= 3 ? parts[0] : null;
  } catch (_) {
    return null;
  }
}

function extractProjectRefFromJwt(jwt) {
  try {
    const parts = String(jwt || '').split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed?.ref || null;
  } catch (_) {
    return null;
  }
}

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const urlRef = extractProjectRefFromUrl(supabaseUrl);
const anonRef = extractProjectRefFromJwt(supabaseAnonKey);
if (urlRef && anonRef && urlRef !== anonRef) {
  console.warn(
    `[Supabase Config] WARNING: SUPABASE_URL project ref (${urlRef}) does not match SUPABASE_ANON_KEY ref (${anonRef}). Email OTP can fail with otp_disabled when these are from different projects.`
  );
}

const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseAnon = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

console.log(
  'Supabase client configured. Using service role key:',
  Boolean(supabaseServiceRoleKey)
);

// Optional helper functions for common queries
export const db = {
  async getUser(idNumber) {
    if (idNumber && idNumber.startsWith('BFP-')) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id_number', idNumber)
        .single();
      if (data) return data;
      if (error && error.code !== 'PGRST116') throw error;
    }
    const { data: data2, error: error2 } = await supabase
      .from('users')
      .select('*')
      .eq('email', `${idNumber}@bfp.internal`)
      .single();
    if (error2 && error2.code !== 'PGRST116') throw error2;
    return data2;
  },

  async getUserById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Add more helpers as needed (alarms, stations, firetrucks, etc.)
};

console.log('Supabase client and helpers configured successfully.');
