const express = require('express');
const router = express.Router();
const config = require('../config');
const { getAiStatus } = require('../services/ai.service');

router.get('/', async (req, res) => {
  const aiStatus = await getAiStatus();

  res.json({
    ok: true,
    name: config.app.name,
    version: config.app.version,
    aiAvailable: aiStatus.available,
    aiProvider: aiStatus.provider,
    aiModel: aiStatus.model,
    aiLabel: aiStatus.label,
    ollamaAvailable: aiStatus.provider === 'ollama' && aiStatus.available,
    ollamaVersion: aiStatus.version || null,
    modelConfigured: aiStatus.model,
  });
});

module.exports = router;
