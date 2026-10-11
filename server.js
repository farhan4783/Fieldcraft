const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const healthRoutes = require('./src/routes/health.routes');
const poiRoutes = require('./src/routes/poi.routes');
const geocodeRoutes = require('./src/routes/geocode.routes');
const adventureRoutes = require('./src/routes/adventure.routes');
const { errorHandler } = require('./src/utils/safe-errors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/pois', poiRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/adventures', adventureRoutes);

// Fallback route for SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized safe error handler
app.use(errorHandler);

// Start server if not imported by test runner
if (require.main === module) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🌲 FIELDCRAFT Server running at http://0.0.0.0:${config.port}`);
    console.log(`📡 Environment: ${config.nodeEnv}`);
    console.log(`🤖 AI Engine: Ollama Local Gemma (${config.ollama.baseUrl}) | Remote Gemma (${Boolean(config.ai.groqApiKey)})`);
    console.log(`===============================================`);
  });
}

module.exports = app;
