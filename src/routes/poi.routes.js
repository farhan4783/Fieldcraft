const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { fetchOverpassPois } = require('../services/overpass.service');
const { filterAndNormalizePois } = require('../services/poi-filter.service');
const { isValidCoordinate } = require('../utils/geo');
const { AppError } = require('../utils/safe-errors');

router.get('/', async (req, res, next) => {
  try {
    const isDemo = req.query.demo === 'true';

    let lat = parseFloat(req.query.lat);
    let lon = parseFloat(req.query.lon);
    const radius = parseInt(req.query.radius, 10) || 1000;

    if (isDemo) {
      lat = 37.7749;
      lon = -122.4194;
      const fixturePath = path.join(__dirname, '../../fixtures/demo-pois.json');
      const demoData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      return res.json({
        ok: true,
        source: 'demo-fixtures',
        count: demoData.length,
        pois: demoData,
      });
    }

    if (!isValidCoordinate(lat, lon)) {
      throw new AppError('Valid lat (-90 to 90) and lon (-180 to 180) parameters are required.', 400, 'INVALID_COORDINATES');
    }

    const rawPois = await fetchOverpassPois(lat, lon, radius);
    const filtered = filterAndNormalizePois(rawPois, lat, lon, radius);

    res.json({
      ok: true,
      source: 'overpass',
      count: filtered.length,
      pois: filtered,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
