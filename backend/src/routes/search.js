import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * POST /api/search/areas
 * Búsqueda por rectángulo(s) dibujados sobre el mapa.
 * body: { areas: [{minLng,minLat,maxLng,maxLat}, ...],
 *         class?, minPrice?, maxPrice? }
 */
router.post('/areas', async (req, res) => {
  const { areas = [], class: klass, minPrice, maxPrice } = req.body;
  if (!areas.length) return res.status(400).json({ error: 'Dibujá al menos un rectángulo' });

  const polygons = areas.map(a => `POLYGON((${a.minLng} ${a.minLat}, ${a.maxLng} ${a.minLat}, ${a.maxLng} ${a.maxLat}, ${a.minLng} ${a.maxLat}, ${a.minLng} ${a.minLat}))`);

  const { rows } = await query(
    `SELECT DISTINCT l.id, l.title, l.class, COALESCE(l.current_price,l.base_price) AS price,
            l.currency, l.city, l.max_guests, l.rating_avg, l.status, l.auto_host_enabled,
            ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
            COALESCE((SELECT json_agg(p.url ORDER BY p.sort_order) FROM listing_photos p
                      WHERE p.listing_id=l.id), '[]') AS photos
     FROM listings l
     WHERE l.status IN ('apto_listo','apto_ocupado')
       AND ($2::text IS NULL OR l.class = $2::property_class)
       AND ($3::numeric IS NULL OR COALESCE(l.current_price,l.base_price) >= $3)
       AND ($4::numeric IS NULL OR COALESCE(l.current_price,l.base_price) <= $4)
       AND EXISTS (
         SELECT 1 FROM unnest($1::text[]) poly
         WHERE ST_Intersects(l.geom, ST_GeogFromText(poly))
       )`,
    [polygons, klass ?? null, minPrice ?? null, maxPrice ?? null]);
  res.json(rows);
});

export default router;
