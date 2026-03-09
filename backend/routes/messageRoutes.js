import express from 'express';
import multer from 'multer';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles, isAdminUser, getUserStationId } from '../middleware/role.js';

// Multer — keep files in memory so we can upload to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
});

const router = express.Router();

const MESSAGE_ATTACHMENTS_BUCKET = process.env.MESSAGE_ATTACHMENTS_BUCKET || 'message-attachments';

const extractBucketAndPathFromStorageUrl = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  try {
    const u = new URL(fileUrl);
    const parts = u.pathname.split('/').filter(Boolean);

    // Expected patterns (Supabase Storage):
    // /storage/v1/object/public/<bucket>/<path>
    // /storage/v1/object/sign/<bucket>/<path>
    const objIdx = parts.findIndex((p) => p === 'object');
    if (objIdx === -1) return null;

    const kind = parts[objIdx + 1];
    if (kind !== 'public' && kind !== 'sign') return null;

    const bucket = parts[objIdx + 2];
    const path = parts.slice(objIdx + 3).join('/');
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
};

const withAttachmentDownloadUrls = async (messages) => {
  const rows = Array.isArray(messages) ? messages : [];
  const out = [];

  for (const m of rows) {
    const atts = Array.isArray(m.message_attachments) ? m.message_attachments : [];
    if (atts.length === 0) {
      out.push(m);
      continue;
    }

    const mappedAtts = [];
    for (const att of atts) {
      const info = extractBucketAndPathFromStorageUrl(att.file_url);
      if (!info) {
        mappedAtts.push({ ...att, download_url: att.file_url || null });
        continue;
      }

      try {
        const { data, error } = await supabase.storage.from(info.bucket).createSignedUrl(info.path, 60 * 60);
        if (error) {
          mappedAtts.push({ ...att, download_url: att.file_url || null });
        } else {
          mappedAtts.push({ ...att, download_url: data?.signedUrl || att.file_url || null });
        }
      } catch {
        mappedAtts.push({ ...att, download_url: att.file_url || null });
      }
    }

    out.push({ ...m, message_attachments: mappedAtts });
  }

  return out;
};

const normalizeId = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const getConversationById = async (conversationId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('conversation_id, station_a_id, station_b_id, created_at, updated_at')
    .eq('conversation_id', conversationId)
    .single();

  if (error) throw error;
  return data;
};

const ensureConversationAccess = (req, conversation, senderStationId) => {
  if (isAdminUser(req.user)) return;
  if (!senderStationId) {
    const err = new Error('User has no assigned station');
    err.statusCode = 403;
    throw err;
  }

  const allowed =
    String(conversation.station_a_id) === String(senderStationId) ||
    String(conversation.station_b_id) === String(senderStationId);

  if (!allowed) {
    const err = new Error('Forbidden: conversation is not accessible from your station');
    err.statusCode = 403;
    throw err;
  }
};

// List conversations (admin = all; station-scoped = only conversations involving your station)
router.get('/conversations', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    let query = supabase
      .from('conversations')
      .select('conversation_id, station_a_id, station_b_id, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (!isAdmin) {
      if (!stationId) {
        return res.status(403).json({ message: 'You are not assigned to any station' });
      }
      query = query.or(`station_a_id.eq.${stationId},station_b_id.eq.${stationId}`);
    }

    const { data: conversations, error } = await query;
    if (error) {
      console.error('[GET /conversations] error:', error);
      return res.status(500).json({ message: 'Failed to fetch conversations', error: error.message });
    }

    const rows = conversations || [];
    const stationIds = Array.from(
      new Set(rows.flatMap((c) => [c.station_a_id, c.station_b_id]).filter(Boolean).map(String))
    );

    let stationsById = {};
    if (stationIds.length) {
      const { data: stations, error: stationsErr } = await supabase
        .from('fire_stations')
        .select('station_id, station_name')
        .in('station_id', stationIds);

      if (stationsErr) {
        console.error('[GET /conversations] stations error:', stationsErr);
      } else {
        stationsById = Object.fromEntries((stations || []).map((s) => [String(s.station_id), s]));
      }
    }

    const result = [];
    for (const c of rows) {
      let lastMessage = null;
      try {
        const { data: lastRows, error: lastErr } = await supabase
          .from('messages')
          .select('message_id, subject, body, sent_at, sender_station_id, recipient_station_id, is_read')
          .eq('conversation_id', c.conversation_id)
          .order('sent_at', { ascending: false })
          .limit(1);

        if (!lastErr) lastMessage = (lastRows && lastRows[0]) || null;
      } catch (e) {
        // ignore last message failure
      }

      const stationA = stationsById[String(c.station_a_id)] || null;
      const stationB = stationsById[String(c.station_b_id)] || null;

      const otherStationId =
        !isAdmin && stationId
          ? String(c.station_a_id) === String(stationId)
            ? c.station_b_id
            : c.station_a_id
          : null;

      result.push({
        conversationId: c.conversation_id,
        stationAId: c.station_a_id,
        stationBId: c.station_b_id,
        stationAName: stationA?.station_name || null,
        stationBName: stationB?.station_name || null,
        otherStationId,
        otherStationName: otherStationId ? stationsById[String(otherStationId)]?.station_name || null : null,
        updatedAt: c.updated_at,
        lastMessage,
      });
    }

    return res.json({ conversations: result });
  } catch (e) {
    console.error('[GET /conversations] exception:', e);
    return res.status(500).json({ message: 'Failed to fetch conversations', error: e.message });
  }
});

