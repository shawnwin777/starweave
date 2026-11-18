// Starweave — the game itself: a night sky where you weave stars of one
// colour into constellations. Drag through 3 or more same-colour stars and
// let go to score; stars fade if you leave them, and twelve lost lights end
// the night. Comets are bonuses, black holes are trouble, and Space fires a
// nova. This module owns the state machine and the loop; the other modules
// own the sky, the weave, the hazards and the drawing.
import { CONFIG } from './config.js';
import { mulberry32, randomSeed } from './random.js';
import { SoundBank } from './audio.js';
import {
  ageStars,
  removeStars,
  spawnStars,
  staggerStarAges,
  starColor,
  starIsFading,
  starsNearDeath,
  targetStarCount,
  topUpStars,
} from './stars.js';
import {
  chainCandidate,
  chainStepBack,
  endWeave,
  extendWeave,
  scoreChain,
  startWeave,
  weaveIsActive,
} from './weave.js';
import {
  catchComet,
  cometAt,
  maybeSpawnBlackHole,
  maybeSpawnComet,
  updateBlackHole,
  updateComets,
} from './hazards.js';
import { drawFrame } from './render.js';
import { readShotQuery, stageShot } from './shots.js';
import { attachInput } from './input.js';

const BEST_SCORE_KEY = 'starweave-best-score';

export function loadBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // A browser that refuses storage still plays; the best score just rests.
  }
}

function freshState(rng) {
  return {
    rng,
    screen: 'title', // 'title' | 'play' | 'over'
    paused: false,
    stars: [],
    comets: [],
    blackHole: null,
    floaters: [],
    weave: null,
    weavePointer: null,
    nebula: [],
    dust: [],
    score: 0,
    level: 1,
    levelScore: 0,
    levelQuota: CONFIG.levelQuotaBase,
    lostLights: 0,
    combo: 1,
    lastWeaveAt: 0,
    novas: CONFIG.novasStart,
    starsWoven: 0,
    bestChain: 0,
    bestScore: loadBestScore(),
    lastSpawnAt: 0,
    nextCometAt: 0,
    nextBlackHoleAt: 0,
    levelBannerUntil: 0,
    startedAt: 0,
  };
}

function paintNebula(state) {
  const colors = [
    'rgba(199, 125, 255, 0.10)',
    'rgba(77, 227, 209, 0.08)',
    'rgba(255, 207, 92, 0.07)',
  ];
  for (let i = 0; i < 5; i++) {
    state.nebula.push({
      x: state.rng() * CONFIG.width,
      y: CONFIG.hudHeight + state.rng() * (CONFIG.height - CONFIG.hudHeight),
      radius: 180 + state.rng() * 220,
      color: colors[i % colors.length],
    });
  }
  for (let i = 0; i < 90; i++) {
    state.dust.push({
      x: state.rng() * CONFIG.width,
      y: state.rng() * CONFIG.height,
      r: 0.6 + state.rng() * 1.1,
      twinkle: state.rng(),
    });
  }
}

function startGame(state, nowMs) {
  state.screen = 'play';
  state.score = 0;
  state.level = 1;
  state.levelScore = 0;
  state.levelQuota = CONFIG.levelQuotaBase;
  state.lostLights = 0;
  state.combo = 1;
  state.lastWeaveAt = 0;
  state.novas = CONFIG.novasStart;
  state.starsWoven = 0;
  state.bestChain = 0;
  state.stars = [];
  state.comets = [];
  state.blackHole = null;
  state.floaters = [];
  state.weave = null;
  state.weavePointer = null;
  state.lastSpawnAt = nowMs;
  state.nextCometAt = nowMs + 8000;
  state.nextBlackHoleAt = nowMs + 20000;
  state.levelBannerUntil = 0;
  state.startedAt = nowMs;
  spawnStars(state, nowMs, targetStarCount(1));
  staggerStarAges(state, nowMs);
}

function endGame(state, sounds) {
  state.screen = 'over';
  endWeave(state);
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    saveBestScore(state.score);
  }
  sounds.gameOver();
}

function advanceLevel(state, sounds, nowMs) {
  state.level += 1;
  state.levelScore = 0;
  state.levelQuota = CONFIG.levelQuotaBase + (state.level - 1) * CONFIG.levelQuotaStep;
  state.novas += 1;
  state.levelBannerUntil = nowMs + 1800;
  sounds.levelUp();
}

function fireNova(state, sounds, nowMs) {
  if (state.screen !== 'play' || state.paused || state.novas <= 0) return;
  const dying = starsNearDeath(state, nowMs);
  if (dying.length === 0) return;
  state.novas -= 1;
  const points = Math.round(
    dying.length * CONFIG.starValue * CONFIG.novaHalfValue,
  );
  state.score += points;
  state.levelScore += points;
  removeStars(state, dying);
  const centre = dying.reduce(
    (acc, star) => ({ x: acc.x + star.x / dying.length, y: acc.y + star.y / dying.length }),
    { x: 0, y: 0 },
  );
  state.floaters.push({
    x: centre.x, y: centre.y, text: `Nova +${points}`, color: '#c77dff', bornAt: nowMs,
  });
  sounds.nova();
  checkLevel(state, sounds, nowMs);
}

function checkLevel(state, sounds, nowMs) {
  if (state.levelScore >= state.levelQuota) {
    advanceLevel(state, sounds, nowMs);
  }
}

function loseLight(state, sounds, nowMs) {
  state.lostLights += 1;
  state.combo = 1;
  sounds.lostLight();
  if (state.lostLights >= CONFIG.lostLightsMax) {
    endGame(state, sounds);
  }
}

