require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  ai: {
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'gemma2-9b-it',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterModel: process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS, 10) || 25000,
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gemma3:4b',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 25000,
  },
  overpass: {
    url: process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter',
    timeoutMs: parseInt(process.env.OVERPASS_TIMEOUT_MS, 10) || 12000,
    maxRadiusMeters: 3000,
    cacheTtlMs: 5 * 60 * 1000, // 5 minutes in-memory cache
  },
  geofence: {
    arrivalRadiusMeters: parseInt(process.env.GEOFENCE_ARRIVAL_RADIUS_METERS, 10) || 90,
    accuracyThresholdMeters: parseInt(process.env.GEOFENCE_ACCURACY_THRESHOLD_METERS, 10) || 100,
    minQualifyingReadings: parseInt(process.env.GEOFENCE_MIN_QUALIFYING_READINGS, 10) || 2,
  },
  app: {
    name: 'FIELDCRAFT',
    version: '0.1.0',
    tagline: 'An open-source AI game master that turns your neighborhood into a real-world mystery.',
    allowedTones: ['mystery', 'wonder', 'playful'],
    allowedDurations: [10, 20, 30],
  }
};
