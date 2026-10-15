// All sound is synthesized with Web Audio: no files to download.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const C = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 5;
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.05);
}

const ready = () => enabled && !!ctx && ctx.state === 'running' && !!master;

function tone(freq: number, dur: number, type: OscillatorType, gain: number, to?: number, at = 0, pan = 0) {
  if (!ready()) return;
  const c = ctx!;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  const p = c.createStereoPanner();
  p.pan.value = pan;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(p).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(dur: number, f0: number, f1: number, gain: number, q = 1, pan = 0, at = 0, attack = 0.01) {
  if (!ready() || !noise) return;
  const c = ctx!;
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const p = c.createStereoPanner();
  p.pan.value = pan;
  s.connect(f).connect(g).connect(p).connect(master!);
  s.start(t, Math.random());
  s.stop(t + dur + 0.02);
}

export const sfx = {
  move: () => tone(1700, 0.03, 'triangle', 0.025),
  select: () => {
    tone(660, 0.06, 'triangle', 0.08);
    tone(990, 0.08, 'triangle', 0.07, undefined, 0.05);
  },
  back: () => tone(520, 0.08, 'triangle', 0.06, 380),
  deny: () => tone(200, 0.18, 'square', 0.04, 150),
  buy: () => [880, 1320, 1760].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, undefined, i * 0.06)),
  flap: () => {
    hiss(0.09, 900, 2600, 0.16, 1.2);
    tone(380, 0.06, 'triangle', 0.035, 620);
  },
  point: () => {
    tone(1318, 0.07, 'square', 0.035);
    tone(1760, 0.16, 'triangle', 0.07, undefined, 0.06);
  },
  coin: () => {
    tone(1568, 0.06, 'square', 0.03);
    tone(2093, 0.14, 'triangle', 0.06, undefined, 0.05);
  },
  hit: () => {
    hiss(0.18, 400, 120, 0.5, 0.8);
    tone(160, 0.2, 'square', 0.07, 60);
  },
  fall: () => tone(700, 0.5, 'sine', 0.06, 160, 0.15),
  swoosh: () => hiss(0.25, 600, 3000, 0.12, 1.5, 0, 0, 0.12),
  medal: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, undefined, i * 0.08)),
  best: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.24, 'triangle', 0.08, undefined, i * 0.08)),
  crack: () => {
    hiss(0.08, 2400, 1200, 0.3, 2);
    tone(900, 0.05, 'square', 0.03, 600, 0.02);
  },
  reveal: (tier: number) => {
    const base = [523, 587, 659, 784, 1047, 1319][Math.min(5, tier)];
    [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, 0.3, 'triangle', 0.08, undefined, i * 0.09));
    if (tier >= 3) hiss(0.9, 3000, 8000, 0.08, 0.6, 0, 0.3, 0.3);
  },
  chest: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.035, undefined, i * 0.07)),
};
