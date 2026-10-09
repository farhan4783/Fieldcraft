const { haversineDistance } = require('./geo');

/**
 * Valid game states
 */
const STATES = {
  SETUP: 'setup',
  READY: 'ready',
  WALKING: 'walking',
  PAUSED: 'paused',
  CHECKPOINT_COMPLETE: 'checkpoint-complete',
  COMPLETED: 'completed',
  ENDED: 'ended',
};

/**
 * Pure state machine transition helper.
 */
function transitionState(currentState, event) {
  switch (currentState) {
    case STATES.SETUP:
      if (event === 'CREATE_ADVENTURE') return STATES.READY;
      break;

    case STATES.READY:
      if (event === 'BEGIN_WALK') return STATES.WALKING;
      break;

    case STATES.WALKING:
      if (event === 'PAUSE') return STATES.PAUSED;
      if (event === 'END') return STATES.ENDED;
      if (event === 'CONFIRMED_ARRIVAL') return STATES.CHECKPOINT_COMPLETE;
      break;

    case STATES.PAUSED:
      if (event === 'RESUME') return STATES.WALKING;
      if (event === 'END') return STATES.ENDED;
      break;

    case STATES.CHECKPOINT_COMPLETE:
      if (event === 'NEXT_CHECKPOINT') return STATES.WALKING;
      if (event === 'FINISH_ADVENTURE') return STATES.COMPLETED;
      break;

    case STATES.COMPLETED:
    case STATES.ENDED:
      // Terminal states
      return currentState;
  }

  throw new Error(`Invalid state transition: cannot process event "${event}" from state "${currentState}"`);
}

/**
 * Evaluate GPS reading against active checkpoint.
 * Requires:
 * 1. Accuracy <= accuracyThreshold (e.g. 60m)
 * 2. Distance <= arrivalRadius (e.g. 90m)
 * 3. At least minReadings (e.g. 2) qualifying consecutive readings
 *
 * @param {object} checkpoint { latitude, longitude, arrivalRadiusMeters }
 * @param {object} reading { latitude, longitude, accuracy }
 * @param {number} consecutiveHits current streak of qualifying hits
 * @param {object} opts { accuracyThreshold, minReadings }
 */
function evaluateGpsReading(checkpoint, reading, consecutiveHits = 0, opts = {}) {
  const accuracyThreshold = opts.accuracyThreshold ?? 60;
  const minReadings = opts.minReadings ?? 2;
  const arrivalRadius = checkpoint.arrivalRadiusMeters ?? 90;

  if (!reading || typeof reading.latitude !== 'number' || typeof reading.longitude !== 'number') {
    return {
      unlocked: false,
      consecutiveHits: 0,
      reason: 'INVALID_READING',
    };
  }

  const accuracy = reading.accuracy ?? 999;
  if (accuracy > accuracyThreshold) {
    return {
      unlocked: false,
      consecutiveHits: 0,
      reason: 'POOR_ACCURACY',
      accuracy,
      accuracyThreshold,
    };
  }

  const distance = haversineDistance(
    reading.latitude,
    reading.longitude,
    checkpoint.latitude,
    checkpoint.longitude
  );

  if (distance > arrivalRadius) {
    return {
      unlocked: false,
      consecutiveHits: 0,
      distance,
      arrivalRadius,
      reason: 'OUT_OF_RADIUS',
    };
  }

  // Reading is within target with acceptable accuracy!
  const newHits = consecutiveHits + 1;
  const unlocked = newHits >= minReadings;

  return {
    unlocked,
    consecutiveHits: newHits,
    distance,
    accuracy,
    reason: unlocked ? 'ARRIVAL_CONFIRMED' : 'AWAITING_CONFIRMATION_READING',
  };
}

module.exports = {
  STATES,
  transitionState,
  evaluateGpsReading,
};
