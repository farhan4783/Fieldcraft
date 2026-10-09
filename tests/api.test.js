const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

// Helper to make local express requests without external server
async function testRequest(path, options = {}) {
  const port = 3099;
  const server = app.listen(port);
  try {
    const url = `http://localhost:${port}${path}`;
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('GET /api/health responds with service status', async () => {
  const res = await testRequest('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.equal(res.data.name, 'FIELDCRAFT');
  assert.equal(typeof res.data.ollamaAvailable, 'boolean');
});

test('GET /api/pois?demo=true returns fixture POIs without network access', async () => {
  const res = await testRequest('/api/pois?demo=true');
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.equal(res.data.source, 'demo-fixtures');
  assert.ok(res.data.pois.length > 0);
});

test('POST /api/adventures in demo mode generates a valid full adventure', async () => {
  const res = await testRequest('/api/adventures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      durationMinutes: 20,
      tone: 'mystery',
      demoMode: true,
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.ok, true);
  const adv = res.data.adventure;
  assert.ok(adv.id.startsWith('adv-'));
  assert.equal(adv.mode, 'demo');
  assert.equal(adv.tone, 'mystery');
  assert.equal(adv.durationMinutes, 20);
  assert.ok(adv.checkpoints.length >= 2);
  assert.ok(typeof adv.title === 'string');
  assert.ok(typeof adv.premise === 'string');
  assert.ok(typeof adv.openingNarration === 'string');
  assert.ok(typeof adv.finale === 'string');
  assert.ok(adv.checkpoints[0].clue);
  assert.ok(adv.checkpoints[0].arrivalLine);
});
