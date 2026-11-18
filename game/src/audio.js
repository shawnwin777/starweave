// Starweave — every sound is synthesised live with WebAudio, so the game
// ships no audio files and needs no network. A pluck climbs a pentatonic
// ladder as a chain grows; a finished constellation rings a chord.
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5];

export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  // Browsers only let audio start after a gesture; the first pointer or key
  // press calls this, and every later call is a no-op.
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  pluck(step) {
    if (!this.context || this.muted) return;
    const freq = PENTATONIC[Math.min(step, PENTATONIC.length - 1)];
    this.tone(freq, 0.22, 'sine', 0.16);
    this.tone(freq * 2, 0.12, 'triangle', 0.05);
  }

  chord() {
    if (!this.context || this.muted) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      window.setTimeout(() => this.tone(freq, 0.5, 'sine', 0.12), i * 45);
    });
  }

  cometChime() {
    if (!this.context || this.muted) return;
    this.tone(1567.98, 0.35, 'sine', 0.1);
    window.setTimeout(() => this.tone(2093.0, 0.4, 'sine', 0.08), 70);
  }

  lostLight() {
    if (!this.context || this.muted) return;
    this.tone(196.0, 0.3, 'triangle', 0.12);
    this.tone(98.0, 0.4, 'sine', 0.1);
  }

  levelUp() {
    if (!this.context || this.muted) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      window.setTimeout(() => this.tone(freq, 0.3, 'triangle', 0.12), i * 60);
    });
  }

  nova() {
    if (!this.context || this.muted) return;
    this.sweep(220, 1760, 0.5);
  }

  gameOver() {
    if (!this.context || this.muted) return;
    [392.0, 329.63, 261.63, 196.0].forEach((freq, i) => {
      window.setTimeout(() => this.tone(freq, 0.55, 'sine', 0.12), i * 160);
    });
  }

  tone(freq, durationSec, type, volume) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  }

  sweep(fromFreq, toFreq, durationSec) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fromFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(toFreq, ctx.currentTime + durationSec);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  }
}
