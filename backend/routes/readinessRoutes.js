import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Submit station readiness (by officer assigned to that station)
router.post('/station-readiness', authenticateToken, async (req, res) => {
  try {
    const { status, readinessPercentage, equipmentChecklist } = req.body;
    const userId = req.user.id;
    const assignedStationId = req.user.assignedStationId;

    console.log('[POST /station-readiness] User:', userId, 'Station:', assignedStationId, 'Status:', status);

    // Validate required fields
    if (!status || readinessPercentage === undefined) {
      return res.status(400).json({
        message: 'Status and readiness percentage are required'
      });
    }

    // Validate user is assigned to a station
    if (!assignedStationId) {
      console.log('[POST /station-readiness] User not assigned to any station');
      return res.status(403).json({
        message: 'You are not assigned to any station'
      });
    }

    try {
      console.log('[POST /station-readiness] Inserting readiness record...');
      const { data: result, error: insertErr } = await supabase
        .from('_station_readiness')
        .insert([
          {
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

      console.log('[POST /station-readiness] Insert success, updating station...');
      const isReady = status === 'READY' ? 1 : 0;
      const { error: updateErr } = await supabase
        .from('_fire_stations')
        .update({ is_ready: isReady, last_status_update: new Date().toISOString() })
        .eq('station_id', assignedStationId);

      if (updateErr) {
        console.error('[POST /station-readiness] Update error:', updateErr);
        throw updateErr;
      }

      console.log('[POST /station-readiness] Success');
      res.status(201).json({
        message: 'Station readiness submitted successfully',
        readinessId: result?.readiness_id || null,
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
      error: error.message
    });
  }
});

// Get latest readiness for a specific station
router.get('/station-readiness/:stationId', authenticateToken, async (req, res) => {
  try {
    const { stationId } = req.params;

    const { data: readiness, error: readinessErr } = await supabase
      .from('_station_readiness')
      .select('*, users(first_name,last_name), fire_stations(station_name)')
      .eq('station_id', stationId)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (readinessErr) throw readinessErr;

    if (!readiness || readiness.length === 0) {
      return res.status(404).json({ message: 'No readiness record found for this station' });
    }

    const record = readiness[0];
    res.json({
      readinessId: record.readiness_id,
      stationId: record.station_id,
      stationName: record.fire_stations?.[0]?.station_name || null,
      status: record.status,
      readinessPercentage: record.readiness_percentage,
      equipmentChecklist: typeof record.equipment_checklist === 'string' ? JSON.parse(record.equipment_checklist) : record.equipment_checklist,
      submittedBy: `${record.users?.[0]?.first_name || ''} ${record.users?.[0]?.last_name || ''}`.trim(),
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
router.get('/stations-readiness-overview', authenticateToken, async (req, res) => {
  try {
    // Fetch stations, then latest readiness per station
    const { data: stations, error: stationsErr } = await supabase
      .from('_fire_stations')
      .select('station_id, station_name, is_ready, last_status_update')
      .order('station_name', { ascending: true });

    if (stationsErr) throw stationsErr;

    const overview = [];

    for (const s of stations || []) {
      const { data: latest, error: latestErr } = await supabase
        .from('_station_readiness')
        .select('*, users(first_name,last_name)')
        .eq('station_id', s.station_id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (latestErr) throw latestErr;

      const rec = (latest && latest[0]) || null;

      overview.push({
        stationId: s.station_id,
        stationName: s.station_name,
        isReady: s.is_ready === 1,
        readinessStatus: rec ? rec.status : 'UNKNOWN',
        readinessPercentage: rec ? rec.readiness_percentage : 0,
        lastSubmittedBy: rec ? `${rec.users?.[0]?.first_name || ''} ${rec.users?.[0]?.last_name || ''}`.trim() : 'N/A',
        lastReadinessUpdate: rec ? rec.submitted_at : null,
        lastStatusUpdate: s.last_status_update
      });
    }

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
