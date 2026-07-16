import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { config } from '../../config.js';
import { query } from '../../db.js';

const client = config.mercadopagoAccessToken
  ? new MercadoPagoConfig({ accessToken: config.mercadopagoAccessToken })
  : null;

export async function createMercadoPagoPayment(booking, listing) {
  if (!client) {
    // MODO DEMO sin claves
    return { provider: 'mercadopago', provider_ref: `mp_demo_${Date.now()}`, status: 'aprobado', demo: true };
  }
  const preference = await new Preference(client).create({
    body: {
      items: [{
        id: booking.id,
        title: `${listing.title} — ${booking.nights} noches`,
        quantity: 1,
        unit_price: Number(booking.total_amount),
        currency_id: booking.currency, // ARS, UYU, BRL, MXN... según país
      }],
      external_reference: booking.id,
      back_urls: {
        success: `${config.frontendUrl}/pago/exito`,
        failure: `${config.frontendUrl}/pago/error`,
        pending: `${config.frontendUrl}/pago/pendiente`,
      },
      auto_return: 'approved',
    },
  });
  return {
    provider: 'mercadopago',
    provider_ref: preference.id,
    init_point: preference.init_point,
    status: 'pendiente',
  };
}

export async function handleMercadoPagoWebhook(paymentId) {
  const payment = await new Payment(client).get({ id: paymentId });
  if (payment.status === 'approved') {
    await query(
      `UPDATE payments SET status='aprobado', raw_response=$1 WHERE provider_ref=$2`,
      [JSON.stringify(payment), String(paymentId)]);
    await query(
      `UPDATE bookings SET status='pagada' WHERE id=$1`,
      [payment.external_reference]);
  }
  return { received: true };
}
