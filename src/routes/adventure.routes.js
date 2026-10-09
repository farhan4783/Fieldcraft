const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { validateAdventureRequest } = require('../validators/adventure.schema');
const { fetchOverpassPois } = require('../services/overpass.service');
const { filterAndNormalizePois } = require('../services/poi-filter.service');
const { selectCheckpoints } = require('../services/checkpoint.service');
const { generateStory } = require('../services/story.service');
const { AppError } = require('../utils/safe-errors');

router.post('/', async (req, res, next) => {
  try {
    const validated = validateAdventureRequest(req.body);
    const { latitude, longitude, durationMinutes, tone, demoMode } = validated;

    let candidatePois = [];

    if (demoMode) {
      const fixturePath = path.join(__dirname, '../../fixtures/demo-pois.json');
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      candidatePois = fixtureData.map((poi, idx) => ({
        ...poi,
        distanceFromOriginMeters: 150 * (idx + 1),
      }));
    } else {
      try {
        const rawPois = await fetchOverpassPois(latitude, longitude, 1200);
        candidatePois = filterAndNormalizePois(rawPois, latitude, longitude, 1200);
      } catch (err) {
        console.warn(`[Adventure] Overpass query failed (${err.message}). Offering demo mode option.`);
        throw new AppError(
          'Could not retrieve nearby public map points right now. Try switching to Demo Mode to explore instantly!',
          503,
          'OVERPASS_UNAVAILABLE'
        );
      }
    }

    if (candidatePois.length === 0) {
      throw new AppError(
        'No suitable public landmarks found near this location. Try exploring with Demo Mode or choosing a larger park/public area.',
        422,
        'NO_SUITABLE_POIS'
      );
    }

    // Select candidate checkpoints based on duration
    const selectedCps = selectCheckpoints(candidatePois, durationMinutes);

    if (selectedCps.length === 0) {
      throw new AppError(
        'Could not assemble enough checkpoints for this duration. Please try Demo Mode.',
        422,
        'INSUFFICIENT_CHECKPOINTS'
      );
    }

    // Generate story from local Gemma or fallback
    const { story, source } = await generateStory(selectedCps, tone, durationMinutes);

    // Merge story clues into selected checkpoints
    const mergedCheckpoints = selectedCps.map(cp => {
      const cpStory = story.checkpoints.find(s => s.checkpointId === cp.id) || {
        clue: `Seek out the grounds of ${cp.name}.`,
        hint: `Head directly toward ${cp.name} (${cp.displayCategory}).`,
        arrivalLine: `You have reached ${cp.name}.`,
      };

      return {
        id: cp.id,
        poiId: cp.poiId,
        name: cp.name,
        displayCategory: cp.displayCategory,
        latitude: cp.latitude,
        longitude: cp.longitude,
        distanceFromOriginMeters: cp.distanceFromOriginMeters,
        arrivalRadiusMeters: cp.arrivalRadiusMeters,
        clue: cpStory.clue,
        hint: cpStory.hint,
        arrivalLine: cpStory.arrivalLine,
      };
    });

    const adventureId = `adv-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const adventure = {
      id: adventureId,
      title: story.title,
      premise: story.premise,
      openingNarration: story.openingNarration,
      durationMinutes,
      tone,
      mode: demoMode ? 'demo' : 'live',
      checkpoints: mergedCheckpoints,
      finale: story.finale,
      storySource: source,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      ok: true,
      adventure,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
