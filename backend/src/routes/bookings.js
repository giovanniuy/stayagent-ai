import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { hostAgentDecide } from '../services/hostAgent.js';

const router = Router();

// Crear solicitud de reserva (huésped humano o su agente)
router.post('/', authRequired, async (req, res) => {
  const { listing_id, check_in, check_out, offer_price } = req.body;
  const { rows: [l] } = await query(`SELECT * FROM listings WHERE id=$1`, [listing_id]);
  if (!l) return res.status(404).json({ error: 'Inmueble no encontrado' });

  const price = offer_price ?? l.current_price ?? l.base_price;
  const { rows: [booking] } = await query(
    `INSERT INTO bookings (listing_id, guest_id, check_in, check_out, price_night, total_amount, status)
     VALUES ($1,$2,$3,$4,$5, $5 * ($4::date - $3::date), 'pendiente') RETURNING *`,
    [listing_id, req.user.sub, check_in, check_out, price]);

  // Si el anfitrión tiene ANFITRIÓN AUTOMÁTICO → el agente decide solo
  if (l.auto_host_enabled) {
    const decision = await hostAgentDecide(booking.id);
    const { rows: [updated] } = await query(`SELECT * FROM bookings WHERE id=$1`, [booking.id]);
    return res.status(201).json({ booking: updated, ai_decision: decision });
  }
  res.status(201).json({ booking });
});

// Mis reservas (como huésped o como anfitrión)
router.get('/mine', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT b.*, l.title, l.id AS listing_id,
            (SELECT p.url FROM listing_photos p WHERE p.listing_id=l.id AND p.is_cover LIMIT 1) AS photo
     FROM bookings b JOIN listings l ON l.id=b.listing_id
     WHERE b.guest_id=$1 OR l.host_id=$1
     ORDER BY b.created_at DESC`, [req.user.sub]);
  res.json(rows);
});

// Anfitrión humano acepta/rechaza
router.patch('/:id/status', authRequired, async (req, res) => {
  const { status } = req.body; // aceptada | rechazada | cancelada | checkin | checkout
  const { rows: [b] } = await query(
    `UPDATE bookings b SET status=$1
     FROM listings l
     WHERE b.listing_id=l.id AND b.id=$2 AND (l.host_id=$3 OR b.guest_id=$3)
     RETURNING b.*`, [status, req.params.id, req.user.sub]);
  if (!b) return res.status(404).json({ error: 'Reserva no encontrada' });

  // checkout → el inmueble pasa a APTO_USADO automáticamente
  if (status === 'checkout') {
    await query(
      `UPDATE listings SET status='apto_usado' WHERE id=$1`, [b.listing_id]);
    await query(
      `INSERT INTO property_status_log (listing_id, old_status, new_status, changed_by, note)
       VALUES ($1,'apto_ocupado','apto_usado',$2,'Checkout → pendiente limpieza')`,
      [b.listing_id, req.user.sub]);
  }
  if (status === 'checkin')
    await query(`UPDATE listings SET status='apto_ocupado' WHERE id=$1`, [b.listing_id]);

  res.json(b);
});

export default router;
