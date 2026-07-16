import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import searchRoutes from './routes/search.js';
import bookingRoutes from './routes/bookings.js';
import chatRoutes from './routes/chat.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import agentRoutes from './routes/agents.js';
import { repriceAll } from './services/pricingAgent.js';

const app = express();
app.use(cors({ origin: config.frontendUrl, credentials: true }));

// Webhook de Stripe necesita el body crudo ANTES del parser JSON
app.use('/api/payments/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'stayagent-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/agents', agentRoutes);

// Cron interno: repricing dinámico cada 6 horas
const REPRICE_INTERVAL = 6 * 60 * 60 * 1000;
setInterval(() => {
  repriceAll()
    .then(r => console.log(`[pricing] ${r.length} inmuebles repriceados`))
    .catch(e => console.error('[pricing] error:', e.message));
}, REPRICE_INTERVAL);

// Manejo de errores
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(config.port, () => {
  console.log(`StayAgent AI backend en http://localhost:${config.port} (IA: ${config.aiProvider})`);
});
