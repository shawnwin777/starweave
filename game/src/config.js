// Starweave — tuning constants. One place for every number the game balances on,
// so a tweak never means hunting through the other modules.
export const CONFIG = {
  // Logical canvas size. The page scales the canvas to the window; the game
  // always lays out in this space so screenshots are identical every time.
  width: 1280,
  height: 800,

  // The sky. Deep indigo at the top, a little lighter toward the horizon.
  skyTop: '#070b1d',
  skyBottom: '#1a2a52',
  horizonGlow: '#2c4a7c',

  // Five star colours. A weave may only join stars of one colour.
  starColors: ['#ffcf5c', '#ff6b6b', '#4de3d1', '#c77dff', '#f8f7ff'],
  starColorNames: ['amber', 'coral', 'aqua', 'lilac', 'pearl'],

  // Star field.
  starRadius: 13, // hit radius in pixels
  starDrawRadius: 7, // drawn radius at full brightness
  minStarGap: 46, // stars never spawn closer than this to another star
  spawnPerLevel: 34, // target star count at level 1
  spawnPerLevelStep: 3, // extra stars per level
  spawnMax: 48,
  spawnIntervalMs: 500, // how often a new star is offered
  starLifetimeMs: 20000, // a star's full life before it fades out
  starLifetimeStepMs: 1000, // lifetime lost per level
  starLifetimeMinMs: 12000,
  fadeWarnMs: 3500, // last stretch of life: the star pulses as a warning

  // Weaving. Drag from star to star; only same-colour stars within reach join.
  weaveReach: 170, // max pixels between two chained stars
  clusterChance: 0.6, // a new star usually joins a same-colour neighbour, so chains exist
  weaveMinChain: 3, // a chain shorter than this scores nothing
  starValue: 10, // base points per star in a chain
  chainBonusPerStar: 6, // extra points per star beyond the third
  comboWindowMs: 4000, // weave again inside this window to grow the combo
  comboMax: 5,

  // Levels. Reaching the quota advances a level: faster stars, more of them.
  levelQuotaBase: 400, // score needed to clear level 1
  levelQuotaStep: 350, // extra quota per level

  // Losing. Each star that fades out unwoven costs one light.
  lostLightsMax: 12,

  // Novas. Space clears every star near the end of its life, at half value.
  novasStart: 3,
  novaHalfValue: 0.5,

  // Comets. A streaking bonus: click one for points and fresh stars.
  cometEveryMs: 14000,
  cometEveryJitterMs: 6000,
  cometValue: 150,
  cometFreshStars: 5,
  cometSpeed: 620, // pixels per second

  // Black holes. From level 3, one drifts across and swallows stars it touches.
  blackHoleFromLevel: 3,
  blackHoleEveryMs: 26000,
  blackHoleRadius: 54,
  blackHoleSpeed: 46, // pixels per second
  blackHoleLifeMs: 22000,

  // HUD layout.
  hudHeight: 64,
  hudFont: '600 20px "Trebuchet MS", "Segoe UI", sans-serif',
  titleFont: '700 84px "Trebuchet MS", "Segoe UI", sans-serif',
};
