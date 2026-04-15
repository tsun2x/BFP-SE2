import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles, isAdminUser, getUserStationId } from '../middleware/role.js';

const router = express.Router();


// POST /api/firetrucks/track
// Receives firetruck location + status from the mobile app and stores it in Supabase
router.post('/firetrucks/track', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
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

    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    if (!isAdmin && !stationId) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to any station',
      });
    }

    if (!isAdmin) {
      const { data: truck, error: truckErr } = await supabase
        .from('firetrucks')
        .select('truck_id, assigned_station_id')
        .eq('truck_id', truck_id)
        .single();

      if (truckErr) {
        return res.status(500).json({
          success: false,
          error: 'Failed to validate firetruck assignment: ' + truckErr.message,
        });
      }

      if (String(truck?.assigned_station_id ?? '') !== String(stationId)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: firetruck is not assigned to your station',
        });
      }
    }

    const payload = {
      truck_id,
      latitude,
      longitude,
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
      recorded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('firetruck_location_history')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error (firetruck_location_history):', error);
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

// GET /api/firetrucks/current-alarm?truck_id=1
// Returns the current active alarm (if any) for the given firetruck
router.get('/firetrucks/current-alarm', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const { truck_id } = req.query;

    if (!truck_id) {
      return res.status(400).json({
        success: false,
        message: 'truck_id query parameter is required',
      });
    }

    // Get firetruck with current alarm
    const { data: truck, error: truckError } = await supabase
      .from('firetrucks')
      .select(`
        truck_id,
        assigned_station_id,
        current_alarm_id,
        alarms!current_alarm_id (
          alarm_id,
          user_latitude,
          user_longitude,
          initial_alarm_level,
          current_alarm_level,
          status,
          call_time,
          dispatch_time,
          resolve_time
        )
      `)
      .eq('truck_id', truck_id)
      .single();

    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    if (!isAdmin) {
      if (!stationId) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to any station',
        });
      }
      if (String(truck?.assigned_station_id ?? '') !== String(stationId)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: firetruck is not assigned to your station',
        });
      }
    }

    if (truckError && truckError.code !== 'PGRST116') throw truckError;

    if (!truck || !truck.alarms) {
      return res.json({
        success: true,
        hasAlarm: false,
        alarm: null,
      });
    }

    const alarm_data = truck.alarms;
    const alarm = {
      alarmId: alarm_data.alarm_id,
      truckId: truck.truck_id,
      plateNumber: null,
      stationId: truck.assigned_station_id,
      userLatitude: Number(alarm_data.user_latitude),
      userLongitude: Number(alarm_data.user_longitude),
      initialAlarmLevel: alarm_data.initial_alarm_level,
      currentAlarmLevel: alarm_data.current_alarm_level,
      status: alarm_data.status,
      callTime: alarm_data.call_time,
      dispatchTime: alarm_data.dispatch_time,
      resolveTime: alarm_data.resolve_time,
    };

    return res.json({
      success: true,
      hasAlarm: true,
      alarm,
    });
  } catch (error) {
    console.error('GET /firetrucks/current-alarm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current alarm for firetruck',
      error: error.message,
    });
  }
});

