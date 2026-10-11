const config = require('../config');
const { AppError } = require('../utils/safe-errors');

// In-memory cache for Overpass responses: key -> { timestamp, data }
const cache = new Map();

// Known public Overpass mirror endpoints for resilient fallback
const OVERPASS_ENDPOINTS = [
  config.overpass.url,
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/**
 * Generate coarse spatial cache key (approx 500m precision).
 */
function getCacheKey(lat, lon, radius) {
  const coarseLat = lat.toFixed(2);
  const coarseLon = lon.toFixed(2);
  return `${coarseLat}:${coarseLon}:${radius}`;
}

/**
 * Build Overpass QL query string for safe public POIs.
 */
function buildOverpassQuery(lat, lon, radiusMeters) {
  return `
    [out:json][timeout:10];
    (
      node["leisure"="park"](around:${radiusMeters},${lat},${lon});
      way["leisure"="park"](around:${radiusMeters},${lat},${lon});
      node["leisure"="garden"](around:${radiusMeters},${lat},${lon});
      way["leisure"="garden"](around:${radiusMeters},${lat},${lon});
      node["place"="square"](around:${radiusMeters},${lat},${lon});
      node["amenity"="library"](around:${radiusMeters},${lat},${lon});
      way["amenity"="library"](around:${radiusMeters},${lat},${lon});
      node["amenity"="fountain"](around:${radiusMeters},${lat},${lon});
      node["tourism"="artwork"](around:${radiusMeters},${lat},${lon});
      node["historic"="monument"](around:${radiusMeters},${lat},${lon});
      node["historic"="memorial"](around:${radiusMeters},${lat},${lon});
      node["amenity"="clock"](around:${radiusMeters},${lat},${lon});
      node["tourism"="viewpoint"](around:${radiusMeters},${lat},${lon});
    );
    out center tags;
  `;
}

/**
 * Fetch public POIs from Overpass API with mirror fallback.
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusMeters
 * @returns {Promise<Array<object>>} Raw OSM elements
 */
async function fetchOverpassPois(lat, lon, radiusMeters = 1000) {
  const boundedRadius = Math.min(radiusMeters, config.overpass.maxRadiusMeters);
  const cacheKey = getCacheKey(lat, lon, boundedRadius);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < config.overpass.cacheTtlMs) {
    return cached.data;
  }

  const query = buildOverpassQuery(lat, lon, boundedRadius);
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.overpass.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Fieldcraft/0.1 (Hacktoberfest 2026; touch-grass)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = new AppError(`Overpass endpoint ${endpoint} failed with status ${response.status}`, 502, 'OVERPASS_ERROR');
        continue; // Try next mirror
      }

      const data = await response.json();
      const elements = data.elements || [];

      // Store in cache
      cache.set(cacheKey, {
        timestamp: Date.now(),
        data: elements,
      });

      return elements;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      // Continue to next mirror if available
    }
  }

  if (lastError && lastError.name === 'AbortError') {
    throw new AppError('Overpass request timed out across mirrors.', 504, 'OVERPASS_TIMEOUT');
  }

  throw lastError || new AppError('Overpass mirrors unavailable.', 502, 'OVERPASS_ERROR');
}

/**
 * Clear the in-memory cache (useful for testing).
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  fetchOverpassPois,
  buildOverpassQuery,
  clearCache,
};
