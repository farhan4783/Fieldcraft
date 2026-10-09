const config = require('../config');
const { haversineDistance } = require('../utils/geo');

/**
 * Determine checkpoint count and distance threshold based on duration.
 */
function getBudgetForDuration(durationMinutes) {
  if (durationMinutes <= 10) {
    return { targetCount: 2, maxDistanceMeters: 600 };
  } else if (durationMinutes <= 20) {
    return { targetCount: 3, maxDistanceMeters: 1000 };
  }
  return { targetCount: 3, maxDistanceMeters: 1500 };
}

/**
 * Select a diverse, bounded sequence of checkpoints from candidate POIs.
 * @param {Array<object>} candidatePois - Filtered candidate POIs
 * @param {number} durationMinutes
 * @returns {Array<object>} Selected checkpoints
 */
function selectCheckpoints(candidatePois, durationMinutes = 20) {
  if (!Array.isArray(candidatePois) || candidatePois.length === 0) {
    return [];
  }

  const { targetCount, maxDistanceMeters } = getBudgetForDuration(durationMinutes);

  // Filter within max duration distance
  const reachablePois = candidatePois.filter(p => p.distanceFromOriginMeters <= maxDistanceMeters);
  const pool = reachablePois.length > 0 ? reachablePois : candidatePois;

  const selected = [];
  const usedCategories = new Set();

  // First pass: pick distinct categories in increasing distance
  for (const poi of pool) {
    if (selected.length >= targetCount) break;

    if (!usedCategories.has(poi.category)) {
      selected.push(poi);
      usedCategories.add(poi.category);
    }
  }

  // Second pass: if we need more to reach targetCount, pick remaining distinct POIs
  if (selected.length < targetCount) {
    for (const poi of pool) {
      if (selected.length >= targetCount) break;
      if (!selected.some(s => s.id === poi.id)) {
        selected.push(poi);
      }
    }
  }

  // Format into standard Checkpoint objects
  return selected.map((poi, idx) => ({
    id: `cp-${idx + 1}`,
    poiId: poi.id,
    name: poi.name,
    displayCategory: poi.category,
    latitude: poi.latitude,
    longitude: poi.longitude,
    distanceFromOriginMeters: poi.distanceFromOriginMeters,
    arrivalRadiusMeters: config.geofence.arrivalRadiusMeters,
  }));
}

module.exports = {
  selectCheckpoints,
  getBudgetForDuration,
};