// PUT /api/firetrucks/status
// Driver updates their truck's alarm level and/or fire status.
// Broadcasts the update via Socket.IO to all admins and end-users.
router.put('/firetrucks/status', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const {
      truck_id,
      alarm_id,
      alarm_level,
      fire_status,
      latitude,
      longitude,
      driver_name,
    } = req.body;

    if (!truck_id) {
      return res.status(400).json({ success: false, error: 'truck_id is required' });
    }

    // Upsert into firetruck_status table (live status, one row per truck)
    const payload = {
      truck_id,
      alarm_id: alarm_id ?? null,
      alarm_level: alarm_level ?? null,
      fire_status: fire_status ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      driver_name: driver_name ?? req.user?.name ?? null,
      updated_at: new Date().toISOString(),
    };

    // Try update first, then insert if not exists
    const { data: existing } = await supabase
      .from('firetruck_status')
      .select('id')
      .eq('truck_id', truck_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('firetruck_status')
        .update(payload)
        .eq('truck_id', truck_id)
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('firetruck_status')
        .insert([payload])
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    }

    // Fetch previous alarm level before updating (for change detection)
    let previousAlarmLevel = null;
    if (alarm_id && alarm_level) {
      const { data: alarmRow } = await supabase
        .from('_alarms')
        .select('current_alarm_level')
        .eq('alarm_id', alarm_id)
        .maybeSingle();
      previousAlarmLevel = alarmRow?.current_alarm_level || null;

      // Update the _alarms table current_alarm_level
      const { error: alarmUpdateErr } = await supabase
        .from('_alarms')
        .update({ current_alarm_level: alarm_level })
        .eq('alarm_id', alarm_id);
      if (alarmUpdateErr) console.error('[firetrucks/status] Failed to update _alarms alarm level:', alarmUpdateErr.message);
    }

    // Keep incident report source tables in sync with driver status updates.
    let syncedIncidentStatus = null;
    let syncedStationId = null;
    if (alarm_id && fire_status) {
      const normalizedFireStatus = String(fire_status).trim().toLowerCase();
      const STATUS_TO_ALARM = {
        'en route': 'Dispatched',
        'on scene': 'On Scene',
        'fire out': 'Resolved',
      };
      const mappedAlarmStatus = STATUS_TO_ALARM[normalizedFireStatus] || null;

      if (mappedAlarmStatus) {
        const { data: alarmRow, error: alarmFetchErr } = await supabase
          .from('alarms')
          .select('status, dispatch_time, resolve_time, assigned_station_id')
          .eq('alarm_id', alarm_id)
          .maybeSingle();

        if (alarmFetchErr) {
          console.error('[firetrucks/status] Failed to fetch alarm for status sync:', alarmFetchErr.message);
        } else if (alarmRow && alarmRow.status !== mappedAlarmStatus) {
          syncedStationId = Number(alarmRow.assigned_station_id || 0) || null;
          const nowIso = new Date().toISOString();
          const alarmUpdatePayload = { status: mappedAlarmStatus };

          if (mappedAlarmStatus === 'Dispatched' && !alarmRow.dispatch_time) {
            alarmUpdatePayload.dispatch_time = nowIso;
          }
          if (mappedAlarmStatus === 'Resolved' && !alarmRow.resolve_time) {
            alarmUpdatePayload.resolve_time = nowIso;
          }

          const { error: alarmStatusUpdateErr } = await supabase
            .from('alarms')
            .update(alarmUpdatePayload)
            .eq('alarm_id', alarm_id);

          if (alarmStatusUpdateErr) {
            console.error('[firetrucks/status] Failed to sync alarm status:', alarmStatusUpdateErr.message);
          } else {
            syncedIncidentStatus = mappedAlarmStatus;
            const details = `Truck #${truck_id} updated fire status to ${fire_status}`;
            const { error: statusLogErr } = await supabase
              .from('alarm_response_log')
              .insert([
                {
                  alarm_id: Number(alarm_id),
                  action_type: 'Firetruck Status Update',
                  details,
                  performed_by_user_id: req.user?.id || null,
                },
              ]);

            if (statusLogErr) {
              console.error('[firetrucks/status] Failed to log firetruck status update:', statusLogErr.message);
            }
          }
        }
      }
    }

    // Broadcast to everyone via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const broadcast = {
        truckId: truck_id,
        alarmId: alarm_id,
        alarmLevel: alarm_level,
        fireStatus: fire_status,
        latitude,
        longitude,
        driverName: payload.driver_name,
        updatedAt: payload.updated_at,
      };
      io.emit('truck-status-update', broadcast);
      console.log('[firetrucks/status] Broadcasted truck-status-update:', JSON.stringify(broadcast));

      if (syncedIncidentStatus && alarm_id) {
        const incidentStatusPayload = {
          alarmId: Number(alarm_id),
          status: syncedIncidentStatus,
          source: 'firetruck-status',
          truckId: truck_id,
          fireStatus: fire_status,
        };

        io.emit('incident-status-updated', incidentStatusPayload);
        io.to(`alarm-${alarm_id}`).emit('incident-status-updated', incidentStatusPayload);
        if (syncedStationId) {
          io.to(`station-${syncedStationId}`).emit('incident-status-updated', incidentStatusPayload);
        }
      }

      // If alarm level changed, emit a dedicated alarm-level-update event
      if (alarm_id && alarm_level && previousAlarmLevel && alarm_level !== previousAlarmLevel) {
        const alarmUpdate = {
          alarmId: alarm_id,
          truckId: truck_id,
          previousAlarmLevel,
          newAlarmLevel: alarm_level,
          fireStatus: fire_status,
          driverName: payload.driver_name,
          updatedAt: payload.updated_at,
        };
        io.emit('alarm-level-update', alarmUpdate);
        // Also emit to the specific alarm room
        io.to(`alarm-${alarm_id}`).emit('alarm-level-update', alarmUpdate);
        console.log('[firetrucks/status] Alarm level changed:', previousAlarmLevel, '->', alarm_level, '| Broadcasted alarm-level-update');
      }
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('PUT /firetrucks/status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/firetrucks/active
// Returns all active firetrucks with their current status (for map display)
router.get('/firetrucks/active', async (req, res) => {
  try {
    const recencyMinutes = 10; // Only show trucks updated within last 10 minutes
    const cutoff = new Date(Date.now() - recencyMinutes * 60_000).toISOString();

    const { data, error } = await supabase
      .from('firetruck_status')
      .select('*')
      .not('alarm_id', 'is', null) // Only trucks with active alarms
      .gte('updated_at', cutoff) // Only recently updated trucks
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('GET /firetrucks/active error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/firetrucks/my-truck
// Returns the firetruck assigned to the currently logged-in driver
router.get('/firetrucks/my-truck', authenticateToken, requireRoles(['driver']), async (req, res) => {
  try {
    const driverId = req.user?.id;
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Missing driver ID' });
    }

    const { data: truck, error } = await supabase
      .from('firetrucks')
      .select('truck_id, truck_code, truck_name, assigned_station_id, is_active')
      .eq('driver_id', driverId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!truck) {
      return res.status(404).json({ success: false, message: 'No truck assigned to this driver' });
    }

    return res.json({ success: true, truck });
  } catch (error) {
    console.error('GET /firetrucks/my-truck error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
