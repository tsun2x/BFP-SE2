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

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');

const dataUrlToBuffer = (dataUrl) => {
  const match = String(dataUrl).match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  return { mime, buffer };
};

const getExtFromMime = (mime) => {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'jpg';
};

const uploadDataUrlToStorage = async (dataUrl, prefix = 'safety') => {
  const BUCKET = 'news-images';
  const { mime, buffer } = dataUrlToBuffer(dataUrl);
  const ext = getExtFromMime(mime);
  const filePath = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: mime,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload image');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
};

router.get('/safety-tip-categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('safety_tip_categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /safety-tip-categories error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('GET /safety-tip-categories exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: e.message });
  }
});

router.post('/safety-tip-categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, color, image_url } = req.body || {};
    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const now = new Date().toISOString();

    let imageUrl = image_url || null;
    if (isDataUrl(imageUrl)) {
      imageUrl = await uploadDataUrlToStorage(imageUrl, 'category');
    }

    const payload = {
      name: String(name).trim(),
      color: color || '#f8d7da',
      image_url: imageUrl,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('safety_tip_categories')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('POST /safety-tip-categories error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('POST /safety-tip-categories exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to create category', error: e.message });
  }
});

router.put('/safety-tip-categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, color, image_url } = req.body || {};

    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const now = new Date().toISOString();

    let imageUrl = image_url || null;
    if (isDataUrl(imageUrl)) {
      imageUrl = await uploadDataUrlToStorage(imageUrl, 'category');
    }

    const payload = {
      name: String(name).trim(),
      color: color || '#f8d7da',
      image_url: imageUrl,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('safety_tip_categories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('PUT /safety-tip-categories/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error('PUT /safety-tip-categories/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to update category', error: e.message });
  }
});

router.delete('/safety-tip-categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

    const { error } = await supabase.from('safety_tip_categories').delete().eq('id', id);

    if (error) {
      console.error('DELETE /safety-tip-categories/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('DELETE /safety-tip-categories/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete category', error: e.message });
  }
});

router.get('/safety-tips', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('safety_tips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /safety-tips error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch safety tips', error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('GET /safety-tips exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch safety tips', error: e.message });
  }
});

router.post('/safety-tips', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { section, category_id, task, description, image_url } = req.body || {};

    if (!String(task || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ success: false, message: 'Task and description are required' });
    }

    const now = new Date().toISOString();

    let imageUrl = image_url || null;
    if (isDataUrl(imageUrl)) {
      imageUrl = await uploadDataUrlToStorage(imageUrl, 'safety_tip');
    }

    const payload = {
      user_id: req.user?.id || null,
      section: section || 'general',
      category_id: category_id ?? null,
      task: String(task).trim(),
      description: String(description).trim(),
      image_url: imageUrl,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase.from('safety_tips').insert([payload]).select('*').single();

    if (error) {
      console.error('POST /safety-tips error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create safety tip', error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('POST /safety-tips exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to create safety tip', error: e.message });
  }
});

router.put('/safety-tips/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { section, category_id, task, description, image_url } = req.body || {};

    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    if (!String(task || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ success: false, message: 'Task and description are required' });
    }

    const now = new Date().toISOString();

    let imageUrl = image_url || null;
    if (isDataUrl(imageUrl)) {
      imageUrl = await uploadDataUrlToStorage(imageUrl, 'safety_tip');
    }

    const payload = {
      section: section || 'general',
      category_id: category_id ?? null,
      task: String(task).trim(),
      description: String(description).trim(),
      image_url: imageUrl,
      updated_at: now,
    };

    const { data, error } = await supabase.from('safety_tips').update(payload).eq('id', id).select('*').single();

    if (error) {
      console.error('PUT /safety-tips/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update safety tip', error: error.message });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error('PUT /safety-tips/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to update safety tip', error: e.message });
  }
});

router.delete('/safety-tips/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

    const { error } = await supabase.from('safety_tips').delete().eq('id', id);

    if (error) {
      console.error('DELETE /safety-tips/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete safety tip', error: error.message });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('DELETE /safety-tips/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete safety tip', error: e.message });
  }
});

export default router;
