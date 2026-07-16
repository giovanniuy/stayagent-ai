import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { repriceAll, repriceListing } from '../services/pricingAgent.js';

const router = Router();
router.use(authRequired);

// Configuración del HUÉSPED AUTOMÁTICO
router.get('/settings', async (req, res) => {
  const { rows: [s] } = await query(
    `SELECT * FROM ai_agent_settings WHERE user_id=$1`, [req.user.sub]);
  res.json(s ?? {});
});

router.patch('/settings', async (req, res) => {
  const { auto_guest_enabled, auto_guest_budget_max, auto_guest_prefs, require_confirmation_above } = req.body;
  const { rows: [s] } = await query(
    `INSERT INTO ai_agent_settings (user_id, auto_guest_enabled, auto_guest_budget_max, auto_guest_prefs, require_confirmation_above)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id) DO UPDATE SET
       auto_guest_enabled=$2, auto_guest_budget_max=$3, auto_guest_prefs=$4,
       require_confirmation_above=$5, updated_at=now()
     RETURNING *`,
    [req.user.sub, auto_guest_enabled, auto_guest_budget_max,
     JSON.stringify(auto_guest_prefs ?? {}), require_confirmation_above]);
  res.json(s);
});

// Ejecutar repricing manual de un inmueble o de todos
router.post('/pricing/run', async (req, res) => {
  const { listing_id } = req.body;
  if (listing_id) return res.json(await repriceListing(listing_id));
  res.json(await repriceAll());
});

export default router;
