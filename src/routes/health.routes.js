const express = require('express');
const router = express.Router();
const config = require('../config');
const { checkOllamaAvailability } = require('../services/ollama.service');

router.get('/', async (req, res) => {
  const ollamaStatus = await checkOllamaAvailability();

  res.json({
    ok: true,
    name: config.app.name,
    version: config.app.version,
    ollamaAvailable: ollamaStatus.available,
    ollamaVersion: ollamaStatus.version,
    modelConfigured: config.ollama.model,
  });
});

module.exports = router;
