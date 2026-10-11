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
        let rawPois = await fetchOverpassPois(latitude, longitude, 1200);
        candidatePois = filterAndNormalizePois(rawPois, latitude, longitude, 1200);

        // Auto-expand radius to 2500m if initial search yielded 0 candidates
        if (candidatePois.length === 0) {
          rawPois = await fetchOverpassPois(latitude, longitude, 2500);
          candidatePois = filterAndNormalizePois(rawPois, latitude, longitude, 2500);
        }
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
        'No suitable public landmarks (parks, squares, libraries) found within 2.5km. Try searching a nearby city or central park!',
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

    // Client-supplied AI options (if user entered a key in UI)
    const customAiOpts = {
      groqApiKey: req.headers['x-groq-key'] || req.body?.groqApiKey,
      geminiApiKey: req.headers['x-gemini-key'] || req.body?.geminiApiKey,
    };

    // Generate story from Cloud Gemma, Gemini, Local Ollama, or Fallback
    const { story, source, model } = await generateStory(selectedCps, tone, durationMinutes, customAiOpts);

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
      storyModel: model || null,
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
