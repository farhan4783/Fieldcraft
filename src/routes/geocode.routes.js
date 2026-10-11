const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/safe-errors');

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      throw new AppError('Search query must be at least 2 characters.', 400, 'INVALID_QUERY');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Fieldcraft/0.1 (Hacktoberfest 2026; touch-grass)',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError('Geocoding search failed.', 502, 'GEOCODE_ERROR');
    }

    const data = await response.json();
    const results = (Array.isArray(data) ? data : []).map(item => ({
      name: item.display_name,
      shortName: item.display_name.split(',').slice(0, 2).join(', '),
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
    }));

    res.json({
      ok: true,
      query: q,
      results,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return next(new AppError('Geocoding search timed out.', 504, 'GEOCODE_TIMEOUT'));
    }
    next(err);
  }
});

module.exports = router;
