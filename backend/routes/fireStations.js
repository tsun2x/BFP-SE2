import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

// Public: list all stations with full details
router.get('/firestations', async (req, res) => {
  try {
    console.log('[GET /firestations] Request received');
    const { data: rows, error } = await supabase
      .from('_fire_stations')
      .select('*')
      .order('station_name', { ascending: true });
    
    if (error) throw error;
    
    console.log('[GET /firestations] Query returned', rows.length, 'stations');
    res.json({ stations: rows });
  } catch (error) {
    console.error('Get firestations error:', error);
    res.status(500).json({ message: 'Failed to retrieve stations', error: error.message });
  }
});

// Public: get single station details
router.get('/firestations/:id', async (req, res) => {
  try {
    const stationId = req.params.id;
    const { data: rows, error } = await supabase
      .from('_fire_stations')
      .select('*')
      .eq('station_id', stationId)
      .single();
    
    if (error || !rows) return res.status(404).json({ message: 'Station not found' });
    res.json({ station: rows });
  } catch (error) {
    console.error('Get station error:', error);
    res.status(500).json({ message: 'Failed to retrieve station', error: error.message });
  }
});

// Create a new fire station (admin only)
router.post('/firestations', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { stationName, province, city, contactNumber, latitude, longitude, stationType } = req.body;

    if (!stationName || latitude === undefined || longitude === undefined || !stationType) {
      return res.status(400).json({ message: 'Missing required fields: stationName, latitude, longitude, stationType' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Latitude and longitude must be valid numbers' });
    }

    // Insert station
    const [result] = await pool.query(
      'INSERT INTO fire_stations (station_name, province, city, contact_number, latitude, longitude, station_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [stationName, province || null, city || null, contactNumber || null, lat, lng, stationType]
    );

    const stationId = result.insertId;
    res.status(201).json({ message: 'Station created', stationId });
  } catch (error) {
    console.error('Create station error:', error);
    res.status(500).json({ message: 'Failed to create station', error: error.message });
  }
});

// Update an existing station (admin only)
router.put('/firestations/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const stationId = req.params.id;
    const { stationName, province, city, contactNumber, latitude, longitude, stationType } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];
    if (stationName !== undefined) { updates.push('station_name = ?'); params.push(stationName); }
    if (province !== undefined) { updates.push('province = ?'); params.push(province); }
    if (city !== undefined) { updates.push('city = ?'); params.push(city); }
    if (contactNumber !== undefined) { updates.push('contact_number = ?'); params.push(contactNumber); }
    if (latitude !== undefined && longitude !== undefined) { updates.push('latitude = ?', 'longitude = ?'); params.push(parseFloat(latitude), parseFloat(longitude)); }
    if (stationType !== undefined) { updates.push('station_type = ?'); params.push(stationType); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    const query = `UPDATE fire_stations SET ${updates.join(', ')} WHERE station_id = ?`;
    params.push(stationId);

    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }

    res.json({ message: 'Station updated', stationId });
  } catch (error) {
    console.error('Update station error:', error);
    res.status(500).json({ message: 'Failed to update station', error: error.message });
  }
});

// Delete a station (admin only)
router.delete('/firestations/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const stationId = req.params.id;
    const [result] = await pool.query('DELETE FROM fire_stations WHERE station_id = ?', [stationId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }
    res.json({ message: 'Station deleted' });
  } catch (error) {
    console.error('Delete station error:', error);
    res.status(500).json({ message: 'Failed to delete station', error: error.message });
  }
});

export default router;
