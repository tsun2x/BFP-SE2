import express from 'express';
import { pool } from '../config/database.js';
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

    const connection = await pool.getConnection();

    try {
      // Debug: log what readiness will be applied
      try {
        console.log('[Readiness] Submitting readiness for station', assignedStationId, 'user', userId, 'status=', status, 'percent=', readinessPercentage);
      } catch (logErr) {
        console.error('[Readiness] Error logging readiness submission:', logErr);
      }

      // Insert readiness record
      const [result] = await connection.query(
        `INSERT INTO station_readiness (station_id, submitted_by_user_id, status, readiness_percentage, equipment_checklist)
         VALUES (?, ?, ?, ?, ?)`,
        [assignedStationId, userId, status, readinessPercentage, JSON.stringify(equipmentChecklist || {})]
      );

      // Update fire_stations is_ready flag and last_status_update
      // READY and PARTIALLY_READY are both considered dispatchable (is_ready = 1).
      // Only NOT_READY is treated as not dispatchable (is_ready = 0).
      const isReady = (status === 'READY' || status === 'PARTIALLY_READY') ? 1 : 0;
      await connection.query(
        `UPDATE fire_stations SET is_ready = ?, last_status_update = NOW() WHERE station_id = ?`,
        [isReady, assignedStationId]
      );

      connection.release();

      res.status(201).json({
        message: 'Station readiness submitted successfully',
        readinessId: result.insertId,
        stationId: assignedStationId,
        status,
        readinessPercentage
      });
    } catch (error) {
      connection.release();
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

    const connection = await pool.getConnection();

    const [readiness] = await connection.query(
      `SELECT r.*, u.first_name, u.last_name, fs.station_name
       FROM station_readiness r
       JOIN users u ON r.submitted_by_user_id = u.user_id
       JOIN fire_stations fs ON r.station_id = fs.station_id
       WHERE r.station_id = ?
       ORDER BY r.submitted_at DESC
       LIMIT 1`,
      [stationId]
    );

    connection.release();

    if (readiness.length === 0) {
      return res.status(404).json({
        message: 'No readiness record found for this station'
      });
    }

    const record = readiness[0];
    res.json({
      readinessId: record.readiness_id,
      stationId: record.station_id,
      stationName: record.station_name,
      status: record.status,
      readinessPercentage: record.readiness_percentage,
      equipmentChecklist: typeof record.equipment_checklist === 'string' 
        ? JSON.parse(record.equipment_checklist) 
        : record.equipment_checklist,
      submittedBy: `${record.first_name} ${record.last_name}`,
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
    const connection = await pool.getConnection();

    const [results] = await connection.query(
      `SELECT 
        fs.station_id,
        fs.station_name,
        fs.station_type,
        fs.is_ready,
        fs.last_status_update,
        COALESCE(r.status, 'UNKNOWN') as readiness_status,
        COALESCE(r.readiness_percentage, 0) as readiness_percentage,
        COALESCE(u.first_name, 'N/A') as last_submitted_by_first_name,
        COALESCE(u.last_name, 'N/A') as last_submitted_by_last_name,
        r.submitted_at as last_readiness_update
       FROM fire_stations fs
       LEFT JOIN (
         SELECT * FROM station_readiness
         WHERE (station_id, submitted_at) IN (
           SELECT station_id, MAX(submitted_at) 
           FROM station_readiness 
           GROUP BY station_id
         )
       ) r ON fs.station_id = r.station_id
       LEFT JOIN users u ON r.submitted_by_user_id = u.user_id
       ORDER BY fs.station_type DESC, fs.station_name ASC`
    );

    connection.release();

    const overview = results.map(row => ({
      stationId: row.station_id,
      stationName: row.station_name,
      stationType: row.station_type,
      isReady: row.is_ready === 1,
      readinessStatus: row.readiness_status,
      readinessPercentage: row.readiness_percentage,
      lastSubmittedBy: `${row.last_submitted_by_first_name} ${row.last_submitted_by_last_name}`,
      lastReadinessUpdate: row.last_readiness_update,
      lastStatusUpdate: row.last_status_update
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
