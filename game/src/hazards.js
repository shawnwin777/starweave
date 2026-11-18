// Starweave — the hazards. Comets streak across the sky: click one for a
// bonus and a burst of fresh stars. From level 3 a black hole drifts across
// and swallows every star it touches. Both are scenery with consequences,
// never a punishment the player cannot see coming.
import { CONFIG } from './config.js';
import { intBetween } from './random.js';

export function maybeSpawnComet(state, nowMs) {
  const nextAt = state.nextCometAt;
  if (nowMs < nextAt) return;
  state.nextCometAt =
    nowMs +
    CONFIG.cometEveryMs +
    intBetween(state.rng, -CONFIG.cometEveryJitterMs, CONFIG.cometEveryJitterMs);
  const fromLeft = state.rng() < 0.5;
  const y = intBetween(state.rng, CONFIG.hudHeight + 80, CONFIG.height - 120);
  state.comets.push({
    x: fromLeft ? -40 : CONFIG.width + 40,
    y,
    vx: (fromLeft ? 1 : -1) * CONFIG.cometSpeed,
    vy: intBetween(state.rng, -40, 40),
    bornAt: nowMs,
    tail: 90,
  });
}

export function updateComets(state, dtSec) {
  state.comets = state.comets.filter((comet) => {
    comet.x += comet.vx * dtSec;
    comet.y += comet.vy * dtSec;
    return comet.x > -160 && comet.x < CONFIG.width + 160;
  });
}

export function cometAt(state, x, y) {
  return state.comets.find(
    (comet) => Math.hypot(comet.x - x, comet.y - y) < 34,
  );
}

export function catchComet(state, comet) {
  state.comets = state.comets.filter((other) => other !== comet);
  state.score += CONFIG.cometValue;
  return CONFIG.cometFreshStars;
}

export function maybeSpawnBlackHole(state, nowMs) {
  if (state.level < CONFIG.blackHoleFromLevel) return;
  if (state.blackHole) return;
  if (nowMs < state.nextBlackHoleAt) return;
  state.nextBlackHoleAt = nowMs + CONFIG.blackHoleEveryMs;
  const fromLeft = state.rng() < 0.5;
  state.blackHole = {
    x: fromLeft ? -CONFIG.blackHoleRadius : CONFIG.width + CONFIG.blackHoleRadius,
    y: intBetween(state.rng, 160, CONFIG.height - 160),
    vx: (fromLeft ? 1 : -1) * CONFIG.blackHoleSpeed,
    bornAt: nowMs,
  };
}

export function updateBlackHole(state, dtSec, nowMs) {
  const hole = state.blackHole;
  if (!hole) return [];
  hole.x += hole.vx * dtSec;
  const eaten = state.stars.filter(
    (star) => Math.hypot(star.x - hole.x, star.y - hole.y) < CONFIG.blackHoleRadius,
  );
  if (eaten.length > 0) {
    const ids = new Set(eaten.map((star) => star.id));
    state.stars = state.stars.filter((star) => !ids.has(star.id));
  }
  if (
    nowMs - hole.bornAt > CONFIG.blackHoleLifeMs ||
    hole.x < -CONFIG.blackHoleRadius - 80 ||
    hole.x > CONFIG.width + CONFIG.blackHoleRadius + 80
  ) {
    state.blackHole = null;
  }
  return eaten;
}
