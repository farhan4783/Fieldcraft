const config = require('../config');
const { checkOllamaAvailability, callOllama } = require('./ollama.service');

/**
 * Detect which AI engine is active and available.
 * Prioritizes Local Open-Weight Gemma (Ollama), then Remote Gemma (Open-Weights), then Deterministic Fallback.
 */
async function getAiStatus() {
  // 1. Prioritize Local Open-Weight Gemma via Ollama (Core Hackathon Path)
  const ollama = await checkOllamaAvailability();
  if (ollama.available) {
    return {
      available: true,
      provider: 'ollama',
      model: config.ollama.model,
      label: `Local Gemma (${config.ollama.model} via Ollama)`,
      version: ollama.version,
      cloud: false,
    };
  }

  // 2. Open-Weight Gemma remote runner (e.g. for Render or machines without Ollama)
  if (config.ai.groqApiKey) {
    return {
      available: true,
      provider: 'groq',
      model: config.ai.groqModel,
      label: `Remote Gemma (${config.ai.groqModel} Open-Weights)`,
      cloud: true,
    };
  }

  if (config.ai.openrouterApiKey) {
    return {
      available: true,
      provider: 'openrouter',
      model: config.ai.openrouterModel,
      label: `Remote Gemma (${config.ai.openrouterModel})`,
      cloud: true,
    };
  }

  // 3. Deterministic narrative engine fallback (Zero-dependency, offline)
  return {
    available: false,
    provider: 'deterministic',
    model: 'built-in-templates',
    label: 'Deterministic Narrative Engine (Built-in Failsafe)',
    cloud: false,
  };
}

/**
 * Call Groq Cloud API for Open-Weight Gemma 2 inference.
 * Used for zero-RAM cloud deployments (like Render free tier).
 */
async function callGroq(apiKey, model, systemPrompt, userPrompt, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gemma2-9b-it',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Groq API returned HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Call OpenRouter API for Open-Weight Gemma inference.
 */
async function callOpenRouter(apiKey, model, systemPrompt, userPrompt, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'google/gemma-2-9b-it:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`OpenRouter API returned HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Master AI generator: routes prompt to the best available open-weight provider.
 * Prioritizes Local Ollama (Gemma), then remote Gemma runner if configured, or falls back.
 */
async function callAi(systemPrompt, userPrompt, customOpts = {}) {
  // Check if Ollama is available locally first (Gold-standard local open-weight path)
  const ollamaStatus = await checkOllamaAvailability();
  if (ollamaStatus.available && !customOpts.groqApiKey) {
    const raw = await callOllama(systemPrompt, userPrompt);
    return { content: raw, provider: 'ollama', model: config.ollama.model };
  }

  // If remote open-weight key provided by client or configured on server
  const groqKey = customOpts.groqApiKey || config.ai.groqApiKey;
  if (groqKey) {
    const raw = await callGroq(groqKey, config.ai.groqModel, systemPrompt, userPrompt, config.ai.timeoutMs);
    return { content: raw, provider: 'groq', model: config.ai.groqModel };
  }

  const openrouterKey = customOpts.openrouterApiKey || config.ai.openrouterApiKey;
  if (openrouterKey) {
    const raw = await callOpenRouter(openrouterKey, config.ai.openrouterModel, systemPrompt, userPrompt, config.ai.timeoutMs);
    return { content: raw, provider: 'openrouter', model: config.ai.openrouterModel };
  }

  // Attempt local Ollama (will throw if offline, triggering deterministic fallback)
  const raw = await callOllama(systemPrompt, userPrompt);
  return { content: raw, provider: 'ollama', model: config.ollama.model };
}

module.exports = {
  getAiStatus,
  callAi,
  callGroq,
  callOpenRouter,
};
