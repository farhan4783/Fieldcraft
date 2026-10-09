/**
 * Deterministic template story generator.
 * Used when Ollama is offline, unreachable, or returns invalid JSON.
 * Produces atmospheric, tone-matched fictional mysteries grounded in the chosen POIs.
 */

const TEMPLATES_BY_TONE = {
  mystery: {
    titles: [
      'The Whispering Cartographer',
      'The Obsidian Compass Affair',
      'The Cipher of the Four Winds',
      'Shadows in the Public Square',
    ],
    premises: [
      'An enigmatic dispatch was slipped under the archway at dawn. A surveyor from another century left hidden markers across the neighborhood, warning of an unwritten secret.',
      'A vanished clockmaker was said to have hidden the key to an untold chronometer across prominent public landmarks before disappearing into the evening mist.',
    ],
    openingNarrations: [
      'A forgotten journal page has surfaced. Walk into the open air and decipher the physical cues left in plain sight.',
      'The transmission is faint but unmistakable. Step outside. Your first lead lies waiting at a nearby public ground.',
    ],
    clueGenerators: [
      (cp) => `Seek out the grounds of ${cp.name}. Look for where nature and stone meet; a surveyor marked the perimeter with an invisible seal.`,
      (cp) => `Proceed toward ${cp.name}. Amidst the open space, the silent observer noted an ancient alignment with the city grid.`,
      (cp) => `Make your way to ${cp.name}. The final coordinate in the notebook points directly here, waiting for a traveler on foot.`,
    ],
    hints: [
      (cp) => `Walk toward ${cp.name} (${cp.displayCategory}). Look for the open public entrance.`,
      (cp) => `Your destination is ${cp.name}, a known ${cp.displayCategory}.`,
      (cp) => `Head directly to ${cp.name}. The checkpoint will unlock when you are within range.`,
    ],
    arrivalLines: [
      (cp) => `You stand before ${cp.name}. The atmospheric needle twitches—the first marker is decoded.`,
      (cp) => `Arrival at ${cp.name} confirmed. The hidden inscription resonates with the old journal entry.`,
      (cp) => `You have reached ${cp.name}. The pieces of the puzzle align into complete clarity.`,
    ],
    finales: [
      'The mystery is resolved! By traversing the physical realm on foot, you unlocked the surveyor’s long-dormant cipher. The city itself was the key all along.',
      'Case closed. The forgotten landmarks have yielded their secret to someone willing to explore the real world rather than stay indoors.',
    ],
  },
  wonder: {
    titles: [
      'The Starlight Chronometer',
      'Echoes of the Green Canopy',
      'The Song of Stone and Water',
    ],
    premises: [
      'Legend speaks of an unseen current of curiosity that flows through public parks and open plazas, visible only to those who pause their routines and walk.',
      'A traveler from the sky dropped fragments of celestial glass across quiet neighborhood gathering spots. Each spot holds a shimmering resonance.',
    ],
    openingNarrations: [
      'Step outside under the open sky. Let the rhythm of your footsteps guide you to places of everyday wonder.',
      'Take a deep breath and begin walking. The neighborhood holds subtle wonders waiting to be acknowledged.',
    ],
    clueGenerators: [
      (cp) => `Follow the gentle breeze toward ${cp.name}. Notice the living canopy and open sky where the first spark landed.`,
      (cp) => `Gently journey toward ${cp.name}. Stand where the public gathers to catch the reflection of the midday horizon.`,
      (cp) => `Advance to ${cp.name}. Here, the harmony of the neighborhood converges into quiet peace.`,
    ],
    hints: [
      (cp) => `Head over to ${cp.name} (${cp.displayCategory}).`,
      (cp) => `Look for ${cp.name}, situated in the nearby ${cp.displayCategory}.`,
      (cp) => `Your path leads straight to ${cp.name}.`,
    ],
    arrivalLines: [
      (cp) => `You have arrived at ${cp.name}. A quiet sense of wonder settles over the clearing.`,
      (cp) => `Standing at ${cp.name}, the ambient rhythm of the world feels renewed and vivid.`,
      (cp) => `You reached ${cp.name}. The tapestry of open spaces is complete.`,
    ],
    finales: [
      'You have walked the circuit of wonder. The neighborhood has rewarded your footsteps with open air, presence, and perspective.',
      'Journey complete. The true treasure was taking the time to touch grass, listen to the wind, and explore the public world.',
    ],
  },
  playful: {
    titles: [
      'The Case of the Mischievous Raven',
      'The Great Neighborhood Scramble',
      'The Whimsical Courier’s Route',
    ],
    premises: [
      'A clever neighborhood raven has traded glittering curiosities across public landmarks and left rhyming challenges for any detective with good walking shoes.',
      'An eccentric inventor dropped their mechanical gadgets across town while testing a runaway tricycle. Can an energetic sleuth retrace the route?',
    ],
    openingNarrations: [
      'Tie your shoelaces and step outside! A playful trail of riddles is waiting for your boots.',
      'The chase is on! Put the screen away, listen closely, and let your feet do the investigating.',
    ],
    clueGenerators: [
      (cp) => `Hop, skip, or stroll to ${cp.name}! The mischievous critter was spotted dropping clue number one right here.`,
      (cp) => `Track the scampering tracks onward to ${cp.name}. Don't get distracted—the prize is getting closer!`,
      (cp) => `Sprint or wander to ${cp.name}! The final riddle box is stashed right in plain sight.`,
    ],
    hints: [
      (cp) => `Get your shoes moving toward ${cp.name} (${cp.displayCategory})!`,
      (cp) => `The target is ${cp.name}, an energetic ${cp.displayCategory}.`,
      (cp) => `Head right to ${cp.name} to claim the checkpoint!`,
    ],
    arrivalLines: [
      (cp) => `Target reached at ${cp.name}! You caught the raven's trail red-handed!`,
      (cp) => `Ding ding! ${cp.name} unlocked! Your detective stamina is impressive!`,
      (cp) => `Victory at ${cp.name}! You solved the final whimsical prank!`,
    ],
    finales: [
      'Hooray! You cracked the case, out-walked the playful prankster, and proved that the sidewalk is the best playground around!',
      'Mission accomplished! You completed the scramble with flying colors and got some fresh air to boot. Great detective work!',
    ],
  },
};

