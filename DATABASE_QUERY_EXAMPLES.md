# 🛠️ DEVELOPER REFERENCE - Database Query Examples

**Quick Copy-Paste Queries for Common Operations**

---

## 📋 Table of Contents

1. [Users (Authentication)](#users-authentication)
2. [Fire Stations](#fire-stations)
3. [Firetrucks](#firetrucks)
4. [Alarms (Incidents)](#alarms-incidents)
5. [Alarm Response Log](#alarm-response-log)
6. [Incident Reports](#incident-reports)
7. [Station Readiness](#station-readiness)
8. [Firetruck Location History](#firetruck-location-history)

---

## Users (Authentication)

### Create New User (Admin)
```javascript
const { data, error } = await supabase
  .from('users')
  .insert([{
    id_number: 'BFP-00004',
    first_name: 'John',
    last_name: 'Smith',
    full_name: 'John Smith',
    email: 'john@bfp.gov.ph',
    phone_number: '9991234567',
    password: hashedPassword, // Use bcrypt
    role: 'substation_admin',
    rank: 'Fire Officer 1',
    assigned_station_id: 102
  }])
  .select('user_id');
```

### Login User
```javascript
const { data: user, error } = await supabase
  .from('users')
  .select('user_id, full_name, role, assigned_station_id')
  .eq('phone_number', phoneNumber)
  .single();

if (user && await bcrypt.compare(password, user.password)) {
  // Generate JWT token and return
}
```

### Get User By ID
```javascript
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Get All Users with Role
```javascript
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'driver')
  .order('created_at', { ascending: false });
```

### Update User
```javascript
const { data, error } = await supabase
  .from('users')
  .update({
    last_name: 'Doe',
    assigned_station_id: 103
  })
  .eq('user_id', userId)
  .select();
```

### Delete User
```javascript
const { error } = await supabase
  .from('users')
  .delete()
  .eq('user_id', userId);
```

---

## Fire Stations

### Get All Fire Stations
```javascript
const { data: stations, error } = await supabase
  .from('fire_stations')
  .select('*')
  .order('station_name');
```

### Get Main Station Only
```javascript
const { data: mainStation, error } = await supabase
  .from('fire_stations')
  .select('*')
  .eq('station_type', 'Main')
  .single();
```

### Get All Substations
```javascript
const { data: substations, error } = await supabase
  .from('fire_stations')
  .select('*')
  .eq('station_type', 'Substation');
```

### Find Nearest Station (KNN - using SQL)
```javascript
const { data: nearest, error } = await supabase
  .rpc('get_nearest_stations', {
    p_latitude: 14.5995,
    p_longitude: 120.9842,
    p_limit: 3
  });

// Or use raw SQL:
const { data: nearest, error } = await supabase
  .from('fire_stations')
  .select('*')
  .order('(latitude - 14.5995)^2 + (longitude - 120.9842)^2')
  .limit(3);
```

### Create New Fire Station
```javascript
const { data: newStation, error } = await supabase
  .from('fire_stations')
  .insert([{
    station_name: 'New Substation',
    station_type: 'Substation',
    latitude: 14.5547,
    longitude: 121.0244,
    contact_number: '024-9876543',
    address: 'Address Here',
    head_officer: 'Officer Name'
  }])
  .select('station_id');
```

### Get Station with Assigned Users
```javascript
const { data: station, error } = await supabase
  .from('fire_stations')
  .select(`
    *,
    users!assigned_station_id (user_id, full_name, role)
  `)
  .eq('station_id', stationId)
  .single();
```

---

## Firetrucks

### Get All Active Firetrucks
```javascript
const { data: trucks, error } = await supabase
  .from('firetrucks')
  .select('*')
  .eq('is_active', true)
  .order('truck_code');
```

### Get Firetrucks at Specific Station
```javascript
const { data: trucks, error } = await supabase
  .from('firetrucks')
  .select('*')
  .eq('assigned_station_id', stationId);
```

### Get Firetruck with Driver Info
```javascript
const { data: truck, error } = await supabase
  .from('firetrucks')
  .select(`
    *,
    driver:driver_id (user_id, full_name, role),
    station:assigned_station_id (station_name, latitude, longitude)
  `)
  .eq('truck_id', truckId)
  .single();
```

### Update Firetruck Location (Real-time from Mobile)
```javascript
const { data, error } = await supabase
  .from('firetrucks')
  .update({
    current_latitude: 14.5995,
    current_longitude: 120.9842,
    last_location_update: new Date().toISOString()
  })
  .eq('truck_id', truckId)
  .select();

// Also log to history
await supabase
  .from('firetruck_location_history')
  .insert([{
    truck_id: truckId,
    alarm_id: alarmId, // if responding to incident
    latitude: 14.5995,
    longitude: 120.9842,
    speed: 45.5,
    heading: 90,
    accuracy: 5.0,
    recorded_at: new Date().toISOString()
  }]);
```

### Create New Firetruck
```javascript
const { data: newTruck, error } = await supabase
  .from('firetrucks')
  .insert([{
    truck_code: 'TR-005',
    truck_name: 'Engine 5',
    assigned_station_id: 101,
    truck_type: 'Fire Engine',
    capacity: 2000,
    is_active: true,
    driver_id: 3
  }])
  .select('truck_id');
```

### Deactivate Firetruck (Maintenance)
```javascript
const { data, error } = await supabase
  .from('firetrucks')
  .update({ is_active: false })
  .eq('truck_id', truckId);
```

---

## Alarms (Incidents)

### Create New Incident/Alarm
```javascript
const { data: alarm, error } = await supabase
  .from('alarms')
  .insert([{
    end_user_id: callerId,
    user_latitude: 14.5995,
    user_longitude: 120.9842,
    initial_alarm_level: 'Alarm 2',
    current_alarm_level: 'Alarm 2',
    status: 'Pending Dispatch',
    assigned_station_id: stationId,
    assigned_truck_id: null,
    call_time: new Date().toISOString()
  }])
  .select('alarm_id')
  .single();
```

### Get All Recent Incidents
```javascript
const { data: alarms, error } = await supabase
  .from('alarms')
  .select(`
    *,
    caller:end_user_id (full_name, phone_number),
    station:assigned_station_id (station_name),
    truck:assigned_truck_id (truck_code)
  `)
  .order('call_time', { ascending: false })
  .limit(50);
```

### Get Single Incident with Full Details
```javascript
const { data: incident, error } = await supabase
  .from('alarms')
  .select(`
    *,
    caller:end_user_id (user_id, full_name, phone_number),
    station:assigned_station_id (station_name, latitude, longitude),
    truck:assigned_truck_id (truck_code, current_latitude, current_longitude),
    response_log:alarm_response_log (action_type, details, action_timestamp, performed_by_user_id),
    reports:incident_reports (incident_type, narrative, injuries_reported)
  `)
  .eq('alarm_id', alarmId)
  .single();
```

### Get Incidents by Status
```javascript
const { data: alarms, error } = await supabase
  .from('alarms')
  .select('*')
  .in('status', ['Pending Dispatch', 'Dispatched'])
  .order('call_time', { ascending: false });
```

### Get Incidents at Location (GIS)
```javascript
// Get incidents within 5km of coordinates
const { data: nearby, error } = await supabase
  .rpc('get_incidents_near', {
    p_latitude: 14.5995,
    p_longitude: 120.9842,
    p_radius_km: 5
  });

// Or use raw distance calculation:
const { data: nearby, error } = await supabase
  .from('alarms')
  .select(`*`)
  .order('(user_latitude - 14.5995)^2 + (user_longitude - 120.9842)^2')
  .limit(10);
```

### Update Incident Status
```javascript
const { data, error } = await supabase
  .from('alarms')
  .update({
    status: 'Dispatched',
    assigned_station_id: stationId,
    assigned_truck_id: truckId,
    dispatch_time: new Date().toISOString()
  })
  .eq('alarm_id', alarmId)
  .select();
```

### Update Alarm Level During Incident
```javascript
const { data, error } = await supabase
  .from('alarms')
  .update({
    current_alarm_level: 'Alarm 3',
    updated_at: new Date().toISOString()
  })
  .eq('alarm_id', alarmId);

// Also log the change
await supabase
  .from('alarm_response_log')
  .insert([{
    alarm_id: alarmId,
    action_type: 'Alarm Level Change',
    details: 'Updated from Alarm 2 to Alarm 3',
    performed_by_user_id: userId,
    action_timestamp: new Date().toISOString()
  }]);
```

### Resolve Incident
```javascript
const { data, error } = await supabase
  .from('alarms')
  .update({
    status: 'Resolved',
    resolve_time: new Date().toISOString()
  })
  .eq('alarm_id', alarmId);

// Log resolution
await supabase
  .from('alarm_response_log')
  .insert([{
    alarm_id: alarmId,
    action_type: 'Resolved',
    performed_by_user_id: userId,
    action_timestamp: new Date().toISOString()
  }]);
```

---

## Alarm Response Log

### Log Action on Incident
```javascript
const { data, error } = await supabase
  .from('alarm_response_log')
  .insert([{
    alarm_id: alarmId,
    action_type: 'Unit Dispatched',
    details: 'Fire Engine TR-001 dispatched to scene',
    performed_by_user_id: userId,
    action_timestamp: new Date().toISOString()
  }]);
```

### Get Full Incident History/Timeline
```javascript
const { data: timeline, error } = await supabase
  .from('alarm_response_log')
  .select(`
    *,
    performed_by:performed_by_user_id (full_name, role)
  `)
  .eq('alarm_id', alarmId)
  .order('action_timestamp', { ascending: true });
```

### Bulk Log Actions (Multiple Updates)
```javascript
const actions = [
  { action_type: 'Initial Dispatch', details: 'Incident reported' },
  { action_type: 'Unit Dispatched', details: 'Truck TR-001 sent' },
  { action_type: 'On Scene', details: 'Arrived at location' }
];

const logsToInsert = actions.map(a => ({
  alarm_id: alarmId,
  action_type: a.action_type,
  details: a.details,
  performed_by_user_id: userId,
  action_timestamp: new Date().toISOString()
}));

const { data, error } = await supabase
  .from('alarm_response_log')
  .insert(logsToInsert);
```

---

## Incident Reports

### Create Incident Report
```javascript
const { data: report, error } = await supabase
  .from('incident_reports')
  .insert([{
    alarm_id: alarmId,
    report_type: 'Fire',
    incident_type: 'House Fire',
    location: '123 Main St, City',
    narrative: 'Multi-storey residential building on fire...',
    submitted_by_user_id: userId,
    submitted_at: new Date().toISOString(),
    property_affected: 'Residential Building',
    injuries_reported: 2,
    deaths_reported: 0
  }])
  .select('report_id');
```

### Get Incident Report
```javascript
const { data: report, error } = await supabase
  .from('incident_reports')
  .select(`
    *,
    submitted_by:submitted_by_user_id (full_name, role)
  `)
  .eq('report_id', reportId)
  .single();
```

### Get All Reports for Incident
```javascript
const { data: reports, error } = await supabase
  .from('incident_reports')
  .select('*')
  .eq('alarm_id', alarmId)
  .order('submitted_at', { ascending: false });
```

### Update Report
```javascript
const { data, error } = await supabase
  .from('incident_reports')
  .update({
    narrative: 'Updated narrative with new info...',
    injuries_reported: 3,
    updated_at: new Date().toISOString()
  })
  .eq('report_id', reportId);
```

---

## Station Readiness

### Submit Daily Station Readiness
```javascript
const { data: readiness, error } = await supabase
  .from('station_readiness')
  .insert([{
    station_id: stationId,
    submitted_by_user_id: userId,
    status: 'READY',
    readiness_percentage: 100,
    equipment_checklist: {
      firetruck: true,
      scba: true,
      hoses: true,
      radio: true,
      water: true,
      crew: true,
      oic: true,
      driver: true,
      generator: true
    },
    notes: 'All equipment operational',
    submitted_at: new Date().toISOString()
  }])
  .select('readiness_id');
```

### Get Latest Readiness for Station
```javascript
const { data: readiness, error } = await supabase
  .from('station_readiness')
  .select(`
    *,
    submitted_by:submitted_by_user_id (full_name)
  `)
  .eq('station_id', stationId)
  .order('submitted_at', { ascending: false })
  .limit(1)
  .single();
```

### Get All Stations' Readiness Overview
```javascript
const { data: overview, error } = await supabase
  .from('station_readiness')
  .select(`
    station_id,
    status,
    readiness_percentage,
    submitted_at,
    station:station_id (station_name)
  `)
  .eq('submitted_at', (
    (select max(submitted_at) from station_readiness as sr2 
     where sr2.station_id = station_readiness.station_id)
  ));
```

---

## Firetruck Location History

### Record Location Update (Call Every 5-10 seconds from Mobile)
```javascript
const { data, error } = await supabase
  .from('firetruck_location_history')
  .insert([{
    truck_id: truckId,
    alarm_id: activeAlarmId, // null if not responding
    latitude: currentLat,
    longitude: currentLng,
    speed: 65.5, // km/h
    heading: 180, // degrees
    accuracy: 3.2, // meters
    recorded_at: new Date().toISOString()
  }]);
```

### Get Route History for Truck During Incident
```javascript
const { data: route, error } = await supabase
  .from('firetruck_location_history')
  .select('*')
  .eq('truck_id', truckId)
  .eq('alarm_id', alarmId)
  .order('recorded_at', { ascending: true });
```

### Get Recent Positions for All Trucks (Last 5 minutes)
```javascript
const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();

const { data: recentPositions, error } = await supabase
  .from('firetruck_location_history')
  .select(`
    truck_id,
    latitude,
    longitude,
    speed,
    recorded_at,
    truck:truck_id (truck_code, truck_name)
  `)
  .gte('recorded_at', fiveMinutesAgo)
  .order('recorded_at', { ascending: false });
```

---

## 📊 Reporting Queries

### Total Incidents by Type
```javascript
const { data: stats, error } = await supabase
  .from('incident_reports')
  .select('incident_type')
  .then(({ data }) => {
    const grouped = data.reduce((acc, item) => {
      acc[item.incident_type] = (acc[item.incident_type] || 0) + 1;
      return acc;
    }, {});
    return grouped;
  });
```

### Average Response Time
```javascript
const { data: incidents, error } = await supabase
  .from('alarms')
  .select('call_time, dispatch_time')
  .not('dispatch_time', 'is', null);

// Calculate in JavaScript:
const avgResponseTime = incidents.reduce((sum, inc) => {
  const callTime = new Date(inc.call_time);
  const dispatchTime = new Date(inc.dispatch_time);
  return sum + (dispatchTime - callTime);
}, 0) / incidents.length / 1000 / 60; // in minutes
```

### Incidents by Station
```javascript
const { data: byStation, error } = await supabase
  .from('alarms')
  .select('assigned_station_id')
  .not('assigned_station_id', 'is', null)
  .then(({ data }) => {
    const grouped = data.reduce((acc, item) => {
      acc[item.assigned_station_id] = (acc[item.assigned_station_id] || 0) + 1;
      return acc;
    }, {});
    return grouped;
  });
```

---

## 🚀 Common Transaction Patterns

### Atomic Incident Creation (Station Signup + Create)
```javascript
try {
  // 1. Create fire station
  const { data: station, error: stationErr } = await supabase
    .from('fire_stations')
    .insert([{
      station_name: 'New Station',
      station_type: 'Substation',
      latitude: 14.5995,
      longitude: 120.9842,
      head_officer: 'Officer Name'
    }])
    .select('station_id')
    .single();

  if (stationErr) throw stationErr;

  // 2. Create station admin user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .insert([{
      id_number: 'BFP-NEW-001',
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      phone_number: '9991234567',
      password: hashedPassword,
      role: 'substation_admin',
      assigned_station_id: station.station_id
    }])
    .select('user_id')
    .single();

  if (userErr) throw userErr;

  return { stationId: station.station_id, userId: user.user_id };

} catch (error) {
  // Rollback: delete station if user creation failed
  if (station?.station_id) {
    await supabase.from('fire_stations').delete().eq('station_id', station.station_id);
  }
  throw error;
}
```

---

**Last Updated:** February 10, 2026  
**Works with:** Node.js, React, React Native/Expo, TypeScript, JavaScript
