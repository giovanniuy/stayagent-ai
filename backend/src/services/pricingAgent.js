// =============================================================
// AGENTE 3 — FIJACIÓN DINÁMICA DE PRECIOS
// Ajusta current_price dentro de [price_min, price_max] según
// demanda, ocupación, temporada y días de anticipación.
// =============================================================
import { query } from '../db.js';
import { chatJSON } from './aiProvider.js';

export async function repriceListing(listingId) {
  const { rows: [l] } = await query(
    `SELECT l.*,
       (SELECT COUNT(*) FROM bookings b
        WHERE b.listing_id=l.id AND b.status IN ('pagada','aceptada','checkin')
          AND b.check_in BETWEEN now()::date AND now()::date + 30) AS reservas_prox_30d,
       (SELECT COUNT(*) FROM bookings b
        WHERE b.listing_id=l.id AND b.created_at > now() - interval '7 days') AS demanda_semana
     FROM listings l WHERE l.id=$1 AND l.dynamic_pricing=true`, [listingId]);
  if (!l) return null;

  // Señales heurísticas base (siempre disponibles, sin IA)
  const base = Number(l.base_price);
  const occFactor = Math.min(Number(l.reservas_prox_30d) / 15, 1);   // 0..1
  const demandFactor = Math.min(Number(l.demanda_semana) / 5, 1);    // 0..1
  const month = new Date().getMonth() + 1;
  const highSeason = [12, 1, 2, 7].includes(month) ? 0.15 : 0;       // temporada alta UY
  let heuristic = base * (1 + 0.35 * occFactor + 0.25 * demandFactor + highSeason);

  // Refinamiento con IA (opcional; cae a heurística si falla)
  const ai = await chatJSON(
    'Sos el agente de pricing dinámico de una plataforma de alquileres. Devolvé JSON.',
    `Inmueble: ${l.title}, clase ${l.class}, precio base ${base}.
     Ocupación próximos 30d: ${(occFactor*100).toFixed(0)}%. Demanda última semana: ${l.demanda_semana} consultas.
     Mes: ${month}. Precio heurístico sugerido: ${heuristic.toFixed(2)}.
     Rango permitido: ${l.price_min} a ${l.price_max}.
     JSON: {"price": número}`,
    { price: heuristic });

  let price = Math.max(Number(l.price_min), Math.min(Number(l.price_max), Number(ai.price) || heuristic));
  price = Math.round(price * 100) / 100;

  await query(`UPDATE listings SET current_price=$1 WHERE id=$2`, [price, listingId]);
  return { listingId, oldPrice: l.current_price ?? l.base_price, newPrice: price };
}

/** Repricing masivo — corre periódicamente (cron interno) */
export async function repriceAll() {
  const { rows } = await query(`SELECT id FROM listings WHERE dynamic_pricing=true`);
  const results = [];
  for (const r of rows) results.push(await repriceListing(r.id));
  return results.filter(Boolean);
}
