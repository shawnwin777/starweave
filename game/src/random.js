// Starweave — a tiny seeded random number generator (mulberry32) and the
// small helpers the game draws randomness from. Seeding matters: the
// screenshot scenes in shots.js replay one fixed sky, and a fresh run of the
// game seeds from the clock so no two nights are alike.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

// Pick an integer in [min, max).
export function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}

// Pick one element of an array.
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

// A value that drifts smoothly between -1 and 1, for twinkling.
export function sway(timeMs, periodMs, phase) {
  return Math.sin((timeMs / periodMs) * Math.PI * 2 + phase);
}
