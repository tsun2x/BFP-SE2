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

const uploadDataUrlToStorage = async (dataUrl, prefix = 'news') => {
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

// GET /api/news
router.get('/news', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news_room')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('GET /news error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch news', error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('GET /news exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch news', error: e.message });
  }
});

// POST /api/news
router.post('/news', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      headline_image,
      additional_images,
      published,
      author,
    } = req.body || {};

    if (!String(title || '').trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const now = new Date().toISOString();

    let headlineUrl = headline_image || null;
    if (isDataUrl(headlineUrl)) {
      headlineUrl = await uploadDataUrlToStorage(headlineUrl, 'headline');
    }

    let additionalUrls = Array.isArray(additional_images) ? additional_images : [];
    additionalUrls = await Promise.all(
      additionalUrls.map(async (img, idx) => {
        if (isDataUrl(img)) {
          return uploadDataUrlToStorage(img, `additional_${idx}`);
        }
        return img;
      })
    );

    let authorArr = author;
    if (typeof authorArr === 'string') {
      authorArr = authorArr.trim() ? [authorArr.trim()] : [];
    } else if (!Array.isArray(authorArr)) {
      authorArr = [];
    }

    const payload = {
      title: String(title).trim(),
      description: description || '',
      user_id: req.user?.id || null,
      headline_image: headlineUrl,
      additional_images: additionalUrls,
      published: Boolean(published),
      published_at: published ? now : null,
      date: now,
      slug: String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      metadata: {},
      created_at: now,
      updated_at: now,
      author: authorArr,
    };

    const { data, error } = await supabase.from('news_room').insert([payload]).select('*').single();

    if (error) {
      console.error('POST /news error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create news', error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('POST /news exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to create news', error: e.message });
  }
});

// PUT /api/news/:id
router.put('/news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

    const {
      title,
      description,
      headline_image,
      additional_images,
      published,
      author,
    } = req.body || {};

    if (!String(title || '').trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const now = new Date().toISOString();

    let headlineUrl = headline_image || null;
    if (isDataUrl(headlineUrl)) {
      headlineUrl = await uploadDataUrlToStorage(headlineUrl, 'headline');
    }

    let additionalUrls = Array.isArray(additional_images) ? additional_images : [];
    additionalUrls = await Promise.all(
      additionalUrls.map(async (img, idx) => {
        if (isDataUrl(img)) {
          return uploadDataUrlToStorage(img, `additional_${idx}`);
        }
        return img;
      })
    );

    let authorArr = author;
    if (typeof authorArr === 'string') {
      authorArr = authorArr.trim() ? [authorArr.trim()] : [];
    } else if (!Array.isArray(authorArr)) {
      authorArr = [];
    }

    const payload = {
      title: String(title).trim(),
      description: description || '',
      headline_image: headlineUrl,
      additional_images: additionalUrls,
      published: Boolean(published),
      published_at: published ? now : null,
      date: now,
      slug: String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      metadata: {},
      updated_at: now,
      author: authorArr,
    };

    const { data, error } = await supabase.from('news_room').update(payload).eq('id', id).select('*').single();

    if (error) {
      console.error('PUT /news/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update news', error: error.message });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error('PUT /news/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to update news', error: e.message });
  }
});

// DELETE /api/news/:id
router.delete('/news/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

    const { error } = await supabase.from('news_room').delete().eq('id', id);

    if (error) {
      console.error('DELETE /news/:id error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete news', error: error.message });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('DELETE /news/:id exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete news', error: e.message });
  }
});

export default router;
