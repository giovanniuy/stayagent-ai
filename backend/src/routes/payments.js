import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { createStripePayment, handleStripeWebhook } from '../services/payments/stripe.js';
import { createMercadoPagoPayment, handleMercadoPagoWebhook } from '../services/payments/mercadopago.js';
import { config } from '../config.js';

const router = Router();

// Pagar una reserva aceptada: provider = 'stripe' | 'mercadopago'
router.post('/checkout', authRequired, async (req, res) => {
  const { booking_id, provider } = req.body;
  const { rows: [b] } = await query(
    `SELECT b.*, l.title FROM bookings b JOIN listings l ON l.id=b.listing_id
     WHERE b.id=$1 AND b.guest_id=$2`, [booking_id, req.user.sub]);
  if (!b) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (!['aceptada', 'pendiente'].includes(b.status))
    return res.status(400).json({ error: `La reserva está en estado ${b.status}` });

  const fee = Math.round(Number(b.total_amount) * config.platformFeePct) / 100;
  const payout = Number(b.total_amount) - fee;

  let result;
  if (provider === 'mercadopago') result = await createMercadoPagoPayment(b, b);
  else result = await createStripePayment(b);

  const { rows: [payment] } = await query(
    `INSERT INTO payments (booking_id, provider, provider_ref, amount, currency, status, platform_fee, host_payout)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [b.id, result.provider, result.provider_ref, b.total_amount, b.currency,
     result.status, fee, payout]);

  // En modo demo el pago queda aprobado de inmediato
  if (result.demo) {
    await query(`UPDATE bookings SET status='pagada' WHERE id=$1`, [b.id]);
    await query(
      `INSERT INTO expenses (listing_id, booking_id, category, description, amount)
       VALUES ($1,$2,'comision_plataforma','Comisión plataforma',$3)`,
      [b.listing_id, b.id, fee]);
  }

  res.status(201).json({ payment, checkout: result });
});

// Webhooks (sin auth — los firma el proveedor)
router.post('/webhooks/stripe', async (req, res) => {
  const r = await handleStripeWebhook(req.body, req.headers['stripe-signature']);
  res.json(r);
});

router.post('/webhooks/mercadopago', async (req, res) => {
  const paymentId = req.query['data.id'] || req.body?.data?.id;
  if (paymentId) await handleMercadoPagoWebhook(paymentId);
  res.json({ received: true });
});

export default router;
