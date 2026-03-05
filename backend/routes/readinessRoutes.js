import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles, isAdminUser, getUserStationId } from '../middleware/role.js';

const router = express.Router();

// Submit station readiness (by officer assigned to that station)
router.post('/station-readiness', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const { status, readinessPercentage, equipmentChecklist } = req.body;
    const userId = req.user.id;
    const isAdmin = isAdminUser(req.user);
    const assignedStationId = getUserStationId(req.user);

    console.log('[POST /station-readiness] User:', userId, 'Station:', assignedStationId, 'Status:', status);

    // Validate required fields
    if (!status || readinessPercentage === undefined) {
      return res.status(400).json({
        message: 'Status and readiness percentage are required'
      });
    }

    // Validate user is assigned to a station (admins are allowed to submit as well, but still must be station-scoped)
    if (!assignedStationId) {
      console.log('[POST /station-readiness] User not assigned to any station');
      return res.status(403).json({
        message: 'You are not assigned to any station'
      });
    }

    // Admins still submit for their own station; no cross-station submission via this endpoint
    if (isAdmin && !assignedStationId) {
      return res.status(400).json({ message: 'Admin has no assigned station' });
    }

    try {
      console.log('[POST /station-readiness] Inserting readiness record...');
      
      // Get max ID to determine next ID (workaround for sequence issue)
      const { data: maxData, error: maxError } = await supabase
        .from('station_readiness')
        .select('readiness_id', { count: 'exact' })
        .order('readiness_id', { ascending: false })
        .limit(1);

      const nextId = (maxData && maxData.length > 0) ? maxData[0].readiness_id + 1 : 1;
      console.log('[POST /station-readiness] Next ID to use:', nextId);

      const { data: result, error: insertErr } = await supabase
        .from('station_readiness')
        .insert([
          {
            readiness_id: nextId,
            station_id: assignedStationId,
            submitted_by_user_id: null,
            status,
            readiness_percentage: readinessPercentage,
            equipment_checklist: JSON.stringify(equipmentChecklist || {})
          }
        ])
        .select('readiness_id')
        .single();

      if (insertErr) {
        console.error('[POST /station-readiness] Insert error:', insertErr);
        throw insertErr;
      }

      // Update fire_stations is_ready flag and last_status_update
      const isReady = (status === 'READY' || status === 'PARTIALLY_READY') ? true : false;
      const { error: updateErr } = await supabase
        .from('fire_stations')
        .update({
          is_ready: isReady,
          last_status_update: new Date().toISOString()
        })
        .eq('station_id', assignedStationId);
      if (updateErr) {
        console.error('[POST /station-readiness] fire_stations update error:', updateErr);
      }

      console.log('[POST /station-readiness] Insert success, ID:', result?.readiness_id);
      res.status(201).json({
        message: 'Station readiness submitted successfully',
        readinessId: result?.readiness_id || nextId,
        stationId: assignedStationId,
        status,
        readinessPercentage
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('[POST /station-readiness] Error:', error);
    res.status(500).json({
      message: 'Failed to submit station readiness',
      error: error.message,
      details: error.details || error
    });
  }
});

// Get latest readiness for a specific station
router.get('/station-readiness/:stationId', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const { stationId } = req.params;

    const isAdmin = isAdminUser(req.user);
    const assignedStationId = getUserStationId(req.user);

    if (!isAdmin) {
      if (!assignedStationId) {
        return res.status(403).json({ message: 'You are not assigned to any station' });
      }
      if (String(stationId) !== String(assignedStationId)) {
        return res.status(403).json({ message: 'Forbidden: station is not assigned to your account' });
      }
    }

    const { data: readiness, error: readinessErr } = await supabase
      .from('station_readiness')
      .select('*, fire_stations(station_name)')
      .eq('station_id', stationId)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (readinessErr) throw readinessErr;

    if (!readiness || readiness.length === 0) {
      return res.json({
        readinessId: null,
        stationId: Number(stationId),
        stationName: null,
        status: 'NOT_READY',
        readinessPercentage: 0,
        equipmentChecklist: {},
        submittedBy: 'N/A',
        submittedAt: null,
      });
    }

    const record = readiness[0];
    res.json({
      readinessId: record.readiness_id,
      stationId: record.station_id,
      stationName: record.fire_stations?.[0]?.station_name || null,
      status: record.status,
      readinessPercentage: record.readiness_percentage,
      equipmentChecklist: typeof record.equipment_checklist === 'string' ? JSON.parse(record.equipment_checklist) : record.equipment_checklist,
      submittedBy: 'N/A',
      submittedAt: record.submitted_at
    });
  } catch (error) {
    console.error('Get station readiness error:', error);
    res.status(500).json({
      message: 'Failed to fetch station readiness',
      error: error.message
    });
  }
});

// Get all stations with their latest readiness (for overview)
router.get('/stations-readiness-overview', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    console.log('[GET /stations-readiness-overview] Starting...');

    const isAdmin = isAdminUser(req.user);
    const assignedStationId = getUserStationId(req.user);

    if (!isAdmin && !assignedStationId) {
      return res.status(403).json({ message: 'You are not assigned to any station' });
    }
    
    // Fetch stations, then latest readiness per station
    const { data: stations, error: stationsErr } = await supabase
      .from('fire_stations')
      .select('station_id, station_name')
      .order('station_name', { ascending: true });

    if (stationsErr) {
      console.error('[GET /stations-readiness-overview] Stations error:', stationsErr);
      throw stationsErr;
    }

    console.log('[GET /stations-readiness-overview] Found stations:', stations?.length || 0);

    const scopedStations = isAdmin ? (stations || []) : (stations || []).filter((s) => String(s.station_id) === String(assignedStationId));
    const overview = [];

    for (const s of scopedStations) {
      const { data: latest, error: latestErr } = await supabase
        .from('station_readiness')
        .select('*')
        .eq('station_id', s.station_id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (latestErr) {
        console.error(`[GET /stations-readiness-overview] Readiness error for station ${s.station_id}:`, latestErr);
      }

      const rec = (latest && latest[0]) || null;

      overview.push({
        stationId: s.station_id,
        stationName: s.station_name,
        readinessStatus: rec ? rec.status : 'UNKNOWN',
        readinessPercentage: rec ? rec.readiness_percentage : 0,
        lastSubmittedBy: 'N/A',
        lastReadinessUpdate: rec ? rec.submitted_at : null
      });
    }

    console.log('[GET /stations-readiness-overview] Success, returning', overview.length, 'stations');
    res.json({ overview });
  } catch (error) {
    console.error('[GET /stations-readiness-overview] Fatal error:', error);
    res.status(500).json({
      message: 'Failed to fetch readiness overview',
      error: error.message
    });
  }
});

export default router;
