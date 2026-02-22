import express from 'express';
import { supabase, db } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

// Public: list all stations with full details
router.get('/firestations', async (req, res) => {
  try {
    console.log('[GET /firestations] Request received');
    const stations = await db.getStations();
    console.log('[GET /firestations] Query returned', stations.length, 'stations');
    res.json({ stations });
  } catch (error) {
    console.error('Get firestations error:', error);
    res.status(500).json({ message: 'Failed to retrieve stations', error: error.message });
  }
});

// Public: get single station details
router.get('/firestations/:id', async (req, res) => {
  try {
    const stationId = req.params.id;
    const station = await db.getStation(stationId);
    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }
    res.json({ station });
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
    const station = await db.createStation({
      station_name: stationName,
      province: province || null,
      city: city || null,
      contact_number: contactNumber || null,
      latitude: lat,
      longitude: lng,
      station_type: stationType
    });

    const stationId = station.station_id;
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

    // Build update object dynamically
    const updates = {};
    if (stationName !== undefined) updates.station_name = stationName;
    if (province !== undefined) updates.province = province;
    if (city !== undefined) updates.city = city;
    if (contactNumber !== undefined) updates.contact_number = contactNumber;
    if (latitude !== undefined && longitude !== undefined) {
      updates.latitude = parseFloat(latitude);
      updates.longitude = parseFloat(longitude);
    }
    if (stationType !== undefined) updates.station_type = stationType;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    await db.updateStation(stationId, updates);

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
    const { error } = await supabase
      .from('fire_stations')
      .delete()
      .eq('station_id', stationId);

    if (error) throw error;

    res.json({ message: 'Station deleted' });
  } catch (error) {
    console.error('Delete station error:', error);
    res.status(500).json({ message: 'Failed to delete station', error: error.message });
  }
});

export default router;
