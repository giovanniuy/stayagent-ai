import Stripe from 'stripe';
import { config } from '../../config.js';
import { query } from '../../db.js';

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

export async function createStripePayment(booking) {
  if (!stripe) {
    // MODO DEMO sin claves: simula aprobación
    return { provider: 'stripe', provider_ref: `pi_demo_${Date.now()}`, status: 'aprobado', demo: true };
  }
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(Number(booking.total_amount) * 100),
    currency: booking.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true }, // tarjetas débito/crédito internacionales y locales
    metadata: { booking_id: booking.id },
  });
  return { provider: 'stripe', provider_ref: intent.id, client_secret: intent.client_secret, status: 'pendiente' };
}

export async function handleStripeWebhook(rawBody, signature) {
  const event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    await query(
      `UPDATE payments SET status='aprobado', raw_response=$1 WHERE provider_ref=$2`,
      [JSON.stringify(intent), intent.id]);
    await query(
      `UPDATE bookings SET status='pagada' WHERE id=$1`,
      [intent.metadata.booking_id]);
  }
  return { received: true };
}
