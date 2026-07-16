import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { hostAgentReply } from '../services/hostAgent.js';
import { guestAgentReply } from '../services/guestAgent.js';

const router = Router();

// Abrir (o recuperar) conversación sobre un inmueble
router.post('/conversations', authRequired, async (req, res) => {
  const { listing_id } = req.body;
  const { rows: [l] } = await query(`SELECT host_id FROM listings WHERE id=$1`, [listing_id]);
  if (!l) return res.status(404).json({ error: 'Inmueble no encontrado' });
  const { rows: [conv] } = await query(
    `INSERT INTO conversations (listing_id, guest_id, host_id)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING RETURNING *`,
    [listing_id, req.user.sub, l.host_id]);
  if (conv) return res.json(conv);
  const { rows: [existing] } = await query(
    `SELECT * FROM conversations WHERE listing_id=$1 AND guest_id=$2`,
    [listing_id, req.user.sub]);
  res.json(existing);
});

router.get('/conversations', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, l.title,
            (SELECT body FROM messages m WHERE m.conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message
     FROM conversations c JOIN listings l ON l.id=c.listing_id
     WHERE c.guest_id=$1 OR c.host_id=$1 ORDER BY c.created_at DESC`, [req.user.sub]);
  res.json(rows);
});

router.get('/conversations/:id/messages', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at`, [req.params.id]);
  res.json(rows);
});

/**
 * Enviar mensaje. El sistema decide quién responde:
 * - Si el anfitrión tiene AUTO-HOST → responde el agente anfitrión.
 * - Si el huésped tiene AUTO-GUEST → el agente huésped evalúa y responde.
 * - Si ambos están automáticos → los agentes negocian entre sí (hasta 4 turnos).
 */
router.post('/conversations/:id/messages', authRequired, async (req, res) => {
  const { body } = req.body;
  const convId = req.params.id;

  const { rows: [conv] } = await query(
    `SELECT c.*, l.auto_host_enabled,
            (SELECT auto_guest_enabled FROM ai_agent_settings s WHERE s.user_id=c.guest_id) AS auto_guest
     FROM conversations c JOIN listings l ON l.id=c.listing_id WHERE c.id=$1`, [convId]);
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

  const senderKind = req.user.sub === conv.guest_id ? 'huesped' : 'anfitrion';
  await query(
    `INSERT INTO messages (conversation_id, sender_kind, sender_id, body) VALUES ($1,$2,$3,$4)`,
    [convId, senderKind, req.user.sub, body]);

  let lastMessage = body;
  const transcript = [];
  const maxTurns = conv.auto_host_enabled && conv.auto_guest ? 4 : 1;

  for (let turn = 0; turn < maxTurns; turn++) {
    if (conv.auto_host_enabled && senderKind === 'huesped') {
      const { reply } = await hostAgentReply(convId, lastMessage);
      transcript.push({ from: 'ai_host', reply });
      lastMessage = reply;
      if (!conv.auto_guest) break;
    }
    if (conv.auto_guest) {
      const { reply, approval } = await guestAgentReply(convId, lastMessage);
      transcript.push({ from: 'ai_guest', reply });
      lastMessage = reply;
      if (approval?.accept) break;      // acuerdo alcanzado
      if (!conv.auto_host_enabled) break;
    } else {
      break;
    }
  }

  res.status(201).json({ sent: true, ai_transcript: transcript });
});

export default router;
