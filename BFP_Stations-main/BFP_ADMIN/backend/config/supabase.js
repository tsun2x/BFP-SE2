import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export query helpers for common operations
export const db = {
  // Users
  async getUser(idNumber) {
    // Try searching by id_number first
    if (idNumber && idNumber.startsWith('BFP-')) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id_number', idNumber)
        .single();
      
      if (data) return data;
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    }
    
    // Fallback: search by email pattern
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

  // Alarms/Incidents
  async createAlarm(alarmData) {
    const { data, error } = await supabase
      .from('alarms')
      .insert([alarmData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAlarms(limit = 50) {
    const { data, error } = await supabase
      .from('alarms')
      .select(`
        alarm_id,
        end_user_id,
        users!end_user_id (full_name, phone_number),
        user_latitude,
        user_longitude,
        initial_alarm_level,
        current_alarm_level,
        status,
        call_time,
        dispatch_time,
        resolve_time,
        dispatched_station_id,
        fire_stations!dispatched_station_id (station_name),
        dispatched_truck_id,
        firetrucks!dispatched_truck_id (plate_number)
      `)
      .order('call_time', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getAlarmById(alarmId) {
    const { data, error } = await supabase
      .from('alarms')
      .select(`
        *,
        users!end_user_id (full_name, phone_number),
        fire_stations!dispatched_station_id (station_name),
        firetrucks!dispatched_truck_id (plate_number)
      `)
      .eq('alarm_id', alarmId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateAlarm(alarmId, updates) {
    const { data, error } = await supabase
      .from('alarms')
      .update(updates)
      .eq('alarm_id', alarmId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Alarm Response Log
  async logAlarmResponse(logData) {
    const { data, error } = await supabase
      .from('alarm_response_log')
      .insert([logData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Fire Stations
  async getStation(stationId) {
    const { data, error } = await supabase
      .from('fire_stations')
      .select('*')
      .eq('station_id', stationId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getStations() {
    const { data, error } = await supabase
      .from('fire_stations')
      .select('*')
      .order('station_name');
    
    if (error) throw error;
    return data;
  },

  async createStation(stationData) {
    const { data, error } = await supabase
      .from('fire_stations')
      .insert([stationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStation(stationId, updates) {
    const { data, error } = await supabase
      .from('fire_stations')
      .update(updates)
      .eq('station_id', stationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Firetrucks
  async getFiretruck(truckId) {
    const { data, error } = await supabase
      .from('firetrucks')
      .select('*')
      .eq('truck_id', truckId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getFiretrucksByStation(stationId) {
    const { data, error } = await supabase
      .from('firetrucks')
      .select('*')
      .eq('assigned_station_id', stationId)
      .order('plate_number');
    
    if (error) throw error;
    return data;
  },

  async updateFiretruck(truckId, updates) {
    const { data, error } = await supabase
      .from('firetrucks')
      .update(updates)
      .eq('truck_id', truckId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
