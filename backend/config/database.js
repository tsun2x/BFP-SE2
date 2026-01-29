import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create a wrapper to mimic MySQL pool interface for backwards compatibility
export const pool = {
  query: async (sql, params = []) => {
    // Simple SQL to Supabase adapter
    console.log('Query:', sql.substring(0, 50) + '...')
    throw new Error('Direct SQL queries not supported with Supabase. Use supabase client instead.')
  },
  getConnection: async () => ({
    query: async () => {
      throw new Error('Direct SQL queries not supported with Supabase. Use supabase client instead.')
    },
    release: () => {}
  })
}

console.log('Supabase connection configured successfully.')
