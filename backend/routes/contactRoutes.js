import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ── Admin CRUD ────────────────────────────────────────────────────────

// GET /api/contacts (admin)
router.get('/contacts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET /contacts error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch contacts', error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('GET /contacts exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch contacts', error: e.message });
  }
});

// POST /api/contacts (admin)
router.post('/contacts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, station, hotline, location, published, sort_order } = req.body || {};
    if (!station || !hotline) {
      return res.status(400).json({ success: false, message: 'Station and hotline are required' });
    }
    const now = new Date().toISOString();
    const payload = {
      category: category || 'BFP',
      station: String(station).trim(),
      hotline: String(hotline).trim(),
      location: location || '',
      published: published !== false,
      sort_order: sort_order ?? 0,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.from('emergency_contacts').insert([payload]).select('*').single();
    if (error) {
      console.error('POST /contacts error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create contact', error: error.message });
    }
    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('POST /contacts exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to create contact', error: e.message });
  }
});

// PUT /api/contacts/:id (admin)
router.put('/contacts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const { category, station, hotline, location, published, sort_order } = req.body || {};
    const payload = {
      category: category || 'BFP',
      station: String(station || '').trim(),
      hotline: String(hotline || '').trim(),
      location: location || '',
      published: published !== false,
      sort_order: sort_order ?? 0,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('emergency_contacts').update(payload).eq('id', id).select('*').single();
    if (error) {
      console.error('PUT /contacts/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update contact', error: error.message });
    }
    return res.json({ success: true, data });
  } catch (e) {
    console.error('PUT /contacts/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to update contact', error: e.message });
  }
});

// DELETE /api/contacts/:id (admin)
router.delete('/contacts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
    if (error) {
      console.error('DELETE /contacts/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete contact', error: error.message });
    }
    return res.json({ success: true });
  } catch (e) {
    console.error('DELETE /contacts/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete contact', error: e.message });
  }
});

// ── Public (read-only, published only) ────────────────────────────────

// GET /api/public/contacts
router.get('/public/contacts', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id, category, station, hotline, location')
      .eq('published', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET /public/contacts error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch contacts', error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('GET /public/contacts exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch contacts', error: e.message });
  }
});

export default router;
