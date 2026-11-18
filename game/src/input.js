// Starweave — pointer and keyboard input. The mouse (or a finger) is the
// weaver: press on a star, drag through same-colour stars, release to score.
// The keyboard plays too: Enter starts, R restarts, Space fires a nova,
// P pauses, M mutes. Nothing here mutates the world directly; every handler
// reports an intent and main.js decides what it means.
import { CONFIG } from './config.js';

export function canvasPosition(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * CONFIG.width,
    y: ((clientY - rect.top) / rect.height) * CONFIG.height,
  };
}

export function attachInput(canvas, handlers) {
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const pos = canvasPosition(canvas, event.clientX, event.clientY);
    handlers.onPointerDown(pos.x, pos.y);
  });
  canvas.addEventListener('pointermove', (event) => {
    const pos = canvasPosition(canvas, event.clientX, event.clientY);
    handlers.onPointerMove(pos.x, pos.y);
  });
  window.addEventListener('pointerup', (event) => {
    const pos = canvasPosition(canvas, event.clientX, event.clientY);
    handlers.onPointerUp(pos.x, pos.y);
  });
  canvas.addEventListener('pointerleave', () => {
    handlers.onPointerLeave();
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Enter' || event.code === 'Space') event.preventDefault();
    handlers.onKey(event.code);
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}
