// =============================================================
// AGENTE 2 — HUÉSPED AUTOMÁTICO
// Actúa en nombre del inquilino: solicita, negocia y da el
// visto bueno a ofertas del propietario (humano o chatbot).
// =============================================================
import { query } from '../db.js';
import { chat, chatJSON } from './aiProvider.js';

const SYSTEM_GUEST = `Sos el HUÉSPED AUTOMÁTICO de StayAgent AI. Actuás en nombre del inquilino.
Tu objetivo: encontrar el mejor trato para el huésped respetando su presupuesto y preferencias.
Reglas:
- Negociá precio si supera el presupuesto máximo del huésped.
- Confirmá SOLO si: precio_total <= presupuesto y el inmueble cumple las preferencias.
- Si la oferta es aceptable, respondé al final: GUEST_APPROVAL:{"accept":true,"final_price":número}
- Si no, GUEST_APPROVAL:{"accept":false,"reason":"...","counter_offer":número}`;

export async function guestAgentReply(conversationId, hostMessage) {
  const { rows: [conv] } = await query(
    `SELECT c.*, l.title, l.class, l.amenities, l.max_guests,
            COALESCE(l.current_price, l.base_price) AS price, l.currency
     FROM conversations c JOIN listings l ON l.id = c.listing_id
     WHERE c.id = $1`, [conversationId]);

  const { rows: [settings] } = await query(
    `SELECT * FROM ai_agent_settings WHERE user_id=$1`, [conv.guest_id]);

  const { rows: history } = await query(
    `SELECT sender_kind, body FROM messages WHERE conversation_id=$1
     ORDER BY created_at DESC LIMIT 20`, [conversationId]);

  const context = `
PRESUPUESTO MÁXIMO/NOCHE: ${settings?.auto_guest_budget_max ?? 'sin límite'}
PREFERENCIAS DEL HUÉSPED: ${JSON.stringify(settings?.auto_guest_prefs ?? {})}
OFERTA DEL INMUEBLE: ${conv.title} (${conv.class}), precio base ${conv.price} ${conv.currency}, amenities ${JSON.stringify(conv.amenities)}
HISTORIAL: ${history.map(m => `[${m.sender_kind}] ${m.body}`).reverse().join('\n')}
ÚLTIMO MENSAJE DEL ANFITRIÓN: ${hostMessage}`;

  const reply = await chat(SYSTEM_GUEST, context);

  await query(
    `INSERT INTO messages (conversation_id, sender_kind, body) VALUES ($1,'ai_guest',$2)`,
    [conversationId, reply]);

  const match = reply.match(/GUEST_APPROVAL:(\{.*\})/s);
  if (match) {
    try {
      const approval = JSON.parse(match[1]);
      if (approval.accept) {
        // visto bueno → marcar reserva pendiente como aceptada por el huésped
        await query(
          `UPDATE bookings SET status='aceptada', closed_by_ai=true
           WHERE listing_id=$1 AND guest_id=$2 AND status='pendiente'`,
          [conv.listing_id, conv.guest_id]);
        await query(
          `INSERT INTO messages (conversation_id, sender_kind, body)
           VALUES ($1,'sistema','El Huésped Automático dio el visto bueno a la oferta.')`,
          [conversationId]);
      }
      return { reply, approval };
    } catch (e) {
      console.error('GUEST_APPROVAL inválido:', e.message);
    }
  }
  return { reply };
}

/** El agente busca y solicita reservas por iniciativa propia */
export async function guestAgentSearchAndRequest(userId, { areas, checkIn, checkOut }) {
  const { rows: [settings] } = await query(
    `SELECT * FROM ai_agent_settings WHERE user_id=$1 AND auto_guest_enabled=true`, [userId]);
  if (!settings) return { error: 'Huésped Automático no activado' };

  const decision = await chatJSON(SYSTEM_GUEST, `
Buscá entre estos inmuebles candidatos el mejor para tu huésped y generá la solicitud.
JSON: {"listing_id":"...","mensaje_solicitud":"..."}`,
    {});

  return decision;
}
