// Starweave — the weave. A drag that starts on a star and passes over
// same-colour stars within reach joins them into a constellation; letting go
// with three or more scores it. The chain may step back over its last star
// to undo it, and a fast second weave grows the combo.
import { CONFIG } from './config.js';
import { starColor } from './stars.js';

export function startWeave(state, star, nowMs) {
  state.weave = { stars: [star], colorIndex: star.colorIndex, startedAt: nowMs };
  state.weavePointer = { x: star.x, y: star.y };
}

export function weaveIsActive(state) {
  return state.weave !== null;
}

export function weaveColor(state) {
  return state.weave ? CONFIG.starColors[state.weave.colorIndex] : null;
}

// The star under the pointer, if it can join the chain in progress.
export function chainCandidate(state, x, y) {
  if (!state.weave) return null;
  const chain = state.weave.stars;
  const last = chain[chain.length - 1];
  for (const star of state.stars) {
    if (star.colorIndex !== state.weave.colorIndex) continue;
    if (chain.includes(star)) continue;
    const d = Math.hypot(star.x - x, star.y - y);
    if (d > CONFIG.starRadius + 14) continue;
    if (Math.hypot(star.x - last.x, star.y - last.y) > CONFIG.weaveReach) continue;
    return star;
  }
  return null;
}

// Stepping back over the previous star shortens the chain by one.
export function chainStepBack(state, x, y) {
  const chain = state.weave.stars;
  if (chain.length < 2) return false;
  const previous = chain[chain.length - 2];
  if (Math.hypot(previous.x - x, previous.y - y) <= CONFIG.starRadius + 14) {
    chain.pop();
    return true;
  }
  return false;
}

export function extendWeave(state, star) {
  state.weave.stars.push(star);
}

// Score a finished chain: base value per star, a bonus for length, and the
// combo multiplier for weaving again quickly. Returns the points earned.
export function scoreChain(state, chain, nowMs) {
  const length = chain.length;
  const base = length * CONFIG.starValue;
  const lengthBonus = (length - CONFIG.weaveMinChain) * CONFIG.chainBonusPerStar;
  if (nowMs - state.lastWeaveAt <= CONFIG.comboWindowMs) {
    state.combo = Math.min(state.combo + 1, CONFIG.comboMax);
  } else {
    state.combo = 1;
  }
  state.lastWeaveAt = nowMs;
  const points = Math.round((base + lengthBonus) * state.combo);
  state.score += points;
  state.starsWoven += length;
  state.bestChain = Math.max(state.bestChain, length);
  return points;
}

export function endWeave(state) {
  state.weave = null;
  state.weavePointer = null;
}

// The live preview line: from the last chained star to the pointer.
export function weavePreviewEnd(state) {
  return state.weavePointer;
}
