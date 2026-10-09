const { AppError } = require('../utils/safe-errors');

/**
 * Validate that an AI-generated story structure conforms strictly to the contract.
 * @param {object} story
 * @param {Array<{id: string, name: string}>} expectedCheckpoints
 * @returns {object} Cleaned, validated story object
 */
function validateStorySchema(story, expectedCheckpoints) {
  if (!story || typeof story !== 'object') {
    throw new AppError('Story payload is not a valid JSON object.', 422, 'INVALID_STORY_FORMAT');
  }

  // 1. Title validation (4-70 chars)
  const title = typeof story.title === 'string' ? story.title.trim() : '';
  if (title.length < 4 || title.length > 70) {
    throw new AppError(`Story title must be between 4 and 70 characters (received ${title.length}).`, 422, 'INVALID_STORY_TITLE');
  }

  // 2. Premise validation (max 500 chars)
  const premise = typeof story.premise === 'string' ? story.premise.trim() : '';
  if (premise.length < 10 || premise.length > 500) {
    throw new AppError(`Story premise must be between 10 and 500 characters (received ${premise.length}).`, 422, 'INVALID_STORY_PREMISE');
  }

  // 3. Opening narration (max 280 chars)
  const openingNarration = typeof story.openingNarration === 'string' ? story.openingNarration.trim() : '';
  if (openingNarration.length < 10 || openingNarration.length > 280) {
    throw new AppError(`Opening narration must be between 10 and 280 characters (received ${openingNarration.length}).`, 422, 'INVALID_OPENING_NARRATION');
  }

  // 4. Finale validation (max 500 chars)
  const finale = typeof story.finale === 'string' ? story.finale.trim() : '';
  if (finale.length < 10 || finale.length > 500) {
    throw new AppError(`Story finale must be between 10 and 500 characters (received ${finale.length}).`, 422, 'INVALID_STORY_FINALE');
  }

  // 5. Checkpoints validation
  if (!Array.isArray(story.checkpoints) || story.checkpoints.length !== expectedCheckpoints.length) {
    throw new AppError(
      `Story checkpoints count mismatch. Expected ${expectedCheckpoints.length}, got ${Array.isArray(story.checkpoints) ? story.checkpoints.length : 0}.`,
      422,
      'CHECKPOINT_COUNT_MISMATCH'
    );
  }

  const expectedIds = expectedCheckpoints.map(cp => cp.id);
  const validatedCheckpoints = [];

  for (let i = 0; i < expectedCheckpoints.length; i++) {
    const rawCp = story.checkpoints[i];
    const expectedId = expectedIds[i];

    if (!rawCp || typeof rawCp !== 'object') {
      throw new AppError(`Checkpoint at index ${i} is not a valid object.`, 422, 'INVALID_CHECKPOINT');
    }

    if (rawCp.checkpointId !== expectedId) {
      throw new AppError(
        `Checkpoint ID mismatch at index ${i}. Expected "${expectedId}", got "${rawCp.checkpointId}".`,
        422,
        'CHECKPOINT_ID_MISMATCH'
      );
    }

    const clue = typeof rawCp.clue === 'string' ? rawCp.clue.trim() : '';
    if (clue.length < 5 || clue.length > 280) {
      throw new AppError(`Checkpoint "${expectedId}" clue must be 5-280 chars (got ${clue.length}).`, 422, 'INVALID_CLUE_LENGTH');
    }

    const hint = typeof rawCp.hint === 'string' ? rawCp.hint.trim() : '';
    if (hint.length < 5 || hint.length > 180) {
      throw new AppError(`Checkpoint "${expectedId}" hint must be 5-180 chars (got ${hint.length}).`, 422, 'INVALID_HINT_LENGTH');
    }

    const arrivalLine = typeof rawCp.arrivalLine === 'string' ? rawCp.arrivalLine.trim() : '';
    if (arrivalLine.length < 5 || arrivalLine.length > 180) {
      throw new AppError(`Checkpoint "${expectedId}" arrivalLine must be 5-180 chars (got ${arrivalLine.length}).`, 422, 'INVALID_ARRIVAL_LINE');
    }

    validatedCheckpoints.push({
      checkpointId: expectedId,
      clue,
      hint,
      arrivalLine,
    });
  }

  return {
    title,
    premise,
    openingNarration,
    checkpoints: validatedCheckpoints,
    finale,
  };
}

module.exports = {
  validateStorySchema,
};