// Create (or reuse) a conversation and send first message
router.post('/conversations', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const senderStationId = getUserStationId(req.user);
    const senderUserId = req.user?.id || null;

    const recipientStationId = normalizeId(req.body?.recipientStationId);
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : null;
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!senderStationId) {
      return res.status(403).json({ message: 'You are not assigned to any station' });
    }
    if (!recipientStationId) {
      return res.status(400).json({ message: 'recipientStationId is required' });
    }
    if (String(recipientStationId) === String(senderStationId)) {
      return res.status(400).json({ message: 'Cannot message your own station' });
    }
    if (!body) {
      return res.status(400).json({ message: 'body is required' });
    }

    // Find existing conversation for the pair (either ordering)
    const { data: existingRows, error: existingErr } = await supabase
      .from('conversations')
      .select('conversation_id, station_a_id, station_b_id')
      .or(
        `and(station_a_id.eq.${senderStationId},station_b_id.eq.${recipientStationId}),and(station_a_id.eq.${recipientStationId},station_b_id.eq.${senderStationId})`
      )
      .limit(1);

    if (existingErr) {
      console.error('[POST /conversations] find existing error:', existingErr);
      return res.status(500).json({ message: 'Failed to create conversation', error: existingErr.message });
    }

    let conversationId = existingRows?.[0]?.conversation_id || null;

    if (!conversationId) {
      const { data: inserted, error: insertErr } = await supabase
        .from('conversations')
        .insert([
          {
            station_a_id: senderStationId,
            station_b_id: recipientStationId,
          },
        ])
        .select('conversation_id')
        .single();

      if (insertErr) {
        console.error('[POST /conversations] insert error:', insertErr);
        return res.status(500).json({ message: 'Failed to create conversation', error: insertErr.message });
      }

      conversationId = inserted.conversation_id;
    }

    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_station_id: senderStationId,
          recipient_station_id: recipientStationId,
          sender_user_id: senderUserId,
          subject,
          body,
        },
      ])
      .select('message_id, sent_at')
      .single();

    if (msgErr) {
      console.error('[POST /conversations] message insert error:', msgErr);
      return res.status(500).json({ message: 'Failed to send message', error: msgErr.message });
    }

    return res.status(201).json({
      success: true,
      conversationId,
      messageId: msg.message_id,
      sentAt: msg.sent_at,
    });
  } catch (e) {
    console.error('[POST /conversations] exception:', e);
    return res.status(500).json({ message: 'Failed to create conversation', error: e.message });
  }
});

// List messages in a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const conversationId = normalizeId(req.params.conversationId);
    if (!conversationId) {
      return res.status(400).json({ message: 'Invalid conversationId' });
    }

    const senderStationId = getUserStationId(req.user);
    const conversation = await getConversationById(conversationId);
    ensureConversationAccess(req, conversation, senderStationId);

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, message_attachments(attachment_id, file_url, file_name, mime_type, file_size_bytes)')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('[GET /conversations/:id/messages] error:', error);
      return res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
    }

    const messagesWithUrls = await withAttachmentDownloadUrls(messages || []);

    return res.json({
      conversation: {
        conversationId: conversation.conversation_id,
        stationAId: conversation.station_a_id,
        stationBId: conversation.station_b_id,
        updatedAt: conversation.updated_at,
      },
      messages: messagesWithUrls,
    });
  } catch (e) {
    const status = e.statusCode || 500;
    console.error('[GET /conversations/:id/messages] exception:', e);
    return res.status(status).json({ message: 'Failed to fetch messages', error: e.message });
  }
});

