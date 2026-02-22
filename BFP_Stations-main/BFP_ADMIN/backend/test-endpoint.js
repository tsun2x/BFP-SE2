import { pool } from './config/database.js';

(async () => {
  try {
    console.log('Testing GET /api/firestations query...');
    const [rows] = await pool.query('SELECT station_id, station_name, province, city, contact_number, latitude, longitude, station_type FROM fire_stations ORDER BY station_name ASC');
    console.log('Query result:', rows);
    console.log('Number of stations returned:', rows.length);
    if (rows.length > 0) {
      console.log('First station:', rows[0]);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
