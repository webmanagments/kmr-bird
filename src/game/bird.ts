// The KMR Bird character: a round, chubby bird drawn with canvas paths so every accessory can
// stack on it. Everything is drawn in "bird units": the body is a 1-unit circle-ish ellipse
// centred on the origin, facing right. Callers pick the size in pixels.
import {itemById, SLOTS, type Item, type Look, type Slot} from './items';

export interface Palette {
  body: string;
  belly: string;
  wing: string;
  beak: string;
  leg: string;
  eye?: string; // pupil
  cheek?: string;
  /** Extra paint clipped to the body (stripes, spots, sparkle…). */
  pattern?: (g: CanvasRenderingContext2D, t: number) => void;
  /** Glow drawn behind the bird (additive). */
  glow?: string;
  /** Only the clothes and accessories show: the body itself is invisible. */
  invisible?: boolean;
  /** The whole bird breaks up with RGB splits and sliced, jumping strips. */
  glitch?: boolean;
}

export interface Pose {
  flap: number; // 0..1 wing position (0 up, 1 down)
  angle: number; // body rotation, radians
  t: number; // seconds, for animated items
  dead?: boolean;
  blink?: boolean;
}

/** Helpers handed to item drawings, so masks can redraw the eye on top, etc. */
export interface Ctx {
  pal: Palette;
  pose: Pose;
  eye: () => void;
  beak: () => void;
  look: Look;
}

export const BODY_RX = 1;
export const BODY_RY = 0.88;

export function bodyPath(g: CanvasRenderingContext2D) {
  g.beginPath();
  g.ellipse(0, 0, BODY_RX, BODY_RY, 0, 0, Math.PI * 2);
}

