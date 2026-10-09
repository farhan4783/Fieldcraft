const { haversineDistance, isValidCoordinate } = require('../utils/geo');

/**
 * Whitelist of safe, clearly public OSM categories.
 */
const ALLOWED_CATEGORIES = {
  park: ['leisure=park', 'leisure=garden', 'leisure=recreation_ground'],
  square: ['place=square', 'place=plaza'],
  library: ['amenity=library'],
  artwork: ['tourism=artwork'],
  monument: ['historic=monument', 'historic=memorial'],
  fountain: ['amenity=fountain'],
  clock: ['amenity=clock'],
  viewpoint: ['tourism=viewpoint'],
};

/**
 * Explicit blacklist of unsafe, restricted, or private features.
 */
const FORBIDDEN_TAG_KEYS = [
  'building=residential',
  'building=house',
  'building=apartments',
  'amenity=school',
  'amenity=kindergarten',
  'amenity=childcare',
  'military',
  'landuse=construction',
  'landuse=industrial',
  'access=private',
  'access=no',
  'access=customers',
  'railway',
];

/**
 * Determine display category from OSM tags.
 * Returns null if the POI matches any forbidden tag or is not in the whitelist.
 */
function classifyPoi(tags = {}) {
  // Check every forbidden pattern against the actual tags
  for (const pattern of FORBIDDEN_TAG_KEYS) {
    if (pattern.includes('=')) {
      // key=value pattern: check exact match
      const [key, value] = pattern.split('=');
      if (tags[key] === value) {
        return null;
      }
    } else {
      // standalone key pattern (e.g. 'military', 'railway'):
      // reject if tag key exists at all
      if (tags[pattern] !== undefined) {
        return null;
      }
    }
  }

  if (tags.leisure === 'park') return 'public park';
  if (tags.leisure === 'garden') return 'public garden';
  if (tags.leisure === 'recreation_ground') return 'public recreation ground';
  if (tags.place === 'square' || tags.place === 'plaza') return 'public square';
  if (tags.amenity === 'library') return 'public library';
  if (tags.amenity === 'fountain') return 'public fountain';
  if (tags.tourism === 'artwork') return 'public artwork';
  if (tags.historic === 'monument' || tags.historic === 'memorial') return 'monument or memorial';
  if (tags.amenity === 'clock') return 'public clock';
  if (tags.tourism === 'viewpoint') return 'scenic viewpoint';

  return null;
}

/**
 * Filter and deduplicate raw POIs.
 * @param {Array<object>} rawPois - Array of raw OSM elements
 * @param {number} originLat
 * @param {number} originLon
 * @param {number} maxRadiusMeters
 * @returns {Array<object>} Filtered and normalized POIs
 */
function filterAndNormalizePois(rawPois, originLat, originLon, maxRadiusMeters = 1500) {
  if (!Array.isArray(rawPois)) return [];

  const candidates = [];

  for (const item of rawPois) {
    const lat = item.lat !== undefined ? item.lat : (item.center ? item.center.lat : null);
    const lon = item.lon !== undefined ? item.lon : (item.center ? item.center.lon : null);

    if (lat === null || lon === null || !isValidCoordinate(lat, lon)) {
      continue;
    }

    const tags = item.tags || {};
    const category = classifyPoi(tags);
    if (!category) {
      continue;
    }

    // Must have a meaningful name
    const rawName = tags.name || tags['name:en'] || null;
    if (!rawName || typeof rawName !== 'string' || rawName.trim().length < 2) {
      continue;
    }

    const name = rawName.trim();
    const distanceMeters = haversineDistance(originLat, originLon, lat, lon);

    // Reject POIs outside max radius or directly under player's feet (< 30m)
    if (distanceMeters < 30 || distanceMeters > maxRadiusMeters) {
      continue;
    }

    candidates.push({
      id: `${item.type || 'node'}/${item.id}`,
      name,
      category,
      latitude: lat,
      longitude: lon,
      distanceFromOriginMeters: distanceMeters,
      tags,
    });
  }

  // Deduplicate candidates that are physically very close (< 40m)
  const deduplicated = [];
  for (const cand of candidates) {
    const isDuplicate = deduplicated.some(
      existing => haversineDistance(existing.latitude, existing.longitude, cand.latitude, cand.longitude) < 40
    );
    if (!isDuplicate) {
      deduplicated.push(cand);
    }
  }

  // Sort primarily by distance from origin
  deduplicated.sort((a, b) => a.distanceFromOriginMeters - b.distanceFromOriginMeters);

  return deduplicated;
}

module.exports = {
  filterAndNormalizePois,
  classifyPoi,
  ALLOWED_CATEGORIES,
};
