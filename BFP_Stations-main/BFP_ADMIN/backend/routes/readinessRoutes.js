import express from 'express';
import { supabase, db } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Submit station readiness (by officer assigned to that station)
router.post('/station-readiness', authenticateToken, async (req, res) => {
  try {
    const { status, readinessPercentage, equipmentChecklist } = req.body;
    const userId = req.user.id;
    const assignedStationId = req.user.assignedStationId;

    // Validate required fields
    if (!status || readinessPercentage === undefined) {
      return res.status(400).json({
        message: 'Status and readiness percentage are required'
      });
    }

    // Validate user is assigned to a station
    if (!assignedStationId) {
      return res.status(403).json({
        message: 'You are not assigned to any station'
      });
    }

    try {
      // Debug: log what readiness will be applied
      try {
        console.log('[Readiness] Submitting readiness for station', assignedStationId, 'user', userId, 'status=', status, 'percent=', readinessPercentage);
      } catch (logErr) {
        console.error('[Readiness] Error logging readiness submission:', logErr);
      }

      // Insert readiness record
      const { data: readinessData, error: readinessError } = await supabase
        .from('station_readiness')
        .insert([{
          station_id: assignedStationId,
          submitted_by_user_id: userId,
          status: status,
          readiness_percentage: readinessPercentage,
          equipment_checklist: JSON.stringify(equipmentChecklist || {})
        }])
        .select()
        .single();

      if (readinessError) throw readinessError;

      // Update fire_stations is_ready flag and last_status_update
      // READY and PARTIALLY_READY are both considered dispatchable (is_ready = 1).
      // Only NOT_READY is treated as not dispatchable (is_ready = 0).
      const isReady = (status === 'READY' || status === 'PARTIALLY_READY') ? true : false;
      await db.updateStation(assignedStationId, {
        is_ready: isReady,
        last_status_update: new Date().toISOString()
      });

      res.status(201).json({
        message: 'Station readiness submitted successfully',
        readinessId: readinessData.readiness_id,
        stationId: assignedStationId,
        status,
        readinessPercentage
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Submit station readiness error:', error);
    res.status(500).json({
      message: 'Failed to submit station readiness',
      error: error.message
    });
  }
});

// Get latest readiness for a specific station
router.get('/station-readiness/:stationId', authenticateToken, async (req, res) => {
  try {
    const { stationId } = req.params;

    const { data: readiness, error } = await supabase
      .from('station_readiness')
      .select(`
        *,
        users!submitted_by_user_id (first_name, last_name),
        fire_stations!station_id (station_name)
      `)
      .eq('station_id', stationId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!readiness) {
      return res.status(404).json({
        message: 'No readiness record found for this station'
      });
    }

    res.json({
      readinessId: readiness.readiness_id,
      stationId: readiness.station_id,
      stationName: readiness.fire_stations.station_name,
      status: readiness.status,
      readinessPercentage: readiness.readiness_percentage,
      equipmentChecklist: typeof readiness.equipment_checklist === 'string' 
        ? JSON.parse(readiness.equipment_checklist) 
        : readiness.equipment_checklist,
      submittedBy: `${readiness.users.first_name} ${readiness.users.last_name}`,
      submittedAt: readiness.submitted_at
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
router.get('/stations-readiness-overview', authenticateToken, async (req, res) => {
  try {
    const { data: stations, error: stationsError } = await supabase
      .from('fire_stations')
      .select(`
        station_id,
        station_name,
        station_type,
        is_ready,
        last_status_update
      `)
      .order('station_type', { ascending: false })
      .order('station_name', { ascending: true });

    if (stationsError) throw stationsError;

    // For each station, get latest readiness
    const overview = await Promise.all(stations.map(async (station) => {
      const { data: latestReadiness } = await supabase
        .from('station_readiness')
        .select(`
          *,
          users!submitted_by_user_id (first_name, last_name)
        `)
        .eq('station_id', station.station_id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      return {
        stationId: station.station_id,
        stationName: station.station_name,
        stationType: station.station_type,
        isReady: station.is_ready || false,
        readinessStatus: latestReadiness?.status || 'UNKNOWN',
        readinessPercentage: latestReadiness?.readiness_percentage || 0,
        lastSubmittedBy: latestReadiness 
          ? `${latestReadiness.users.first_name} ${latestReadiness.users.last_name}`
          : 'N/A',
        lastReadinessUpdate: latestReadiness?.submitted_at,
        lastStatusUpdate: station.last_status_update
      };
    }));

    res.json({ overview });
  } catch (error) {
    console.error('Get stations readiness overview error:', error);
    res.status(500).json({
      message: 'Failed to fetch readiness overview',
      error: error.message
    });
  }
});

export default router;
