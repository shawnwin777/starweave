// Starweave — deterministic screenshot scenes. The game reads ?shot=start,
// ?shot=play or ?shot=end (with an optional &seed=) and stages one frozen
// frame: the title screen, a mid-game weave, or the results screen. The
// scenes are built from the same state and the same renderer the live game
// uses, so a screenshot is a real render of the game's own code — just one
// with the clock stopped and the dice loaded.
import { CONFIG } from './config.js';
import { mulberry32, intBetween } from './random.js';
import { makeStar } from './stars.js';

export function readShotQuery() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot !== 'start' && shot !== 'play' && shot !== 'end') return null;
  const seed = Number.parseInt(params.get('seed') ?? '1', 10);
  return { shot, seed: Number.isFinite(seed) ? seed : 1 };
}

// Fill the state with a staged scene and return the frozen timestamp the
// renderer should draw with. The main loop never advances while a shot is
// staged: updates are skipped and nowMs stays at this value.
export function stageShot(state, shotName, seed) {
  const rng = mulberry32(seed);
  state.rng = rng;
  // Frozen: the prompt pulse and the title bob draw at full strength, so a
  // screenshot never catches them at the dim end of their cycle.
  state.frozen = true;
  const nowMs = 60000;
  state.stars = [];
  state.comets = [];
  state.blackHole = null;
  state.floaters = [];
  state.weave = null;
  state.weavePointer = null;
  state.levelBannerUntil = 0;

  if (shotName === 'start') {
    state.screen = 'title';
    state.bestScore = 4820;
    scatterDecorativeStars(state, rng, nowMs, 34);
    return nowMs;
  }

  if (shotName === 'play') {
    state.screen = 'play';
    state.score = 1240;
    state.level = 2;
    state.levelScore = 260;
    state.levelQuota = CONFIG.levelQuotaBase + CONFIG.levelQuotaStep;
    state.lostLights = 2;
    state.combo = 3;
    state.lastWeaveAt = nowMs - 1200;
    state.novas = 2;
    scatterDecorativeStars(state, rng, nowMs, 30);
    stageMidWeave(state, rng, nowMs);
    state.comets.push({
      x: 980, y: 210, vx: -CONFIG.cometSpeed, vy: 30, bornAt: nowMs, tail: 90,
    });
    return nowMs;
  }

  // shotName === 'end'
  state.screen = 'over';
  state.score = 4820;
  state.level = 5;
  state.bestChain = 9;
  state.starsWoven = 87;
  state.bestScore = 4820;
  state.lostLights = CONFIG.lostLightsMax;
  scatterDecorativeStars(state, rng, nowMs, 26);
  return nowMs;
}

function scatterDecorativeStars(state, rng, nowMs, count) {
  for (let i = 0; i < count; i++) {
    const star = makeStar(rng, nowMs, 1, state.stars);
    if (star) {
      // Spread their ages so the sky shows young and old stars at once.
      star.bornAt = nowMs - intBetween(rng, 0, 9000);
      star.diesAt = star.bornAt + CONFIG.starLifetimeMs;
      state.stars.push(star);
    }
  }
}

// A five-star amber chain, half drawn, with the pointer hovering past the
// last star — the moment a weave is about to pay off.
function stageMidWeave(state, rng, nowMs) {
  const chain = [];
  let x = 420;
  let y = 420;
  for (let i = 0; i < 5; i++) {
    const star = makeStar(rng, nowMs, 2, state.stars);
    if (!star) break;
    star.colorIndex = 0; // amber
    star.x = x;
    star.y = y;
    star.baseX = x;
    star.baseY = y;
    star.bornAt = nowMs - 2000;
    star.diesAt = nowMs + 11000;
    chain.push(star);
    state.stars.push(star);
    x += 95 + intBetween(rng, 0, 40);
    y += intBetween(rng, -55, 55);
    y = Math.max(180, Math.min(CONFIG.height - 80, y));
  }
  if (chain.length >= 3) {
    const last = chain[chain.length - 1];
    state.weave = { stars: chain, colorIndex: 0, startedAt: nowMs - 900 };
    state.weavePointer = { x: last.x + 70, y: last.y - 30 };
  }
}
