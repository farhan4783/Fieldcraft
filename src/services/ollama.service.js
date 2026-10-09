const config = require('../config');

/**
 * Check if the local Ollama instance is running and reachable.
 */
async function checkOllamaAvailability() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/version`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { available: false, version: null };
    const data = await res.json();
    return { available: true, version: data.version || 'unknown' };
  } catch {
    clearTimeout(timeoutId);
    return { available: false, version: null };
  }
}

/**
 * Call Ollama chat API to generate story content.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} Raw model response text
 */
async function callOllama(systemPrompt, userPrompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ollama.timeoutMs);

  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollama.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        format: 'json',
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Ollama request failed with HTTP status ${res.status}`);
    }

    const json = await res.json();
    return json.message?.content || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

module.exports = {
  checkOllamaAvailability,
  callOllama,
};