/** Draw the bird at (x, y) with `size` = body radius in pixels. */
export function drawBird(g: CanvasRenderingContext2D, look: Look, x: number, y: number, size: number, pose: Pose, plain = false) {
  if (!plain && look.color && itemById(look.color)?.palette?.glitch) return drawGlitched(g, look, x, y, size, pose);
  const items: Partial<Record<Slot, Item>> = {};
  for (const s of SLOTS) {
    const id = look[s];
    if (id) {
      const it = itemById(id);
      if (it && it.slot === s) items[s] = it;
    }
  }
  const pal = items.color?.palette ?? DEFAULT_PALETTE;
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.rotate(pose.angle);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  const inv = !!pal.invisible;
  const c: Ctx = {pal, pose, look, eye: () => !inv && drawEye(g, pal, pose), beak: () => !inv && drawBeak(g, pal)};

  if (inv) {
    // Just a faint shimmer where the body would be, so you can still tell where you are.
    g.save();
    g.globalAlpha = 0.1 + 0.06 * Math.sin(pose.t * 3);
    bodyPath(g);
    g.strokeStyle = '#cfe8ff';
    g.lineWidth = 0.05;
    g.setLineDash([0.12, 0.1]);
    g.lineDashOffset = -pose.t * 0.4;
    g.stroke();
    g.restore();
  }

  if (pal.glow) {
    const r = g.createRadialGradient(0, 0, 0.4, 0, 0, 1.9);
    r.addColorStop(0, pal.glow);
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(-2, -2, 4, 4);
  }

  // Back layer: legs (and anything worn on them), tail.
  if (!inv) drawLegs(g, pal, pose);
  items.pants?.legs?.(g, c);
  items.shoes?.draw(g, c);
  if (!inv) drawTail(g, pal);
  items.wings?.back?.(g, c);

  // Body
  if (!inv) {
    bodyPath(g);
    g.fillStyle = pal.body;
    g.fill();
  }
  g.save();
  bodyPath(g);
  g.clip();
  if (!inv) {
    g.fillStyle = pal.belly;
    g.beginPath();
    g.ellipse(0.24, 0.34, 0.66, 0.5, -0.15, 0, Math.PI * 2);
    g.fill();
    pal.pattern?.(g, pose.t);
    // soft top light and bottom shade make the body round
    const shade = g.createLinearGradient(0, -0.9, 0, 0.9);
    shade.addColorStop(0, 'rgba(255,255,255,0.22)');
    shade.addColorStop(0.45, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = shade;
    g.fillRect(-1.1, -1, 2.2, 2);
  }
  items.pants?.draw(g, c);
  g.restore();
  items.belt?.draw(g, c);

  if (!inv) {
    // Cheek
    g.fillStyle = pal.cheek ?? 'rgba(255,120,150,0.45)';
    g.beginPath();
    g.ellipse(0.6, 0.14, 0.12, 0.08, 0, 0, Math.PI * 2);
    g.fill();
  }

  items.neck?.draw(g, c);

  // Face
  if (!inv) {
    drawEye(g, pal, pose);
    drawBeak(g, pal);
  }
  items.mask?.draw(g, c);
  items.eyes?.draw(g, c);

  // Front wing (flaps)
  g.save();
  g.translate(-0.18, 0.14);
  g.rotate(-0.55 + pose.flap * 1.05);
  g.scale(1.12, 1.12);
  if (items.wings) items.wings.draw(g, c);
  else if (!inv) drawWing(g, pal);
  g.restore();

  items.hat?.draw(g, c);
  g.restore();
}

// ---- Glitch: the bird is drawn off-screen, then split into colour channels and sliced ----------
let glitchCanvas: HTMLCanvasElement | null = null;
let tintCanvas: HTMLCanvasElement | null = null;
const rnd = (i: number) => {
  const x = Math.sin(i * 91.7 + 13.1) * 43758.5453;
  return x - Math.floor(x);
};

function drawGlitched(g: CanvasRenderingContext2D, look: Look, x: number, y: number, size: number, pose: Pose) {
  const m = g.getTransform();
  const k = Math.max(0.5, Math.hypot(m.a, m.b)); // draw at device resolution
  const span = 4.4; // bird units across (room for hats, wings and beak)
  const W = Math.ceil(size * span * k);
  glitchCanvas ??= document.createElement('canvas');
  tintCanvas ??= document.createElement('canvas');
  const off = glitchCanvas;
  if (off.width !== W) {
    off.width = off.height = W;
    tintCanvas.width = tintCanvas.height = W;
  }
  const og = off.getContext('2d')!;
  og.setTransform(1, 0, 0, 1, 0, 0);
  og.clearRect(0, 0, W, W);
  drawBird(og, look, W / 2, W / 2, size * k, pose, true);

  const frame = Math.floor(pose.t * 12);
  const burst = rnd(frame) > 0.5; // about half the time it tears apart hard
  const big = burst && rnd(frame + 7) > 0.55;
  const unit = size; // px per bird unit on the target
  const half = (size * span) / 2;
  const split = (burst ? (big ? 0.34 : 0.2) : 0.09) * unit * (0.7 + rnd(frame + 3) * 0.6);

  const tint = (color: string) => {
    const tg = tintCanvas!.getContext('2d')!;
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, W, W);
    tg.drawImage(off, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = color;
    tg.fillRect(0, 0, W, W);
    return tintCanvas!;
  };

  g.save();
  // Colour channels pulled apart (cyan one way, magenta the other).
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.85;
  g.drawImage(tint('#ff1e9a'), x - half - split, y - half + (burst ? split * 0.3 : 0), size * span, size * span);
  g.drawImage(tint('#16f2ff'), x - half + split, y - half - (burst ? split * 0.3 : 0), size * span, size * span);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  // The bird itself, cut into strips that jump sideways during a burst.
  const strips = burst ? 7 : 1;
  for (let i = 0; i < strips; i++) {
    const sy = (W / strips) * i;
    const sh = W / strips + 1;
    const shift = burst ? (rnd(frame * 13 + i) - 0.5) * unit * (big ? 1.1 : 0.55) : 0;
    g.drawImage(off, 0, sy, W, sh, x - half + shift, y - half + (sy / W) * size * span, size * span, (sh / W) * size * span);
  }
  // Scanlines and stray pixel blocks.
  g.fillStyle = 'rgba(0,0,0,.35)';
  for (let yy = y - unit * 1.1; yy < y + unit * 1.2; yy += Math.max(2, unit * 0.12)) g.fillRect(x - unit * 1.2, yy, unit * 2.6, Math.max(1, unit * 0.04));
  if (burst) {
    const cols = ['#16f2ff', '#ff1e9a', '#39ff88', '#ffffff'];
    for (let i = 0; i < (big ? 9 : 5); i++) {
      g.fillStyle = cols[i % 4];
      const bw = unit * (0.12 + rnd(frame * 5 + i) * 0.5);
      g.fillRect(x + (rnd(frame * 3 + i) - 0.5) * unit * 3, y + (rnd(frame * 7 + i) - 0.5) * unit * 2.4, bw, unit * 0.12);
    }
  }
  g.restore();
}

export const DEFAULT_PALETTE: Palette = {
  body: '#ffd23f',
  belly: '#fff1b0',
  wing: '#ffb21e',
  beak: '#ff7a1a',
  leg: '#ff9a3c',
};

function drawLegs(g: CanvasRenderingContext2D, pal: Palette, pose: Pose) {
  const tuck = pose.flap * 0.06;
  g.strokeStyle = pal.leg;
  g.lineWidth = 0.09;
  for (const [x0, x1] of [
    [-0.16, -0.22],
    [0.2, 0.16],
  ]) {
    g.beginPath();
    g.moveTo(x0, 0.7);
    g.lineTo(x1, 1.16 - tuck);
    g.stroke();
    // three toes
    g.lineWidth = 0.07;
    g.beginPath();
    for (const a of [-0.5, 0, 0.5]) {
      g.moveTo(x1, 1.16 - tuck);
      g.lineTo(x1 + Math.cos(a) * 0.17, 1.16 - tuck + Math.sin(a) * 0.08 + 0.03);
    }
    g.stroke();
    g.lineWidth = 0.09;
  }
}

/** Where the feet are (for shoes). */
export function feet(pose: Pose): [number, number][] {
  const tuck = pose.flap * 0.06;
  return [
    [-0.22, 1.16 - tuck],
    [0.16, 1.16 - tuck],
  ];
}

function drawTail(g: CanvasRenderingContext2D, pal: Palette) {
  g.fillStyle = pal.wing;
  for (const [a, l] of [
    [-0.5, 0.5],
    [-0.2, 0.55],
    [0.12, 0.45],
  ]) {
    g.save();
    g.translate(-0.86, -0.02);
    g.rotate(Math.PI + a);
    g.beginPath();
    g.ellipse(l * 0.5, 0, l * 0.55, 0.13, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

export function drawWing(g: CanvasRenderingContext2D, pal: Palette, color = pal.wing) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0.42, -0.04);
  g.bezierCurveTo(0.3, -0.36, -0.42, -0.34, -0.62, 0.02);
  g.bezierCurveTo(-0.5, 0.1, -0.56, 0.2, -0.42, 0.24);
  g.bezierCurveTo(-0.4, 0.34, -0.2, 0.32, -0.16, 0.3);
  g.bezierCurveTo(0.05, 0.36, 0.38, 0.22, 0.42, -0.04);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(-0.36, 0.08);
  g.lineTo(0.1, 0.05);
  g.moveTo(-0.28, 0.18);
  g.lineTo(0.06, 0.15);
  g.stroke();
}

export function drawEye(g: CanvasRenderingContext2D, pal: Palette, pose: Pose) {
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(0.45, -0.26, 0.3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 0.035;
  g.stroke();
  if (pose.dead) {
    g.strokeStyle = pal.eye ?? '#10141c';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(0.38, -0.33);
    g.lineTo(0.6, -0.13);
    g.moveTo(0.6, -0.33);
    g.lineTo(0.38, -0.13);
    g.stroke();
    return;
  }
  if (pose.blink) {
    g.strokeStyle = pal.eye ?? '#10141c';
    g.lineWidth = 0.06;
    g.beginPath();
    g.moveTo(0.3, -0.24);
    g.quadraticCurveTo(0.47, -0.16, 0.66, -0.24);
    g.stroke();
    return;
  }
  g.fillStyle = pal.eye ?? '#10141c';
  g.beginPath();
  g.arc(0.55, -0.24, 0.135, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(0.6, -0.3, 0.045, 0, Math.PI * 2);
  g.fill();
}

export function drawBeak(g: CanvasRenderingContext2D, pal: Palette) {
  g.fillStyle = pal.beak;
  g.beginPath();
  g.moveTo(0.76, -0.08);
  g.quadraticCurveTo(1.22, -0.08, 1.42, 0.08);
  g.lineTo(0.8, 0.13);
  g.closePath();
  g.fill();
  g.fillStyle = shadeColor(pal.beak, -0.18);
  g.beginPath();
  g.moveTo(0.8, 0.13);
  g.lineTo(1.3, 0.13);
  g.quadraticCurveTo(1.1, 0.3, 0.8, 0.27);
  g.closePath();
  g.fill();
}

/** Lighten (k > 0) or darken (k < 0) a #rrggbb colour. */
export function shadeColor(hex: string, k: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${ch.join(',')})`;
}