function starUnderPointer(state, x, y) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const star of state.stars) {
    const d = Math.hypot(star.x - x, star.y - y);
    if (d < CONFIG.starRadius + 10 && d < nearestDist) {
      nearest = star;
      nearestDist = d;
    }
  }
  return nearest;
}

function tick(state, sounds, nowMs, dtSec) {
  if (state.screen !== 'play' || state.paused) return;
  topUpStars(state, nowMs);
  maybeSpawnComet(state, nowMs);
  maybeSpawnBlackHole(state, nowMs);
  updateComets(state, dtSec);
  const eaten = updateBlackHole(state, dtSec, nowMs);
  if (eaten.length > 0) {
    const hole = state.blackHole;
    if (hole) {
      state.floaters.push({
        x: hole.x, y: hole.y - 70, text: `-${eaten.length} swallowed`, color: '#c77dff', bornAt: nowMs,
      });
    }
  }
  const faded = ageStars(state, nowMs);
  for (const star of faded) {
    if (state.weave && state.weave.stars.includes(star)) endWeave(state);
    loseLight(state, sounds, nowMs);
    if (state.screen !== 'play') break;
  }
  // A weave's stars may have drifted; the chain stays valid — only the
  // pointer moves the preview line, and release scores what is chained.
}

function onPointerDown(state, sounds, x, y) {
  sounds.unlock();
  const nowMs = performance.now();
  if (state.screen === 'title') {
    startGame(state, nowMs);
    return;
  }
  if (state.screen === 'over') {
    startGame(state, nowMs);
    return;
  }
  if (state.paused) return;
  const comet = cometAt(state, x, y);
  if (comet) {
    const fresh = catchComet(state, comet);
    state.floaters.push({
      x: comet.x, y: comet.y, text: `Comet +${CONFIG.cometValue}`, color: '#ffcf5c', bornAt: nowMs,
    });
    sounds.cometChime();
    spawnStars(state, nowMs, fresh);
    return;
  }
  const star = starUnderPointer(state, x, y);
  if (star) {
    startWeave(state, star, nowMs);
    state.weavePointer = { x, y };
    sounds.pluck(0);
  }
}

function onPointerMove(state, sounds, x, y) {
  if (!weaveIsActive(state) || state.paused) return;
  state.weavePointer = { x, y };
  if (chainStepBack(state, x, y)) return;
  const candidate = chainCandidate(state, x, y);
  if (candidate) {
    extendWeave(state, candidate);
    sounds.pluck(state.weave.stars.length - 1);
  }
}

function onPointerUp(state, sounds) {
  if (!weaveIsActive(state)) return;
  const nowMs = performance.now();
  const chain = state.weave.stars;
  if (chain.length >= CONFIG.weaveMinChain) {
    const points = scoreChain(state, chain, nowMs);
    const last = chain[chain.length - 1];
    state.floaters.push({
      x: last.x, y: last.y - 24, text: `+${points}`, color: starColor(last), bornAt: nowMs,
    });
    state.levelScore += points;
    sounds.chord();
    removeStars(state, chain);
    checkLevel(state, sounds, nowMs);
  }
  endWeave(state);
}

function onKey(state, sounds, code) {
  sounds.unlock();
  const nowMs = performance.now();
  if (code === 'KeyM') {
    const muted = sounds.toggleMute();
    state.floaters.push({
      x: CONFIG.width / 2, y: 120,
      text: muted ? 'Sound off' : 'Sound on',
      color: '#f8f7ff', bornAt: nowMs,
    });
    return;
  }
  if (code === 'Enter') {
    if (state.screen !== 'play') startGame(state, nowMs);
    return;
  }
  if (code === 'KeyR') {
    if (state.screen !== 'title') startGame(state, nowMs);
    return;
  }
  if (code === 'KeyP' || code === 'Escape') {
    if (state.screen === 'play') state.paused = !state.paused;
    return;
  }
  if (code === 'Space') {
    fireNova(state, sounds, nowMs);
  }
}

export function bootGame(canvas) {
  const ctx = canvas.getContext('2d');
  const sounds = new SoundBank();
  const shot = readShotQuery();
  const rng = shot ? mulberry32(shot.seed) : mulberry32(randomSeed());
  const state = freshState(rng);
  paintNebula(state);

  attachInput(canvas, {
    onPointerDown: (x, y) => onPointerDown(state, sounds, x, y),
    onPointerMove: (x, y) => onPointerMove(state, sounds, x, y),
    onPointerUp: (x, y) => onPointerUp(state, sounds, x, y),
    onPointerLeave: () => {
      if (weaveIsActive(state)) onPointerUp(state, sounds, 0, 0);
    },
    onKey: (code) => onKey(state, sounds, code),
  });

  // A handle for play-testing and for the finalist review: the live state,
  // reachable from the page itself. It changes nothing about the game.
  window.__starweave = { state, sounds };

  if (shot) {
    // A frozen frame for a screenshot: stage the scene once and draw it.
    const frozenNow = stageShot(state, shot.shot, shot.seed);
    drawFrame(ctx, state, frozenNow);
    return { state, sounds };
  }

  let lastMs = performance.now();
  function frame(nowMs) {
    const dtSec = Math.min(0.05, (nowMs - lastMs) / 1000);
    lastMs = nowMs;
    tick(state, sounds, nowMs, dtSec);
    drawFrame(ctx, state, nowMs);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
  return { state, sounds };
}
