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
export function drawBird(g: CanvasRenderingContext2D, look: Look, x: number, y: number, size: number, pose: Pose) {
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

  const c: Ctx = {pal, pose, look, eye: () => drawEye(g, pal, pose), beak: () => drawBeak(g, pal)};

  if (pal.glow) {
    const r = g.createRadialGradient(0, 0, 0.4, 0, 0, 1.9);
    r.addColorStop(0, pal.glow);
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(-2, -2, 4, 4);
  }

  // Back layer: legs (and anything worn on them), tail.
  drawLegs(g, pal, pose);
  items.pants?.legs?.(g, c);
  items.shoes?.draw(g, c);
  drawTail(g, pal);
  items.wings?.back?.(g, c);

  // Body
  bodyPath(g);
  g.fillStyle = pal.body;
  g.fill();
  g.save();
  bodyPath(g);
  g.clip();
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
  items.pants?.draw(g, c);
  g.restore();
  items.belt?.draw(g, c);

  // Cheek
  g.fillStyle = pal.cheek ?? 'rgba(255,120,150,0.45)';
  g.beginPath();
  g.ellipse(0.6, 0.14, 0.12, 0.08, 0, 0, Math.PI * 2);
  g.fill();

  items.neck?.draw(g, c);

  // Face
  drawEye(g, pal, pose);
  drawBeak(g, pal);
  items.mask?.draw(g, c);
  items.eyes?.draw(g, c);

  // Front wing (flaps)
  g.save();
  g.translate(-0.18, 0.14);
  g.rotate(-0.55 + pose.flap * 1.05);
  g.scale(1.12, 1.12);
  if (items.wings) items.wings.draw(g, c);
  else drawWing(g, pal);
  g.restore();

  items.hat?.draw(g, c);
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
