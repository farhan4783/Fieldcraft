const { callOllama } = require('./ollama.service');
const { generateFallbackStory } = require('./fallback-story.service');
const { validateStorySchema } = require('../validators/story.schema');

const SYSTEM_PROMPT = `You are FIELDCRAFT's Game Master narrative engine.
Your task is to write a short, fictional outdoor mystery walking adventure based EXCLUSIVELY on a supplied list of real public checkpoints.

CRITICAL RULES AND GUARDRAILS:
1. Ground your fictional clues ONLY around the supplied checkpoint names and categories.
2. DO NOT make factual historical claims or invent real-world facts about the places.
3. NEVER instruct the player to enter a building, private property, road, construction site, or restricted area.
4. NEVER instruct the player to approach, speak to, or photograph strangers.
5. NEVER invent new coordinates, new places, or alter the checkpoint IDs.
6. Return STRICT, VALID JSON ONLY. Do NOT include markdown code fences (\`\`\`json), comments, or introductory text.

REQUIRED JSON FORMAT:
{
  "title": "Short case title (4-70 chars)",
  "premise": "Fictional case backstory (10-500 chars)",
  "openingNarration": "Spoken invitation to begin walk (10-280 chars)",
  "checkpoints": [
    {
      "checkpointId": "EXACT_ID_MATCH",
      "clue": "Atmospheric clue guiding player to destination without naming it directly (5-280 chars)",
      "hint": "More direct description naming the place for stuck players (5-180 chars)",
      "arrivalLine": "Celebratory narrative line when player arrives (5-180 chars)"
    }
  ],
  "finale": "Resolution of the fictional mystery when last checkpoint is reached (10-500 chars)"
}`;

/**
 * Generate story using Ollama Gemma, with 1 repair retry and deterministic fallback.
 * @param {Array<object>} checkpoints - Array of selected checkpoints
 * @param {string} tone - 'mystery', 'wonder', or 'playful'
 * @param {number} durationMinutes
 * @returns {Promise<{story: object, source: 'gemma' | 'template-fallback'}>}
 */
async function generateStory(checkpoints, tone = 'mystery', durationMinutes = 20) {
  // If checkpoints are empty, fallback immediately
  if (!checkpoints || checkpoints.length === 0) {
    return {
      story: generateFallbackStory(checkpoints, tone),
      source: 'template-fallback',
    };
  }

  const cpDescriptions = checkpoints.map((cp, idx) => ({
    checkpointId: cp.id,
    order: idx + 1,
    name: cp.name,
    category: cp.displayCategory,
    distanceMeters: cp.distanceFromOriginMeters,
  }));

  const userPrompt = `Generate a ${tone} mystery for a ${durationMinutes}-minute walk.
The checkpoints are strictly ordered as follows:
${JSON.stringify(cpDescriptions, null, 2)}

Ensure every checkpointId matches exactly. Output pure JSON.`;

  try {
    const rawResponse = await callOllama(SYSTEM_PROMPT, userPrompt);
    const cleaned = cleanJsonString(rawResponse);
    const parsed = JSON.parse(cleaned);
    const validated = validateStorySchema(parsed, checkpoints);

    return {
      story: validated,
      source: 'gemma',
    };
  } catch (err) {
    // Attempt 1 repair retry if it failed
    console.warn(`[Story] Primary generation failed (${err.message}). Attempting repair...`);

    try {
      const repairPrompt = `The previous response failed validation: "${err.message}".
Please re-output the EXACT valid JSON structure for these checkpoints:
${JSON.stringify(cpDescriptions, null, 2)}
Tone: ${tone}. Remember: exact IDs, strict JSON only.`;

      const repairRaw = await callOllama(SYSTEM_PROMPT, repairPrompt);
      const repairCleaned = cleanJsonString(repairRaw);
      const repairParsed = JSON.parse(repairCleaned);
      const repairValidated = validateStorySchema(repairParsed, checkpoints);

      return {
        story: repairValidated,
        source: 'gemma',
      };
    } catch (repairErr) {
      console.warn(`[Story] Repair failed (${repairErr.message}). Using deterministic fallback.`);
      return {
        story: generateFallbackStory(checkpoints, tone),
        source: 'template-fallback',
      };
    }
  }
}

/**
 * Strip potential Markdown code blocks or wrapping commentary to extract the pure JSON object.
 */
function cleanJsonString(str) {
  if (!str || typeof str !== 'string') return '{}';
  let cleaned = str.trim();

  // If enclosed in a markdown code fence anywhere in the string, extract the fence contents
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Extract from the first '{' to the last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

module.exports = {
  generateStory,
  SYSTEM_PROMPT,
  cleanJsonString,
};
