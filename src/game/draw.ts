// Small canvas helpers shared by the item drawings (all in bird units).
export type G = CanvasRenderingContext2D;

export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function poly(g: G, pts: number[], close = true) {
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, pts[i], pts[i + 1]);
  if (close) g.closePath();
}

export function circle(g: G, x: number, y: number, r: number, fill?: string) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
}

export function ellipse(g: G, x: number, y: number, rx: number, ry: number, rot = 0, fill?: string) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.0001, rx), Math.max(0.0001, ry), rot, 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
}

export function fill(g: G, c: string) {
  g.fillStyle = c;
  g.fill();
}

export function stroke(g: G, c: string, w: number) {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.stroke();
}

export function star(g: G, cx: number, cy: number, r: number, n = 5, inner = 0.45, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rad = i % 2 ? r * inner : r;
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath();
}

export function heart(g: G, cx: number, cy: number, s: number) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.3, cy + s * 0.1, cx - s * 0.7, cy - s * 0.9, cx, cy - s * 0.3);
  g.bezierCurveTo(cx + s * 0.7, cy - s * 0.9, cx + s * 1.3, cy + s * 0.1, cx, cy + s * 0.9);
  g.closePath();
}

export function clover(g: G, cx: number, cy: number, s: number, color: string) {
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const x = cx + Math.cos(a - Math.PI / 2) * s * 0.55;
    const y = cy + Math.sin(a - Math.PI / 2) * s * 0.55;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    heart(g, 0, 0, s * 0.5);
    g.restore();
    fill(g, color);
  }
  g.strokeStyle = color;
  g.lineWidth = s * 0.15;
  g.beginPath();
  g.moveTo(cx, cy);
  g.quadraticCurveTo(cx + s * 0.2, cy + s * 0.6, cx + s * 0.1, cy + s * 0.9);
  g.stroke();
}

export function snowflake(g: G, cx: number, cy: number, r: number, color: string, w = r * 0.18) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    const bx = cx + Math.cos(a) * r * 0.55;
    const by = cy + Math.sin(a) * r * 0.55;
    for (const d of [-0.6, 0.6]) {
      g.moveTo(bx, by);
      g.lineTo(bx + Math.cos(a + d) * r * 0.3, by + Math.sin(a + d) * r * 0.3);
    }
  }
  g.stroke();
}

/** Hue-cycling colour for animated items. */
export const hue = (t: number, off = 0, s = 100, l = 60, a = 1) => `hsla(${(((t * 90 + off) % 360) + 360) % 360},${s}%,${l}%,${a})`;

/** Seeded pseudo-random in [0,1) from an integer (for fixed sparkle positions). */
export const prand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Twinkling dots scattered over an area (for sparkle patterns). */
export function twinkles(g: G, t: number, n: number, color: string, x0: number, y0: number, w: number, h: number, size = 0.05) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const k = Math.sin(t * 3 + i * 2.1);
    if (k < 0.2) continue;
    g.globalAlpha = Math.min(1, (k - 0.2) * 1.5);
    const x = x0 + prand(i) * w;
    const y = y0 + prand(i + 99) * h;
    star(g, x, y, size * (0.6 + k * 0.6), 4, 0.35);
    g.fill();
  }
  g.globalAlpha = 1;
}
