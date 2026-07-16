// =============================================================
// AGENTE 1 — ANFITRIÓN AUTOMÁTICO
// Responde en nombre del propietario y cierra la reserva solo.
// =============================================================
import { query } from '../db.js';
import { chat, chatJSON } from './aiProvider.js';

const SYSTEM_HOST = `Sos el ANFITRIÓN AUTOMÁTICO de StayAgent AI. Actuás en nombre del propietario de un inmueble.
Tu objetivo: responder consultas del huésped, negociar dentro de las reglas del propietario y CERRAR la reserva.
Reglas:
- Sé cordial, claro y en español rioplatense neutro.
- Nunca inventes amenities ni condiciones: usá solo los datos del inmueble provistos.
- Si el huésped pide fechas disponibles y precio dentro de rango, proponé la reserva.
- Cuando haya acuerdo, devolvé al final una línea: BOOKING_DRAFT:{"check_in":"YYYY-MM-DD","check_out":"YYYY-MM-DD","agreed_price":número}
- Si falta información (fechas, cantidad de huéspedes), pedila.`;

export async function hostAgentReply(conversationId, guestMessage) {
  // 1. Contexto: conversación + inmueble + settings del anfitrión
  const { rows: [conv] } = await query(
    `SELECT c.*, l.title, l.description, l.class, l.amenities, l.max_guests,
            COALESCE(l.current_price, l.base_price) AS price, l.currency,
            l.price_min, l.price_max, l.dynamic_pricing, l.auto_host_prompt,
            l.id AS listing_id
     FROM conversations c JOIN listings l ON l.id = c.listing_id
     WHERE c.id = $1`, [conversationId]);

  const { rows: history } = await query(
    `SELECT sender_kind, body FROM messages WHERE conversation_id=$1
     ORDER BY created_at DESC LIMIT 20`, [conversationId]);

  const context = `
INMUEBLE: ${conv.title} (${conv.class}) — hasta ${conv.max_guests} huéspedes.
DESCRIPCIÓN: ${conv.description}
AMENITIES: ${JSON.stringify(conv.amenities)}
PRECIO/NOCHE: ${conv.price} ${conv.currency}. Rango permitido: ${conv.price_min} a ${conv.price_max}.
INSTRUCCIONES DEL PROPIETARIO: ${conv.auto_host_prompt || 'Ninguna especial.'}
HISTORIAL (más reciente primero): ${history.map(m => `[${m.sender_kind}] ${m.body}`).reverse().join('\n')}
MENSAJE DEL HUÉSPED: ${guestMessage}`;

  const reply = await chat(SYSTEM_HOST, context);

  // 2. Guardar respuesta del agente
  await query(
    `INSERT INTO messages (conversation_id, sender_kind, body) VALUES ($1,'ai_host',$2)`,
    [conversationId, reply]);

  // 3. Si el agente emitió BOOKING_DRAFT → crear reserva pendiente/aceptada
  const match = reply.match(/BOOKING_DRAFT:(\{.*\})/s);
  if (match) {
    try {
      const draft = JSON.parse(match[1]);
      const agreed = Number(draft.agreed_price);
      if (agreed >= (conv.price_min ?? 0) && agreed <= (conv.price_max ?? Infinity)) {
        const { rows: [booking] } = await query(
          `INSERT INTO bookings (listing_id, guest_id, check_in, check_out, price_night, total_amount, status, closed_by_ai)
           VALUES ($1,$2,$3,$4,$5, $5 * ($4::date - $3::date), 'aceptada', true) RETURNING *`,
          [conv.listing_id, conv.guest_id, draft.check_in, draft.check_out, agreed]);
        await query(
          `INSERT INTO messages (conversation_id, sender_kind, body, metadata)
           VALUES ($1,'sistema',$2,$3)`,
          [conversationId, `Reserva creada automáticamente por el Anfitrión Automático (#${booking.id.slice(0,8)})`,
           JSON.stringify({ booking_id: booking.id })]);
        return { reply, booking };
      }
    } catch (e) {
      console.error('BOOKING_DRAFT inválido:', e.message);
    }
  }
  return { reply };
}

/** Evalúa una reserva pendiente y la acepta/rechaza sin intervención humana */
export async function hostAgentDecide(bookingId) {
  const { rows: [b] } = await query(
    `SELECT b.*, l.price_min, l.price_max, l.auto_host_prompt, l.title
     FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE b.id=$1`, [bookingId]);

  const decision = await chatJSON(SYSTEM_HOST, `
El huésped solicitó una reserva:
- Inmueble: ${b.title}
- Fechas: ${b.check_in} a ${b.check_out} (${b.nights} noches)
- Precio ofrecido/noche: ${b.price_night} (rango permitido ${b.price_min}-${b.price_max})
¿Aceptar o rechazar? JSON: {"decision":"aceptar"|"rechazar","motivo":"..."}`,
    { decision: 'aceptar', motivo: 'Dentro de rango' });

  const status = decision.decision === 'aceptar' ? 'aceptada' : 'rechazada';
  await query(`UPDATE bookings SET status=$1, closed_by_ai=true WHERE id=$2`, [status, bookingId]);
  return { status, motivo: decision.motivo };
}
