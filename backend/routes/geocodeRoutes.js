import express from 'express';
import https from 'https';

const router = express.Router();

const httpGetJson = (url, headers = {}) => {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const statusCode = res.statusCode || 0;
        if (statusCode < 200 || statusCode >= 300) {
          return reject(new Error(`Geocoding failed: HTTP ${statusCode}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Geocoding failed: invalid JSON response'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
};

router.get('/geocode', async (req, res) => {
  try {
    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query?.limit === 'string' ? req.query.limit : '5';
    const limit = Math.min(10, Math.max(1, Number(limitRaw) || 5));

    if (!q) {
      return res.status(400).json({ success: false, message: 'q is required' });
    }

    const ua = process.env.NOMINATIM_USER_AGENT || 'BFP-SE2/1.0 (Nominatim proxy)';
    const base = 'https://nominatim.openstreetmap.org/search';
    const url = `${base}?format=json&addressdetails=1&limit=${encodeURIComponent(String(limit))}&q=${encodeURIComponent(q)}`;

    const data = await httpGetJson(url, {
      'User-Agent': ua,
      'Accept': 'application/json',
    });

    const results = (Array.isArray(data) ? data : []).map((r) => ({
      place_id: r.place_id,
      display_name: r.display_name,
      lat: r.lat,
      lon: r.lon,
      type: r.type,
      importance: r.importance,
      address: r.address,
    }));

    return res.json({ success: true, query: q, results });
  } catch (e) {
    console.error('[GET /geocode] error:', e);
    return res.status(500).json({ success: false, message: 'Failed to geocode query', error: e.message });
  }
});

export default router;
