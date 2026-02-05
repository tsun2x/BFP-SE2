import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// POST /api/firetrucks/track
// Receives firetruck location + status from the mobile app and stores it in Supabase
router.post('/firetrucks/track', async (req, res) => {
  try {
    const {
      truck_id,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      battery_level,
      alarm_level,
      fire_status,
    } = req.body;

    if (!truck_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'truck_id, latitude, and longitude are required',
      });
    }

    const payload = {
      truck_id,
      latitude,
      longitude,
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
      battery_level: battery_level ?? null,
      alarm_level: alarm_level ?? null,
      fire_status: fire_status ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('firetruck_locations')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error (firetruck_locations):', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save location to Supabase: ' + error.message,
      });
    }

    return res.json({
      success: true,
      message: 'Location stored in Supabase',
      data,
    });
  } catch (error) {
    console.error('Firetruck tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected server error: ' + (error && error.message ? error.message : 'Unknown error'),
    });
  }
});

export default router;