// Send a reply message in a conversation
router.post('/conversations/:conversationId/messages', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const conversationId = normalizeId(req.params.conversationId);
    if (!conversationId) {
      return res.status(400).json({ message: 'Invalid conversationId' });
    }

    const senderStationId = getUserStationId(req.user);
    const senderUserId = req.user?.id || null;

    if (!senderStationId) {
      return res.status(403).json({ message: 'You are not assigned to any station' });
    }

    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : null;
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!body) {
      return res.status(400).json({ message: 'body is required' });
    }

    const conversation = await getConversationById(conversationId);
    ensureConversationAccess(req, conversation, senderStationId);

    const recipientStationId =
      String(conversation.station_a_id) === String(senderStationId)
        ? conversation.station_b_id
        : conversation.station_a_id;

    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_station_id: senderStationId,
          recipient_station_id: recipientStationId,
          sender_user_id: senderUserId,
          subject,
          body,
        },
      ])
      .select('message_id, sent_at')
      .single();

    if (msgErr) {
      console.error('[POST /conversations/:id/messages] insert error:', msgErr);
      return res.status(500).json({ message: 'Failed to send message', error: msgErr.message });
    }

    return res.status(201).json({
      success: true,
      conversationId,
      messageId: msg.message_id,
      sentAt: msg.sent_at,
    });
  } catch (e) {
    const status = e.statusCode || 500;
    console.error('[POST /conversations/:id/messages] exception:', e);
    return res.status(status).json({ message: 'Failed to send message', error: e.message });
  }
});

// Delete conversation for both sides (hard delete; cascades messages)
router.delete('/conversations/:conversationId', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const conversationId = normalizeId(req.params.conversationId);
    if (!conversationId) {
      return res.status(400).json({ message: 'Invalid conversationId' });
    }

    const senderStationId = getUserStationId(req.user);
    const conversation = await getConversationById(conversationId);
    ensureConversationAccess(req, conversation, senderStationId);

    const { error } = await supabase.from('conversations').delete().eq('conversation_id', conversationId);

    if (error) {
      console.error('[DELETE /conversations/:id] error:', error);
      return res.status(500).json({ message: 'Failed to delete conversation', error: error.message });
    }

    return res.json({ success: true });
  } catch (e) {
    const status = e.statusCode || 500;
    console.error('[DELETE /conversations/:id] exception:', e);
    return res.status(status).json({ message: 'Failed to delete conversation', error: e.message });
  }
});

// Upload attachments for a message — multipart/form-data, field name "files"
router.post('/messages/:messageId/attachments', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), upload.array('files', 10), async (req, res) => {
  try {
    const messageId = normalizeId(req.params.messageId);
    if (!messageId) return res.status(400).json({ message: 'Invalid messageId' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files provided' });

    const BUCKET = MESSAGE_ATTACHMENTS_BUCKET;
    const uploaded = [];

    for (const file of req.files) {
      const ext = file.originalname.split('.').pop();
      const path = `${messageId}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

      if (uploadErr) {
        console.error('[POST /messages/:id/attachments] storage error:', uploadErr);
        // Continue with other files — don't abort entire request
        continue;
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const file_url = publicData?.publicUrl || null;

      const { data: row, error: insertErr } = await supabase
        .from('message_attachments')
        .insert({ message_id: messageId, file_url, file_name: file.originalname, mime_type: file.mimetype, file_size_bytes: file.size })
        .select('attachment_id, file_url, file_name, mime_type, file_size_bytes')
        .single();

      if (!insertErr && row) uploaded.push(row);
    }

    return res.status(201).json({ success: true, attachments: uploaded });
  } catch (e) {
    console.error('[POST /messages/:id/attachments] exception:', e);
    return res.status(500).json({ message: 'Failed to upload attachments', error: e.message });
  }
});

export default router;
