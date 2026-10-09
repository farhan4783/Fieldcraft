const { AppError } = require('../utils/safe-errors');
const { isValidCoordinate } = require('../utils/geo');
const config = require('../config');

/**
 * Validate incoming adventure creation request body.
 */
function validateAdventureRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request payload. Expected JSON object.', 400, 'INVALID_BODY');
  }

  const { latitude, longitude, durationMinutes, tone, demoMode } = body;

  const isDemo = Boolean(demoMode);

  // If not demo mode, coordinates are strictly required and must be valid
  if (!isDemo) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new AppError('Valid latitude and longitude numbers are required.', 400, 'INVALID_COORDINATES');
    }

    if (!isValidCoordinate(latitude, longitude)) {
      throw new AppError('Latitude must be between -90 and 90, longitude between -180 and 180.', 400, 'COORDINATES_OUT_OF_BOUNDS');
    }
  }

  const duration = parseInt(durationMinutes, 10);
  if (!config.app.allowedDurations.includes(duration)) {
    throw new AppError(`Duration must be one of: ${config.app.allowedDurations.join(', ')} minutes.`, 400, 'INVALID_DURATION');
  }

  const normalizedTone = typeof tone === 'string' ? tone.toLowerCase().trim() : '';
  if (!config.app.allowedTones.includes(normalizedTone)) {
    throw new AppError(`Tone must be one of: ${config.app.allowedTones.join(', ')}.`, 400, 'INVALID_TONE');
  }

  return {
    latitude: isDemo ? 37.7749 : latitude,
    longitude: isDemo ? -122.4194 : longitude,
    durationMinutes: duration,
    tone: normalizedTone,
    demoMode: isDemo,
  };
}

module.exports = {
  validateAdventureRequest,
};
