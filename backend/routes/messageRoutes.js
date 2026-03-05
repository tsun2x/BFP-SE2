import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles, isAdminUser, getUserStationId } from '../middleware/role.js';

const router = express.Router();

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
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('[GET /conversations/:id/messages] error:', error);
      return res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
    }

    return res.json({
      conversation: {
        conversationId: conversation.conversation_id,
        stationAId: conversation.station_a_id,
        stationBId: conversation.station_b_id,
        updatedAt: conversation.updated_at,
      },
      messages: messages || [],
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

export default router;
