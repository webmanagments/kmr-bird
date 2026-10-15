import {useEffect, useRef} from 'react';
import {drawBird} from '../game/bird';
import {drawParticle, itemById, type Look} from '../game/items';

function fit(c: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return g;
}

/** Paint a bird (and a few trail particles) into a canvas. */
export function paintBird(c: HTMLCanvasElement, look: Look, w: number, h: number, size: number, t: number, flap = 0.4, cx = w / 2 + size * 0.15, cy = h / 2) {
  const g = fit(c, w, h);
  const spec = look.trail ? itemById(look.trail)?.trail : undefined;
  if (spec) {
    for (let i = 0; i < 7; i++) {
      const k = ((t * 0.8 + i / 7) % 1) * 1;
      g.globalAlpha = 1 - k;
      const color = spec.rainbow ? `hsl(${(t * 200 + i * 40) % 360},100%,62%)` : spec.colors[i % spec.colors.length];
      drawParticle(g, spec.shape, cx - size * 1.1 - k * size * 2.2, cy + Math.sin(i * 2.3 + t * 2) * size * 0.35, Math.min(spec.size, size * 0.6), color, i + t);
    }
    g.globalAlpha = 1;
  }
  drawBird(g, look, cx, cy, size, {flap, angle: 0, t});
}

/** A bird that flaps and bobs (for previews). */
export function LiveBird({look, w, h, size, className}: {look: Look; w: number; h: number; size: number; className?: string}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef(look);
  lookRef.current = look;
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000;
      if (ref.current) paintBird(ref.current, lookRef.current, w, h, size, t, 0.5 + Math.sin(t * 9) * 0.5, w / 2 + size * 0.15, h / 2 + Math.sin(t * 2.5) * size * 0.12);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [w, h, size]);
  return <canvas ref={ref} className={className} style={{width: w, height: h}} aria-hidden="true" />;
}

/** A still bird (cheap: drawn once). */
export function StillBird({look, w, h, size, className}: {look: Look; w: number; h: number; size: number; className?: string}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(look);
  useEffect(() => {
    if (ref.current) paintBird(ref.current, look, w, h, size, 0.6, 0.35);
  }, [key, w, h, size]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className={className} style={{width: w, height: h}} aria-hidden="true" />;
}
