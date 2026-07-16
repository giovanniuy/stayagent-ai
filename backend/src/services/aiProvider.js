// =============================================================
// Capa de IA agnóstica — un solo punto de entrada.
// Cambia el motor con AI_PROVIDER=openai|anthropic|ollama|mock
// =============================================================
import { config } from '../config.js';

async function callOpenAI(system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callOllama(system, user) {
  const res = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const data = await res.json();
  return data.message?.content ?? '';
}

// Modo mock: respuestas determinísticas para desarrollo/demo sin API keys
function callMock(system, user) {
  return `[MOCK-AI] Recibí tu mensaje. En producción respondería el motor ${config.aiProvider}. ` +
    `Contexto del sistema: ${system.slice(0, 120)}...`;
}

const providers = { openai: callOpenAI, anthropic: callAnthropic, ollama: callOllama, mock: callMock };

export async function chat(system, user) {
  const fn = providers[config.aiProvider] || callMock;
  return fn(system, user);
}

/** Pide JSON estricto al modelo y lo parsea con fallback. */
export async function chatJSON(system, user, fallback = {}) {
  const raw = await chat(system + '\nRespondé ÚNICAMENTE con JSON válido, sin markdown.', user);
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return fallback;
  }
}
