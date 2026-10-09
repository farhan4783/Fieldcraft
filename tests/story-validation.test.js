const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStorySchema } = require('../src/validators/story.schema');

const mockCheckpoints = [
  { id: 'cp-1', name: 'Pine Park' },
  { id: 'cp-2', name: 'Marble Fountain' },
];

test('validateStorySchema accepts conforming story structure', () => {
  const validStory = {
    title: 'The Whispering Stone',
    premise: 'A lost artifact from the 19th century was split into two hidden segments across the town.',
    openingNarration: 'Put on your walking shoes and listen closely to the first direction.',
    checkpoints: [
      {
        checkpointId: 'cp-1',
        clue: 'Walk to the edge of the tall pines where the shade stays longest.',
        hint: 'Head over to Pine Park.',
        arrivalLine: 'You have found the grove of tall pines.',
      },
      {
        checkpointId: 'cp-2',
        clue: 'Follow the sound of flowing water to the carved stone basin.',
        hint: 'Proceed to Marble Fountain.',
        arrivalLine: 'The second piece of the artifact is revealed.',
      },
    ],
    finale: 'The two pieces reunite! The forgotten mystery of the city founders is solved.',
  };

  const result = validateStorySchema(validStory, mockCheckpoints);
  assert.equal(result.title, 'The Whispering Stone');
  assert.equal(result.checkpoints.length, 2);
  assert.equal(result.checkpoints[0].checkpointId, 'cp-1');
});

test('validateStorySchema rejects missing or short title', () => {
  const badStory = {
    title: 'Hi',
    premise: 'A valid premise that has plenty of characters to pass the minimum character count.',
    openingNarration: 'Valid opening narration for the player to hear.',
    checkpoints: [],
    finale: 'Valid finale of the adventure.',
  };

  assert.throws(() => {
    validateStorySchema(badStory, mockCheckpoints);
  }, /Story title must be between 4 and 70 characters/);
});

test('validateStorySchema rejects checkpoint ID mismatch', () => {
  const mismatchedStory = {
    title: 'The Lost Cipher',
    premise: 'A valid premise that has plenty of characters to pass the minimum character count.',
    openingNarration: 'Valid opening narration for the player to hear.',
    checkpoints: [
      {
        checkpointId: 'cp-999', // wrong ID
        clue: 'Walk to the edge of the tall pines.',
        hint: 'Head over to Pine Park.',
        arrivalLine: 'You have found the grove.',
      },
      {
        checkpointId: 'cp-2',
        clue: 'Follow the sound of flowing water.',
        hint: 'Proceed to Marble Fountain.',
        arrivalLine: 'The second piece is revealed.',
      },
    ],
    finale: 'Valid finale of the adventure.',
  };

  assert.throws(() => {
    validateStorySchema(mismatchedStory, mockCheckpoints);
  }, /Checkpoint ID mismatch/);
});

const { cleanJsonString } = require('../src/services/story.service');
const { generateFallbackStory } = require('../src/services/fallback-story.service');

test('cleanJsonString extracts pure JSON from commentary and markdown code blocks', () => {
  const llmOutput = `Here is your mystery adventure:
\`\`\`json
{
  "title": "The Whispering Stone",
  "premise": "A lost artifact from the 19th century was split into two hidden segments.",
  "openingNarration": "Put on your walking shoes and listen closely.",
  "checkpoints": [
    {
      "checkpointId": "cp-1",
      "clue": "Walk to the edge of the tall pines where the shade stays longest.",
      "hint": "Head over to Pine Park.",
      "arrivalLine": "You have found the grove of tall pines."
    },
    {
      "checkpointId": "cp-2",
      "clue": "Follow the sound of flowing water to the carved stone basin.",
      "hint": "Proceed to Marble Fountain.",
      "arrivalLine": "The second piece of the artifact is revealed."
    }
  ],
  "finale": "The two pieces reunite! The forgotten mystery of the city founders is solved."
}
\`\`\`
I hope you enjoy this walk!`;

  const cleaned = cleanJsonString(llmOutput);
  const parsed = JSON.parse(cleaned);
  assert.equal(parsed.title, 'The Whispering Stone');
  assert.equal(parsed.checkpoints.length, 2);
});

test('generateFallbackStory satisfies schema validation for all allowed tones', () => {
  const tones = ['mystery', 'wonder', 'playful'];

  for (const tone of tones) {
    const fallback = generateFallbackStory(mockCheckpoints, tone);
    const validated = validateStorySchema(fallback, mockCheckpoints);
    assert.ok(validated.title.length >= 4);
    assert.ok(validated.premise.length >= 10);
    assert.ok(validated.openingNarration.length >= 10);
    assert.ok(validated.finale.length >= 10);
    assert.equal(validated.checkpoints.length, mockCheckpoints.length);
    assert.equal(validated.checkpoints[0].checkpointId, 'cp-1');
  }
});

test('validateStorySchema strips unknown or malicious fields', () => {
  const storyWithExtraFields = {
    title: 'The Safe Title',
    premise: 'A valid premise that has plenty of characters to pass the minimum character count.',
    openingNarration: 'Valid opening narration for the player to hear.',
    dangerousScript: '<script>alert("hack")</script>',
    checkpoints: [
      {
        checkpointId: 'cp-1',
        clue: 'Walk to the edge of the tall pines.',
        hint: 'Head over to Pine Park.',
        arrivalLine: 'You have found the grove.',
        injectedCode: 'eval("rm -rf")',
      },
      {
        checkpointId: 'cp-2',
        clue: 'Follow the sound of flowing water.',
        hint: 'Proceed to Marble Fountain.',
        arrivalLine: 'The second piece is revealed.',
      },
    ],
    finale: 'Valid finale of the adventure.',
  };

  const validated = validateStorySchema(storyWithExtraFields, mockCheckpoints);
  assert.equal(validated.dangerousScript, undefined);
  assert.equal(validated.checkpoints[0].injectedCode, undefined);
});
