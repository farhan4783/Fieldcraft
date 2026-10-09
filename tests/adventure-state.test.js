const test = require('node:test');
const assert = require('node:assert/strict');
const { STATES, transitionState, evaluateGpsReading } = require('../src/utils/geofence-engine');

test('state machine transitions properly along golden path', () => {
  let state = STATES.SETUP;
  state = transitionState(state, 'CREATE_ADVENTURE');
  assert.equal(state, STATES.READY);

  state = transitionState(state, 'BEGIN_WALK');
  assert.equal(state, STATES.WALKING);

  state = transitionState(state, 'PAUSE');
  assert.equal(state, STATES.PAUSED);

  state = transitionState(state, 'RESUME');
  assert.equal(state, STATES.WALKING);

  state = transitionState(state, 'CONFIRMED_ARRIVAL');
  assert.equal(state, STATES.CHECKPOINT_COMPLETE);

  state = transitionState(state, 'FINISH_ADVENTURE');
  assert.equal(state, STATES.COMPLETED);
});

test('state machine forbids invalid transitions', () => {
  assert.throws(() => {
    transitionState(STATES.SETUP, 'CONFIRMED_ARRIVAL');
  }, /Invalid state transition/);

  assert.throws(() => {
    transitionState(STATES.PAUSED, 'CONFIRMED_ARRIVAL');
  }, /Invalid state transition/);
});

test('evaluateGpsReading rejects reading with poor accuracy (>60m)', () => {
  const cp = { latitude: 37.7749, longitude: -122.4194, arrivalRadiusMeters: 90 };
  const reading = { latitude: 37.7749, longitude: -122.4194, accuracy: 120 };

  const res = evaluateGpsReading(cp, reading, 0);
  assert.equal(res.unlocked, false);
  assert.equal(res.reason, 'POOR_ACCURACY');
});

test('evaluateGpsReading rejects reading outside radius (>90m)', () => {
  const cp = { latitude: 37.7749, longitude: -122.4194, arrivalRadiusMeters: 90 };
  // point ~500m away
  const reading = { latitude: 37.7800, longitude: -122.4194, accuracy: 20 };

  const res = evaluateGpsReading(cp, reading, 0);
  assert.equal(res.unlocked, false);
  assert.equal(res.reason, 'OUT_OF_RADIUS');
});

test('evaluateGpsReading requires multiple qualifying readings before unlocking', () => {
  const cp = { latitude: 37.7749, longitude: -122.4194, arrivalRadiusMeters: 90 };
  const reading = { latitude: 37.77492, longitude: -122.41941, accuracy: 15 };

  // First reading
  const step1 = evaluateGpsReading(cp, reading, 0, { minReadings: 2 });
  assert.equal(step1.unlocked, false);
  assert.equal(step1.consecutiveHits, 1);
  assert.equal(step1.reason, 'AWAITING_CONFIRMATION_READING');

  // Second reading confirms
  const step2 = evaluateGpsReading(cp, reading, step1.consecutiveHits, { minReadings: 2 });
  assert.equal(step2.unlocked, true);
  assert.equal(step2.consecutiveHits, 2);
  assert.equal(step2.reason, 'ARRIVAL_CONFIRMED');
});

test('evaluateGpsReading handles invalid or missing coordinate data safely', () => {
  const cp = { latitude: 37.7749, longitude: -122.4194, arrivalRadiusMeters: 90 };

  const badReading1 = null;
  assert.equal(evaluateGpsReading(cp, badReading1, 0).reason, 'INVALID_READING');

  const badReading2 = { latitude: 'invalid', longitude: -122.4194 };
  assert.equal(evaluateGpsReading(cp, badReading2, 0).reason, 'INVALID_READING');
});

test('terminal states (COMPLETED, ENDED) do not transition further', () => {
  assert.equal(transitionState(STATES.COMPLETED, 'ANY_EVENT'), STATES.COMPLETED);
  assert.equal(transitionState(STATES.ENDED, 'ANY_EVENT'), STATES.ENDED);
});
