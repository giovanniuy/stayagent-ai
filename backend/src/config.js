import 'dotenv/config';

export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://stayagent:stayagent@localhost:5432/stayagent',
  jwtSecret: process.env.JWT_SECRET || 'cambia-esto-en-produccion',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  // IA — capa agnóstica: 'openai' | 'anthropic' | 'ollama' | 'mock'
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1',
  // Pagos
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  mercadopagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  platformFeePct: Number(process.env.PLATFORM_FEE_PCT || 12),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
