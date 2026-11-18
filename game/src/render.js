// Starweave — everything the player sees, drawn on one canvas. The sky is a
// gradient with a soft horizon glow and a few painted nebula clouds; stars
// glow and twinkle; a weave in progress draws a bright thread between its
// stars; the HUD sits in a slim top bar; the title and results screens are
// drawn over a dimmed sky. Nothing here changes game state.
import { CONFIG } from './config.js';
import {
  starBrightness,
  starColor,
  starIsFading,
  starLifeLeft,
  starPosition,
} from './stars.js';
import { weaveColor, weaveIsActive } from './weave.js';

export function drawFrame(ctx, state, nowMs) {
  drawSky(ctx, state);
  drawBlackHole(ctx, state, nowMs);
  drawStars(ctx, state, nowMs);
  drawComets(ctx, state, nowMs);
  drawWeave(ctx, state, nowMs);
  drawFloaters(ctx, state, nowMs);
  if (state.screen === 'play') drawHud(ctx, state, nowMs);
  if (state.screen === 'title') drawTitle(ctx, state, nowMs);
  if (state.screen === 'over') drawResults(ctx, state, nowMs);
  if (state.levelBannerUntil > nowMs) drawLevelBanner(ctx, state, nowMs);
  if (state.paused) drawPaused(ctx, state);
}

