// Synthesized sound effects for "The Midnight Vault" — pure WebAudio, no files.
// Every sound is built from oscillators, so the game ships zero audio assets.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmNodes = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAlarm();
    return this.muted;
  }

  // One short oscillator blip.
  tone(freq, dur, type = 'sine', gain = 0.12, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  pickup() { this.tone(880, 0.09, 'sine', 0.14); this.tone(1320, 0.12, 'sine', 0.1, 0.07); }
  dash() { this.tone(300, 0.16, 'sine', 0.1, 0, 620); }
  vaultTick() { this.tone(1500, 0.04, 'square', 0.05); }
  vaultOpen() {
    this.tone(220, 0.25, 'triangle', 0.14, 0, 440);
    this.tone(660, 0.3, 'sine', 0.12, 0.12);
    this.tone(990, 0.35, 'sine', 0.1, 0.22);
  }
  spotted() { this.tone(520, 0.18, 'sawtooth', 0.1, 0, 780); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.13, i * 0.13));
  }
  lose() {
    [330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.08, i * 0.18));
  }
  click() { this.tone(700, 0.05, 'square', 0.06); }

  // Looping two-tone police siren while the alarm is live.
  startAlarm() {
    if (!this.ctx || this.muted || this.alarmNodes) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, this.ctx.currentTime);
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 1.4;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(osc.frequency);
    g.gain.value = 0.045;
    osc.connect(g).connect(this.ctx.destination);
    osc.start();
    lfo.start();
    this.alarmNodes = { osc, lfo, g };
  }

  stopAlarm() {
    if (!this.alarmNodes) return;
    const { osc, lfo } = this.alarmNodes;
    try { osc.stop(); lfo.stop(); } catch { /* already stopped */ }
    this.alarmNodes = null;
  }
}
