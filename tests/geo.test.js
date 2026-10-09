const test = require('node:test');
const assert = require('node:assert/strict');
const {
  haversineDistance,
  isValidCoordinate,
  estimatedWalkingDistance,
  estimateWalkDurationMinutes,
} = require('../src/utils/geo');

test('haversineDistance calculates 0 for identical points', () => {
  const dist = haversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
  assert.equal(dist, 0);
});

test('haversineDistance calculates accurate distance for known points (~130m)', () => {
  // Point A: 37.7749, -122.4194
  // Point B: 37.7758, -122.4182
  const dist = haversineDistance(37.7749, -122.4194, 37.7758, -122.4182);
  assert.ok(dist >= 120 && dist <= 160, `Distance should be ~140m, got ${dist}`);
});

test('haversineDistance throws on non-numeric inputs', () => {
  assert.throws(() => {
    haversineDistance('invalid', -122.4194, 37.7749, -122.4194);
  }, TypeError);
});

test('isValidCoordinate validates latitude and longitude ranges correctly', () => {
  assert.equal(isValidCoordinate(37.7749, -122.4194), true);
  assert.equal(isValidCoordinate(90, 180), true);
  assert.equal(isValidCoordinate(-90, -180), true);
  assert.equal(isValidCoordinate(90.1, 0), false);
  assert.equal(isValidCoordinate(0, 180.1), false);
  assert.equal(isValidCoordinate(NaN, 10), false);
  assert.equal(isValidCoordinate(10, 'not-a-number'), false);
});

test('estimatedWalkingDistance applies pedestrian factor', () => {
  const straight = 1000;
  const walkEst = estimatedWalkingDistance(straight);
  assert.equal(walkEst, 1300);
});

test('estimateWalkDurationMinutes calculates realistic pace', () => {
  // 750 meters should take ~10 minutes
  const mins = estimateWalkDurationMinutes(750);
  assert.equal(mins, 10);
});
