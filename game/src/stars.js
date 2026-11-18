// Starweave — the star field. Stars are born, twinkle, age, and fade out
// unwoven unless the player weaves them first. A star knows its colour, its
// birth, and the moment it will go dark.
import { CONFIG } from './config.js';
import { intBetween, pick, sway } from './random.js';

let nextStarId = 1;

export function starLifetimeForLevel(level) {
  const lifetime =
    CONFIG.starLifetimeMs - (level - 1) * CONFIG.starLifetimeStepMs;
  return Math.max(lifetime, CONFIG.starLifetimeMinMs);
}

// A new star usually arrives as a neighbour of a same-colour star already
// on the sky, so a weave is almost always within reach; otherwise it lands
// anywhere with room. Clusters are what make the game playable at all:
// scattered stars of five colours almost never sit three-in-a-row.
export function makeStar(rng, nowMs, level, existing) {
  if (existing.length > 0 && rng() < CONFIG.clusterChance) {
    const anchor = pick(rng, existing);
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = rng() * Math.PI * 2;
      const dist = 70 + rng() * (CONFIG.weaveReach - 30);
      const x = anchor.x + Math.cos(angle) * dist;
      const y = anchor.y + Math.sin(angle) * dist;
      if (!insideSky(x, y)) continue;
      const crowded = existing.some(
        (other) => Math.hypot(other.x - x, other.y - y) < CONFIG.minStarGap,
      );
      if (crowded) continue;
      return buildStar(rng, nowMs, level, x, y, anchor.colorIndex);
    }
  }
  const margin = 30;
  const top = CONFIG.hudHeight + 30;
  for (let attempt = 0; attempt < 24; attempt++) {
    const x = intBetween(rng, margin, CONFIG.width - margin);
    const y = intBetween(rng, top, CONFIG.height - margin);
    const crowded = existing.some(
      (other) => Math.hypot(other.x - x, other.y - y) < CONFIG.minStarGap,
    );
    if (crowded) continue;
    return buildStar(rng, nowMs, level, x, y, intBetween(rng, 0, CONFIG.starColors.length));
  }
  return null;
}

function insideSky(x, y) {
  return (
    x >= 30 &&
    x <= CONFIG.width - 30 &&
    y >= CONFIG.hudHeight + 30 &&
    y <= CONFIG.height - 30
  );
}

function buildStar(rng, nowMs, level, x, y, colorIndex) {
  const lifetime = starLifetimeForLevel(level);
  return {
    id: nextStarId++,
    x,
    y,
    colorIndex,
    bornAt: nowMs,
    diesAt: nowMs + lifetime,
    phase: rng() * Math.PI * 2,
    twinklePeriod: intBetween(rng, 1400, 2600),
    // A slow drift keeps the sky alive without ever moving a star far
    // enough to break a weave the player is drawing.
    driftX: (rng() - 0.5) * 6,
    driftY: (rng() - 0.5) * 4,
    baseX: x,
    baseY: y,
  };
}

export function starColor(star) {
  return CONFIG.starColors[star.colorIndex];
}

// 1 while the star is young, falling to 0 as its death approaches.
export function starLifeLeft(star, nowMs) {
  const total = star.diesAt - star.bornAt;
  return Math.max(0, (star.diesAt - nowMs) / total);
}

export function starIsFading(star, nowMs) {
  return star.diesAt - nowMs <= CONFIG.fadeWarnMs;
}

// Brightness from twinkle and age: young stars shine, old ones gutter.
export function starBrightness(star, nowMs) {
  const twinkle = 0.72 + 0.28 * sway(nowMs, star.twinklePeriod, star.phase);
  const life = starLifeLeft(star, nowMs);
  const ageFade = life > 0.25 ? 1 : 0.35 + 0.65 * (life / 0.25);
  return twinkle * ageFade;
}

export function starPosition(star, nowMs) {
  const ageSec = (nowMs - star.bornAt) / 1000;
  return {
    x: star.baseX + star.driftX * ageSec,
    y: star.baseY + star.driftY * ageSec,
  };
}

export function spawnStars(state, nowMs, count) {
  for (let i = 0; i < count; i++) {
    const star = makeStar(state.rng, nowMs, state.level, state.stars);
    if (star) state.stars.push(star);
  }
}

// Spread a fresh sky's ages across the first half of a lifetime, so the
// opening stars do not all go dark in the same second.
export function staggerStarAges(state, nowMs) {
  const lifetime = starLifetimeForLevel(state.level);
  for (const star of state.stars) {
    const age = state.rng() * lifetime * 0.5;
    star.bornAt = nowMs - age;
    star.diesAt = star.bornAt + lifetime;
  }
}

export function targetStarCount(level) {
  return Math.min(
    CONFIG.spawnPerLevel + (level - 1) * CONFIG.spawnPerLevelStep,
    CONFIG.spawnMax,
  );
}

// Age every star; return the ones that faded out unwoven this tick.
export function ageStars(state, nowMs) {
  const faded = [];
  state.stars = state.stars.filter((star) => {
    if (nowMs >= star.diesAt) {
      faded.push(star);
      return false;
    }
    return true;
  });
  return faded;
}

// Keep the sky full: offer one new star on a timer while below target.
export function topUpStars(state, nowMs) {
  if (nowMs - state.lastSpawnAt < CONFIG.spawnIntervalMs) return;
  state.lastSpawnAt = nowMs;
  if (state.stars.length < targetStarCount(state.level)) {
    spawnStars(state, nowMs, 1);
  }
}

export function removeStars(state, starsToRemove) {
  const ids = new Set(starsToRemove.map((star) => star.id));
  state.stars = state.stars.filter((star) => !ids.has(star.id));
}

// The dimmest stars — the ones a nova rescues at half value.
export function starsNearDeath(state, nowMs) {
  return state.stars.filter((star) => star.diesAt - nowMs <= CONFIG.fadeWarnMs);
}

// A random star of a colour the sky already shows, for the comet's gift.
export function randomStarColor(rng) {
  return pick(rng, CONFIG.starColors);
}
