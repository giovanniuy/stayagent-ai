import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// FACTURACIÓN mensual
router.get('/facturacion', async (req, res) => {
  const { rows } = await query(`SELECT * FROM v_facturacion_mensual ORDER BY mes`);
  res.json(rows);
});

// OCUPACIÓN mensual (%)
router.get('/ocupacion', async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT ON (listing_id, mes) * FROM v_ocupacion_mensual ORDER BY listing_id, mes`);
  res.json(rows);
});

// PROFIT & LOSS por inmueble
router.get('/profit-loss', async (req, res) => {
  const { rows } = await query(`SELECT * FROM v_profit_loss`);
  res.json(rows);
});

// CASH FLOW mensual
router.get('/cash-flow', async (req, res) => {
  const { rows } = await query(`SELECT * FROM v_cash_flow`);
  res.json(rows);
});

// COSTOS por categoría
router.get('/costos', async (req, res) => {
  const { rows } = await query(
    `SELECT category, SUM(amount) AS total, COUNT(*) AS items
     FROM expenses GROUP BY category ORDER BY total DESC`);
  res.json(rows);
});

// IMPUESTOS
router.get('/impuestos', async (req, res) => {
  const { rows } = await query(
    `SELECT date_trunc('month', incurred_on) AS mes, SUM(amount) AS impuestos
     FROM expenses WHERE category='impuestos' GROUP BY mes ORDER BY mes`);
  res.json(rows);
});

// ROI por inmueble (resultado neto / inversión estimada en gastos+base)
router.get('/roi', async (req, res) => {
  const { rows } = await query(
    `SELECT listing_id, title, ingresos, gastos, resultado_neto,
            CASE WHEN gastos > 0 THEN ROUND(100.0 * resultado_neto / gastos, 2) ELSE NULL END AS roi_pct
     FROM v_profit_loss`);
  res.json(rows);
});

// BALANCE simplificado (activos = cobrado + por cobrar; pasivos = gastos pendientes)
router.get('/balance', async (req, res) => {
  const { rows: [r] } = await query(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM payments WHERE status='aprobado'),0) AS efectivo_cobrado,
       COALESCE((SELECT SUM(total_amount) FROM bookings WHERE status='aceptada'),0) AS cuentas_por_cobrar,
       COALESCE((SELECT SUM(amount) FROM expenses),0) AS gastos_acumulados,
       COALESCE((SELECT SUM(platform_fee) FROM payments WHERE status='aprobado'),0) AS comisiones_generadas`);
  res.json({
    activos: { efectivo: r.efectivo_cobrado, por_cobrar: r.cuentas_por_cobrar },
    pasivos: { gastos_acumulados: r.gastos_acumulados },
    patrimonio_neto: Number(r.efectivo_cobrado) + Number(r.cuentas_por_cobrar) - Number(r.gastos_acumulados),
    comisiones_plataforma: r.comisiones_generadas,
  });
});

// KPIs — pantalla resumen del negocio
router.get('/kpis', async (req, res) => {
  const { rows: [k] } = await query(
    `SELECT
       (SELECT COUNT(*) FROM listings WHERE status <> 'inactivo')            AS inmuebles_activos,
       (SELECT COUNT(*) FROM bookings WHERE status IN ('pagada','aceptada','checkin')) AS reservas_activas,
       (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='aprobado') AS facturacion_total,
       (SELECT COALESCE(AVG(pct_ocupacion),0) FROM v_ocupacion_mensual
        WHERE mes = date_trunc('month', CURRENT_DATE))                        AS ocupacion_mes_actual,
       (SELECT COALESCE(AVG(COALESCE(current_price,base_price)),0) FROM listings) AS adr_promedio,
       (SELECT COUNT(*) FROM bookings WHERE closed_by_ai)                     AS reservas_cerradas_por_ia,
       (SELECT COALESCE(AVG(rating_avg),0) FROM listings WHERE rating_count>0) AS rating_promedio`);
  // RevPAR = ADR × ocupación
  k.revpar = Math.round(Number(k.adr_promedio) * Number(k.ocupacion_mes_actual)) / 100;
  k.pct_reservas_ia = k.reservas_activas > 0
    ? Math.round(100 * Number(k.reservas_cerradas_por_ia) / (Number(k.reservas_activas) + Number(k.reservas_cerradas_por_ia)) * 100) / 100
    : 0;
  res.json(k);
});

export default router;
