const config = require('../config');
const { checkOllamaAvailability, callOllama } = require('./ollama.service');

/**
 * Detect which AI engine is active and available.
 * Prioritizes Local Open-Weight Gemma (Ollama), then OpenRouter Gemma 3, then Groq, then Deterministic Fallback.
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

  // 2. Open-Weight Gemma 3 via OpenRouter (Primary Cloud Open-Weights Runner)
  if (config.ai.openrouterApiKey) {
    return {
      available: true,
      provider: 'openrouter',
      model: config.ai.openrouterModel,
      label: `Remote Gemma 3 (${config.ai.openrouterModel} via OpenRouter)`,
      cloud: true,
    };
  }

  // 3. Groq (Legacy / secondary runner; model may be retired)
  if (config.ai.groqApiKey) {
    return {
      available: true,
      provider: 'groq',
      model: config.ai.groqModel,
      label: `Remote Gemma (${config.ai.groqModel} via Groq)`,
      cloud: true,
    };
  }

  // 4. Deterministic narrative engine fallback (Zero-dependency, offline)
  return {
    available: false,
    provider: 'deterministic',
    model: 'built-in-templates',
    label: 'Deterministic Narrative Engine (Built-in Failsafe)',
    cloud: false,
  };
}

/**
 * Call OpenRouter API for Open-Weight Gemma 3 inference.
 * Defaults to google/gemma-3-4b-it:free.
 */
async function callOpenRouter(apiKey, model, systemPrompt, userPrompt, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const targetModel = model || config.ai.openrouterModel || 'google/gemma-3-4b-it:free';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/farhan4783/Fieldcraft',
        'X-Title': 'Fieldcraft Mystery Game',
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`OpenRouter API returned HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      throw new Error('OpenRouter API returned empty text response');
    }
    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Call Groq Cloud API for Open-Weight Gemma inference.
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
 * Master AI generator: routes prompt to the best available open-weight provider.
 * Prioritizes Local Ollama (Gemma), then OpenRouter (Gemma 3), with fallback to Groq or deterministic engine.
 */
async function callAi(systemPrompt, userPrompt, customOpts = {}) {
  // Check if Ollama is available locally first (Gold-standard local open-weight path)
  const ollamaStatus = await checkOllamaAvailability();
  if (ollamaStatus.available && !customOpts.openrouterApiKey && !customOpts.groqApiKey) {
    const raw = await callOllama(systemPrompt, userPrompt);
    return { content: raw, provider: 'ollama', model: config.ollama.model };
  }

  // 1. Prioritize OpenRouter Gemma 3 (google/gemma-3-4b-it:free)
  const openrouterKey = customOpts.openrouterApiKey || config.ai.openrouterApiKey;
  if (openrouterKey) {
    try {
      const raw = await callOpenRouter(openrouterKey, config.ai.openrouterModel, systemPrompt, userPrompt, config.ai.timeoutMs);
      return { content: raw, provider: 'openrouter', model: config.ai.openrouterModel };
    } catch (err) {
      console.warn(`[AI] OpenRouter failed (${err.message}). Checking alternate providers...`);
    }
  }

  // 2. Try Groq (Catch retired-model errors gracefully to prevent trapping requests)
  const groqKey = customOpts.groqApiKey || config.ai.groqApiKey;
  if (groqKey) {
    try {
      const raw = await callGroq(groqKey, config.ai.groqModel, systemPrompt, userPrompt, config.ai.timeoutMs);
      return { content: raw, provider: 'groq', model: config.ai.groqModel };
    } catch (err) {
      console.warn(`[AI] Groq failed (${err.message}). Note: Groq gemma2-9b-it may be retired. Falling back...`);
    }
  }

  // 3. Fallback to local Ollama (will throw if offline, triggering deterministic fallback)
  const raw = await callOllama(systemPrompt, userPrompt);
  return { content: raw, provider: 'ollama', model: config.ollama.model };
}

module.exports = {
  getAiStatus,
  callAi,
  callOpenRouter,
  callGroq,
};