function drawSky(ctx, state) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  gradient.addColorStop(0, CONFIG.skyTop);
  gradient.addColorStop(0.75, CONFIG.skyBottom);
  gradient.addColorStop(1, CONFIG.horizonGlow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  // Painted nebula clouds, fixed by the run's seed so the sky never jumps.
  for (const cloud of state.nebula) {
    const radial = ctx.createRadialGradient(
      cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius,
    );
    radial.addColorStop(0, cloud.color);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(cloud.x - cloud.radius, cloud.y - cloud.radius, cloud.radius * 2, cloud.radius * 2);
  }
  // Faint background dust, far dimmer than any playable star.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (const mote of state.dust) {
    ctx.globalAlpha = 0.12 + 0.2 * mote.twinkle;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBlackHole(ctx, state, nowMs) {
  const hole = state.blackHole;
  if (!hole) return;
  const spin = (nowMs / 240) % (Math.PI * 2);
  const glow = ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, CONFIG.blackHoleRadius * 1.8);
  glow.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
  glow.addColorStop(0.55, 'rgba(88, 60, 180, 0.55)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, CONFIG.blackHoleRadius * 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Accretion ring, tilted, spinning slowly.
  ctx.save();
  ctx.translate(hole.x, hole.y);
  ctx.rotate(spin);
  ctx.strokeStyle = '#c77dff';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, CONFIG.blackHoleRadius + 10, (CONFIG.blackHoleRadius + 10) * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#05030f';
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, CONFIG.blackHoleRadius * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

function drawStars(ctx, state, nowMs) {
  for (const star of state.stars) {
    const pos = starPosition(star, nowMs);
    const brightness = starBrightness(star, nowMs);
    const color = starColor(star);
    const fading = starIsFading(star, nowMs);
    const pulse = fading ? 0.65 + 0.35 * Math.sin(nowMs / 110) : 1;
    const radius = CONFIG.starDrawRadius * (0.85 + 0.3 * brightness) * pulse;
    // Halo.
    const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 3.4);
    halo.addColorStop(0, hexToRgba(color, 0.55 * brightness));
    halo.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 3.4, 0, Math.PI * 2);
    ctx.fill();
    // Four-point star sparkle.
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = hexToRgba(color, 0.95 * brightness);
    const arm = radius * 1.7;
    const waist = radius * 0.32;
    ctx.beginPath();
    ctx.moveTo(0, -arm);
    ctx.quadraticCurveTo(waist, -waist, arm, 0);
    ctx.quadraticCurveTo(waist, waist, 0, arm);
    ctx.quadraticCurveTo(-waist, waist, -arm, 0);
    ctx.quadraticCurveTo(-waist, -waist, 0, -arm);
    ctx.fill();
    ctx.restore();
    // Core.
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * brightness})`;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    if (fading) {
      // A fading star wears a thin warning ring.
      ctx.strokeStyle = `rgba(255, 107, 107, ${0.55 + 0.4 * Math.sin(nowMs / 110)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.weave && state.weave.stars.includes(star)) {
      ctx.strokeStyle = hexToRgba(color, 0.9);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 11, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawComets(ctx, state, nowMs) {
  for (const comet of state.comets) {
    const angle = Math.atan2(comet.vy, comet.vx);
    const tailX = comet.x - Math.cos(angle) * comet.tail;
    const tailY = comet.y - Math.sin(angle) * comet.tail;
    const tailGrad = ctx.createLinearGradient(comet.x, comet.y, tailX, tailY);
    tailGrad.addColorStop(0, 'rgba(255, 240, 200, 0.9)');
    tailGrad.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.strokeStyle = tailGrad;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(comet.x, comet.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 207, 92, 0.5)';
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, 13, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWeave(ctx, state, nowMs) {
  if (!weaveIsActive(state)) return;
  const chain = state.weave.stars;
  const color = weaveColor(state);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Soft glow pass, then a bright core pass.
  for (const [width, alpha] of [[10, 0.25], [3.5, 0.95]]) {
    ctx.strokeStyle = hexToRgba(color, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    chain.forEach((star, i) => {
      const pos = starPosition(star, nowMs);
      if (i === 0) ctx.moveTo(pos.x, pos.y);
      else ctx.lineTo(pos.x, pos.y);
    });
    const pointer = state.weavePointer;
    if (pointer) {
      ctx.lineTo(pointer.x, pointer.y);
    }
    ctx.stroke();
  }
  // Chain length badge at the pointer.
  if (chain.length >= CONFIG.weaveMinChain && state.weavePointer) {
    const pointer = state.weavePointer;
    ctx.fillStyle = hexToRgba(color, 0.95);
    ctx.font = '700 22px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${chain.length}`, pointer.x + 18, pointer.y - 18);
  }
  ctx.restore();
}

function drawFloaters(ctx, state, nowMs) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  state.floaters = state.floaters.filter((floater) => nowMs - floater.bornAt < 1100);
  for (const floater of state.floaters) {
    const age = (nowMs - floater.bornAt) / 1100;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = floater.color;
    ctx.font = '700 26px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(floater.text, floater.x, floater.y - age * 46);
  }
  ctx.restore();
}

function drawHud(ctx, state, nowMs) {
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.hudHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.hudHeight + 0.5);
  ctx.lineTo(CONFIG.width, CONFIG.hudHeight + 0.5);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8f7ff';
  ctx.font = CONFIG.hudFont;
  ctx.textAlign = 'left';
  ctx.fillText(`Score  ${state.score.toLocaleString('en-US')}`, 24, 26);
  ctx.fillText(`Level ${state.level}`, 300, 26);

  // Quota progress bar under the level.
  const quota = state.levelQuota;
  const progress = Math.min(1, state.levelScore / quota);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  roundRect(ctx, 300, 42, 150, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#4de3d1';
  roundRect(ctx, 300, 42, 150 * progress, 8, 4);
  ctx.fill();

  // Lost lights: twelve small moons on the right; a lost one is dark.
  ctx.textAlign = 'right';
  ctx.fillText('Lights', CONFIG.width - 320, 26);
  for (let i = 0; i < CONFIG.lostLightsMax; i++) {
    const x = CONFIG.width - 300 + i * 19;
    const lost = i < state.lostLights;
    ctx.fillStyle = lost ? 'rgba(255, 255, 255, 0.14)' : '#ffe9a8';
    ctx.beginPath();
    ctx.arc(x, 26, 6, 0, Math.PI * 2);
    ctx.fill();
    if (!lost) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(x, 26, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Combo and novas.
  ctx.textAlign = 'left';
  if (state.combo > 1 && nowMs - state.lastWeaveAt < CONFIG.comboWindowMs) {
    ctx.fillStyle = '#ffcf5c';
    ctx.font = '700 22px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`Combo ×${state.combo}`, 500, 26);
  }
  ctx.fillStyle = '#c77dff';
  ctx.font = CONFIG.hudFont;
  ctx.fillText(`Novas ${state.novas}  (Space)`, 700, 26);
  ctx.fillStyle = 'rgba(248, 247, 255, 0.55)';
  ctx.font = '400 15px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('M mute · P pause', CONFIG.width - 24, 50);
  ctx.restore();
}

function drawTitle(ctx, state, nowMs) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 24, 0.45)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bob = Math.sin(nowMs / 900) * 6;
  ctx.fillStyle = '#f8f7ff';
  ctx.font = CONFIG.titleFont;
  ctx.shadowColor = '#c77dff';
  ctx.shadowBlur = 34;
  ctx.fillText('STARWEAVE', CONFIG.width / 2, 250 + bob);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffcf5c';
  ctx.font = '400 26px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText('Weave the night sky into constellations', CONFIG.width / 2, 330 + bob);
  ctx.fillStyle = 'rgba(248, 247, 255, 0.85)';
  ctx.font = '400 21px "Trebuchet MS", "Segoe UI", sans-serif';
  const lines = [
    'Drag through 3 or more stars of the same colour to weave them.',
    'Stars fade if you leave them — lose 12 lights and the night ends.',
    'Catch comets for bonuses. Space fires a nova. Beware the black hole.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, CONFIG.width / 2, 420 + i * 34));
  const pulse = state.frozen ? 1 : 0.6 + 0.4 * Math.sin(nowMs / 420);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#4de3d1';
  ctx.font = '700 26px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText('Click or press Enter to begin', CONFIG.width / 2, 580);
  ctx.globalAlpha = 1;
  if (state.bestScore > 0) {
    ctx.fillStyle = 'rgba(248, 247, 255, 0.7)';
    ctx.font = '400 19px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`Best score: ${state.bestScore.toLocaleString('en-US')}`, CONFIG.width / 2, 640);
  }
  ctx.restore();
}

function drawResults(ctx, state, nowMs) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 24, 0.6)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8f7ff';
  ctx.font = '700 64px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.shadowColor = '#ff6b6b';
  ctx.shadowBlur = 26;
  ctx.fillText('THE NIGHT ENDS', CONFIG.width / 2, 220);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffcf5c';
  ctx.font = '700 44px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText(state.score.toLocaleString('en-US'), CONFIG.width / 2, 310);
  ctx.fillStyle = 'rgba(248, 247, 255, 0.85)';
  ctx.font = '400 22px "Trebuchet MS", "Segoe UI", sans-serif';
  const rows = [
    `Level reached: ${state.level}`,
    `Longest constellation: ${state.bestChain} stars`,
    `Stars woven: ${state.starsWoven}`,
    `Best score: ${Math.max(state.bestScore, state.score).toLocaleString('en-US')}`,
  ];
  rows.forEach((row, i) => ctx.fillText(row, CONFIG.width / 2, 380 + i * 36));
  const pulse = state.frozen ? 1 : 0.6 + 0.4 * Math.sin(nowMs / 420);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#4de3d1';
  ctx.font = '700 26px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText('Press R or click to weave again', CONFIG.width / 2, 580);
  ctx.restore();
}

function drawLevelBanner(ctx, state, nowMs) {
  const remaining = state.levelBannerUntil - nowMs;
  const alpha = Math.min(1, remaining / 500);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4de3d1';
  ctx.font = '700 40px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.shadowColor = '#4de3d1';
  ctx.shadowBlur = 22;
  ctx.fillText(`LEVEL ${state.level}`, CONFIG.width / 2, 150);
  ctx.restore();
}

function drawPaused(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8f7ff';
  ctx.font = '700 52px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText('PAUSED', CONFIG.width / 2, CONFIG.height / 2 - 20);
  ctx.fillStyle = 'rgba(248, 247, 255, 0.75)';
  ctx.font = '400 22px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText('Press P to keep weaving', CONFIG.width / 2, CONFIG.height / 2 + 40);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
