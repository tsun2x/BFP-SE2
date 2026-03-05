import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
