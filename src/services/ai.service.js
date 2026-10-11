const config = require('../config');
const { checkOllamaAvailability } = require('./ollama.service');

/**
 * Detect which AI engine is active and available.
 * Checks Groq (Gemma), Google Gemini, OpenRouter, Local Ollama, or Fallback.
 */
async function getAiStatus() {
  if (config.ai.groqApiKey) {
    return {
      available: true,
      provider: 'groq',
      model: config.ai.groqModel,
      label: `Cloud Gemma (${config.ai.groqModel} via Groq)`,
      cloud: true,
    };
  }

  if (config.ai.geminiApiKey) {
    return {
      available: true,
      provider: 'gemini',
      model: config.ai.geminiModel,
      label: `Google Gemini (${config.ai.geminiModel})`,
      cloud: true,
    };
  }

  if (config.ai.openrouterApiKey) {
    return {
      available: true,
      provider: 'openrouter',
      model: config.ai.openrouterModel,
      label: `OpenRouter (${config.ai.openrouterModel})`,
      cloud: true,
    };
  }

  // Check local Ollama
  const ollama = await checkOllamaAvailability();
  if (ollama.available) {
    return {
      available: true,
      provider: 'ollama',
      model: config.ollama.model,
      label: `Local Gemma (${config.ollama.model})`,
      version: ollama.version,
      cloud: false,
    };
  }

  // Deterministic engine fallback
  return {
    available: false,
    provider: 'deterministic',
    model: 'built-in-templates',
    label: 'Deterministic Narrative Engine',
    cloud: false,
  };
}

/**
 * Call Groq Cloud API (Free Gemma 2 open model).
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
 * Call Google Gemini API directly.
 */
async function callGemini(apiKey, model, systemPrompt, userPrompt, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const targetModel = model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini API returned HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API returned empty text');
    }
    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Call OpenRouter API.
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
 * Master AI generator: routes prompt to the best available provider.
 * Supports optional client-provided API key from headers.
 */
async function callAi(systemPrompt, userPrompt, customOpts = {}) {
  const groqKey = customOpts.groqApiKey || config.ai.groqApiKey;
  if (groqKey) {
    const raw = await callGroq(groqKey, config.ai.groqModel, systemPrompt, userPrompt, config.ai.timeoutMs);
    return { content: raw, provider: 'groq', model: config.ai.groqModel };
  }

  const geminiKey = customOpts.geminiApiKey || config.ai.geminiApiKey;
  if (geminiKey) {
    const raw = await callGemini(geminiKey, config.ai.geminiModel, systemPrompt, userPrompt, config.ai.timeoutMs);
    return { content: raw, provider: 'gemini', model: config.ai.geminiModel };
  }

  const openrouterKey = customOpts.openrouterApiKey || config.ai.openrouterApiKey;
  if (openrouterKey) {
    const raw = await callOpenRouter(openrouterKey, config.ai.openrouterModel, systemPrompt, userPrompt, config.ai.timeoutMs);
    return { content: raw, provider: 'openrouter', model: config.ai.openrouterModel };
  }

  // Attempt local Ollama
  const { callOllama } = require('./ollama.service');
  const raw = await callOllama(systemPrompt, userPrompt);
  return { content: raw, provider: 'ollama', model: config.ollama.model };
}

module.exports = {
  getAiStatus,
  callAi,
  callGroq,
  callGemini,
  callOpenRouter,
};
