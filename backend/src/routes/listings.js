import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { repriceListing } from '../services/pricingAgent.js';

const router = Router();

// Listado público con fotos
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT l.id, l.title, l.class, COALESCE(l.current_price,l.base_price) AS price, l.currency,
            l.city, l.country, l.max_guests, l.rating_avg, l.rating_count, l.status,
            ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
            l.auto_host_enabled, l.dynamic_pricing,
            COALESCE((SELECT json_agg(p.url ORDER BY p.sort_order) FROM listing_photos p
                      WHERE p.listing_id=l.id), '[]') AS photos
     FROM listings l WHERE l.status <> 'inactivo' ORDER BY l.created_at DESC`);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows: [listing] } = await query(
    `SELECT l.*, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
            COALESCE((SELECT json_agg(p.url ORDER BY p.sort_order) FROM listing_photos p
                      WHERE p.listing_id=l.id), '[]') AS photos,
            (SELECT json_build_object('full_name',u.full_name,'photo_url',u.photo_url)
             FROM users u WHERE u.id=l.host_id) AS host
     FROM listings l WHERE l.id=$1`, [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Inmueble no encontrado' });
  res.json(listing);
});

// Crear inmueble (anfitrión o admin)
router.post('/', authRequired, roleRequired('anfitrion', 'admin'), async (req, res) => {
  const { title, description, class: klass, base_price, lat, lng, address, city, country,
          max_guests = 2, bathrooms = 1, amenities = [], price_min, price_max } = req.body;
  const { rows: [l] } = await query(
    `INSERT INTO listings (host_id, title, description, class, base_price, geom,
       address, city, country, max_guests, bathrooms, amenities, price_min, price_max, current_price)
     VALUES ($1,$2,$3,$4,$5, ST_GeogFromText($6),$7,$8,$9,$10,$11,$12,$13,$14,$5)
     RETURNING *`,
    [req.user.sub, title, description, klass, base_price,
     `POINT(${lng} ${lat})`, address, city, country, max_guests, bathrooms,
     JSON.stringify(amenities), price_min, price_max]);
  res.status(201).json(l);
});

// Activar/desactivar ANFITRIÓN AUTOMÁTICO
router.patch('/:id/auto-host', authRequired, async (req, res) => {
  const { enabled, prompt } = req.body;
  const { rows: [l] } = await query(
    `UPDATE listings SET auto_host_enabled=$1, auto_host_prompt=COALESCE($2, auto_host_prompt)
     WHERE id=$3 AND host_id=$4 RETURNING id, auto_host_enabled, auto_host_prompt`,
    [enabled, prompt, req.params.id, req.user.sub]);
  if (!l) return res.status(404).json({ error: 'Inmueble no encontrado o no sos el dueño' });
  res.json(l);
});

// Activar/desactivar PRICING DINÁMICO + rango min/max
router.patch('/:id/dynamic-pricing', authRequired, async (req, res) => {
  const { enabled, price_min, price_max } = req.body;
  const { rows: [l] } = await query(
    `UPDATE listings SET dynamic_pricing=$1, price_min=$2, price_max=$3
     WHERE id=$4 AND host_id=$5 RETURNING *`,
    [enabled, price_min, price_max, req.params.id, req.user.sub]);
  if (!l) return res.status(404).json({ error: 'Inmueble no encontrado o no sos el dueño' });
  if (enabled) await repriceListing(l.id);
  const { rows: [updated] } = await query(`SELECT * FROM listings WHERE id=$1`, [l.id]);
  res.json(updated);
});

// Cambio de estado operativo: APTO_USADO / APTO_LISTO / etc.
router.patch('/:id/status', authRequired, async (req, res) => {
  const { status, note } = req.body;
  const { rows: [old] } = await query(`SELECT status FROM listings WHERE id=$1 AND host_id=$2`,
    [req.params.id, req.user.sub]);
  if (!old) return res.status(404).json({ error: 'Inmueble no encontrado' });
  const { rows: [l] } = await query(
    `UPDATE listings SET status=$1 WHERE id=$2 RETURNING *`, [status, req.params.id]);
  await query(
    `INSERT INTO property_status_log (listing_id, old_status, new_status, changed_by, note)
     VALUES ($1,$2,$3,$4,$5)`,
    [req.params.id, old.status, status, req.user.sub, note ?? null]);
  res.json(l);
});

// Inmuebles del anfitrión logueado
router.get('/mine/all', authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT l.*, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
            COALESCE((SELECT json_agg(p.url) FROM listing_photos p WHERE p.listing_id=l.id),'[]') AS photos
     FROM listings l WHERE l.host_id=$1 ORDER BY l.created_at DESC`, [req.user.sub]);
  res.json(rows);
});

export default router;
