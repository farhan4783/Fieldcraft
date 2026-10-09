const config = require('../config');
const { AppError } = require('../utils/safe-errors');

// In-memory cache for Overpass responses: key -> { timestamp, data }
const cache = new Map();

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
 * Fetch public POIs from Overpass API.
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.overpass.timeoutMs);

  try {
    const response = await fetch(config.overpass.url, {
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
      throw new AppError(
        `Overpass query failed with status ${response.status}`,
        502,
        'OVERPASS_ERROR'
      );
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
    if (err.name === 'AbortError') {
      throw new AppError('Overpass request timed out.', 504, 'OVERPASS_TIMEOUT');
    }
    throw err;
  }
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
