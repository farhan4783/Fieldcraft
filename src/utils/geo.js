/**
 * Geo calculation utilities for FIELDCRAFT.
 * Haversine formula and distance/coordinate validation.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians.
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate great-circle distance between two points using the Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    throw new TypeError('Invalid coordinate numbers passed to haversineDistance');
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Validate latitude (-90 to 90) and longitude (-180 to 180).
 */
function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Conservative estimated walking distance from straight-line distance.
 * Note: purely an estimate for duration budgeting, not a guaranteed walking path.
 */
function estimatedWalkingDistance(straightLineMeters) {
  const PEDESTRIAN_WINDING_FACTOR = 1.3;
  return Math.round(straightLineMeters * PEDESTRIAN_WINDING_FACTOR);
}

/**
 * Estimate walking duration in minutes at a comfortable pace (~4.5 km/h = ~75 m/min).
 */
function estimateWalkDurationMinutes(meters) {
  const METERS_PER_MINUTE = 75;
  return Math.max(1, Math.round(meters / METERS_PER_MINUTE));
}

module.exports = {
  haversineDistance,
  isValidCoordinate,
  estimatedWalkingDistance,
  estimateWalkDurationMinutes,
  EARTH_RADIUS_METERS,
};