/**
 * Generate a deterministic story structure from checkpoints and tone.
 */
function generateFallbackStory(checkpoints, tone = 'mystery') {
  const selectedTone = TEMPLATES_BY_TONE[tone] || TEMPLATES_BY_TONE.mystery;

  // Pick deterministic index based on first checkpoint id or name length
  const seed = checkpoints.reduce((acc, cp) => acc + (cp.name ? cp.name.length : 0), 0);
  const titleIdx = seed % selectedTone.titles.length;
  const premiseIdx = seed % selectedTone.premises.length;
  const openingIdx = seed % selectedTone.openingNarrations.length;
  const finaleIdx = seed % selectedTone.finales.length;

  const generatedCheckpoints = checkpoints.map((cp, idx) => {
    const clueFn = selectedTone.clueGenerators[idx % selectedTone.clueGenerators.length];
    const hintFn = selectedTone.hints[idx % selectedTone.hints.length];
    const arrivalFn = selectedTone.arrivalLines[idx % selectedTone.arrivalLines.length];

    return {
      checkpointId: cp.id,
      clue: clueFn(cp),
      hint: hintFn(cp),
      arrivalLine: arrivalFn(cp),
    };
  });

  return {
    title: selectedTone.titles[titleIdx],
    premise: selectedTone.premises[premiseIdx],
    openingNarration: selectedTone.openingNarrations[openingIdx],
    checkpoints: generatedCheckpoints,
    finale: selectedTone.finales[finaleIdx],
  };
}

module.exports = {
  generateFallbackStory,
  TEMPLATES_BY_TONE,
};
