const test = require('node:test');
const assert = require('node:assert/strict');
const { filterAndNormalizePois, classifyPoi } = require('../src/services/poi-filter.service');
const { selectCheckpoints, getBudgetForDuration } = require('../src/services/checkpoint.service');

test('classifyPoi correctly identifies safe public categories', () => {
  assert.equal(classifyPoi({ leisure: 'park' }), 'public park');
  assert.equal(classifyPoi({ amenity: 'library' }), 'public library');
  assert.equal(classifyPoi({ tourism: 'artwork' }), 'public artwork');
  assert.equal(classifyPoi({ historic: 'monument' }), 'monument or memorial');
  assert.equal(classifyPoi({ place: 'square' }), 'public square');
});

test('classifyPoi rejects private or dangerous features', () => {
  assert.equal(classifyPoi({ leisure: 'park', access: 'private' }), null);
  assert.equal(classifyPoi({ building: 'residential' }), null);
  assert.equal(classifyPoi({ amenity: 'school' }), null);
  assert.equal(classifyPoi({ landuse: 'construction' }), null);
});

test('filterAndNormalizePois filters out unnamed or distant items', () => {
  const originLat = 37.7749;
  const originLon = -122.4194;

  const raw = [
    // Valid park
    { id: 101, lat: 37.7760, lon: -122.4180, tags: { leisure: 'park', name: 'Mission Dolores Park' } },
    // Missing name
    { id: 102, lat: 37.7762, lon: -122.4182, tags: { leisure: 'park' } },
    // Private access
    { id: 103, lat: 37.7765, lon: -122.4185, tags: { leisure: 'park', name: 'Private Club Lawn', access: 'private' } },
    // Invalid coordinate
    { id: 104, lat: 999, lon: -122.4185, tags: { leisure: 'park', name: 'Invalid Void' } },
  ];

  const results = filterAndNormalizePois(raw, originLat, originLon, 1500);
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Mission Dolores Park');
  assert.equal(results[0].category, 'public park');
});

test('selectCheckpoints selects correct count based on duration budget', () => {
  const budget10 = getBudgetForDuration(10);
  assert.equal(budget10.targetCount, 2);

  const budget20 = getBudgetForDuration(20);
  assert.equal(budget20.targetCount, 3);

  const candidates = [
    { id: '1', name: 'Park A', category: 'public park', distanceFromOriginMeters: 200, latitude: 1, longitude: 1 },
    { id: '2', name: 'Plaza B', category: 'public square', distanceFromOriginMeters: 400, latitude: 2, longitude: 2 },
    { id: '3', name: 'Library C', category: 'public library', distanceFromOriginMeters: 600, latitude: 3, longitude: 3 },
    { id: '4', name: 'Fountain D', category: 'public fountain', distanceFromOriginMeters: 800, latitude: 4, longitude: 4 },
  ];

  const cps10 = selectCheckpoints(candidates, 10);
  assert.equal(cps10.length, 2);
  assert.equal(cps10[0].id, 'cp-1');
  assert.equal(cps10[1].id, 'cp-2');

  const cps20 = selectCheckpoints(candidates, 20);
  assert.equal(cps20.length, 3);
});

test('classifyPoi rejects access=customers and handles recreation ground', () => {
  assert.equal(classifyPoi({ leisure: 'park', access: 'customers' }), null);
  assert.equal(classifyPoi({ leisure: 'recreation_ground' }), 'public recreation ground');
});

test('selectCheckpoints guarantees strictly ascending distance ordering', () => {
  const unsorted = [
    { id: '1', name: 'Far Library', category: 'public library', distanceFromOriginMeters: 750, latitude: 1, longitude: 1 },
    { id: '2', name: 'Close Park', category: 'public park', distanceFromOriginMeters: 150, latitude: 2, longitude: 2 },
    { id: '3', name: 'Mid Square', category: 'public square', distanceFromOriginMeters: 400, latitude: 3, longitude: 3 },
  ];

  const cps = selectCheckpoints(unsorted, 20);
  assert.equal(cps.length, 3);
  assert.equal(cps[0].name, 'Close Park');
  assert.equal(cps[1].name, 'Mid Square');
  assert.equal(cps[2].name, 'Far Library');
  assert.ok(cps[0].distanceFromOriginMeters < cps[1].distanceFromOriginMeters);
  assert.ok(cps[1].distanceFromOriginMeters < cps[2].distanceFromOriginMeters);
});

test('filterAndNormalizePois deduplicates POIs closer than 40m', () => {
  const originLat = 37.7749;
  const originLon = -122.4194;

  const raw = [
    { id: 1, lat: 37.7760, lon: -122.4180, tags: { leisure: 'park', name: 'Park North' } },
    // Only ~10m from item 1
    { id: 2, lat: 37.77605, lon: -122.41805, tags: { leisure: 'park', name: 'Park North Pavilion' } },
  ];

  const results = filterAndNormalizePois(raw, originLat, originLon, 1500);
  assert.equal(results.length, 1);
});
