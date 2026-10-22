// KMR Bird: flap through the gaps. 600×600 canvas, dark sky (black is see-through on the glasses).
import {sfx} from './audio';
import {drawBird} from './bird';
import {drawParticle, itemById, type Look, type TrailSpec} from './items';
import type {Theme} from './season';
import {circle, ellipse, heart, clover, poly, prand, rr, snowflake, star} from './draw';

export const W = 600;
export const H = 600;
export const GROUND = 522;
const BIRD_X = 170;
const R = 18; // bird body radius (px)
const HIT_R = 14.5; // a little smaller than the drawing: fair on the glasses
const PIPE_W = 74;
const CAP_W = 88;
const CAP_H = 28;
const SPACING = 236;
const GRAVITY = 1650;
const FLAP_V = -485;
const MAX_FALL = 780;
/** Coins each gap coin is worth. */
export const COIN_VALUE = 10;

export interface Medal {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'kmr';
  name: string;
  at: number;
  color: string;
  bonus: number;
}
export const MEDALS: Medal[] = [
  {id: 'bronze', name: 'Bronze', at: 10, color: '#d8894a', bonus: 30},
  {id: 'silver', name: 'Silver', at: 20, color: '#d0d8e2', bonus: 75},
  {id: 'gold', name: 'Gold', at: 30, color: '#ffc531', bonus: 150},
  {id: 'platinum', name: 'Platinum', at: 40, color: '#bff4ff', bonus: 300},
  {id: 'diamond', name: 'Diamond', at: 75, color: '#7fd8ff', bonus: 750},
  {id: 'kmr', name: 'KMR Legend', at: 150, color: '#ff3b5c', bonus: 2000},
];
export const medalFor = (score: number): Medal | null => [...MEDALS].reverse().find(m => score >= m.at) ?? null;

export interface RunResult {
  score: number;
  coins: number; // coins grabbed in the gaps
  flaps: number;
  time: number;
  medal: Medal | null;
}

export interface GameOpts {
  look: Look;
  theme: Theme;
  best?: number;
  attract?: boolean;
  onEnd?: (r: RunResult) => void;
  onStart?: () => void;
}

interface Pipe {
  x: number;
  gap: number; // gap centre y
  size: number; // gap height
  scored: boolean;
  coin: {y: number; taken: boolean} | null;
}
interface Part {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  shape: TrailSpec['shape'];
  g: number;
}
interface Pop {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

export class BirdGame {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private running = false;
  paused = false;

  state: 'ready' | 'play' | 'dying' | 'over' = 'ready';
  y = 260;
  vy = 0;
  private angle = 0;
  private wing = 0; // wing animation phase
  private wingKick = 0;
  pipes: Pipe[] = [];
  score = 0;
  coins = 0;
  flaps = 0;
  private time = 0;
  private t = 0;
  private scroll = 0;
  private speed = 160;
  private deadT = 0;
  private flash = 0;
  private shake = 0;
  private parts: Part[] = [];
  private pops: Pop[] = [];
  private trailAcc = 0;
  private drift: {x: number; y: number; s: number; r: number; c: string; vx: number}[] = [];
  private city: HTMLCanvasElement | null = null;
  private bestShown = false;
  private blinkAt = 2;
  private lastGap = 280;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: GameOpts,
  ) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d', {alpha: false})!;
    this.reset();
  }

  setLook(look: Look) {
    this.opts.look = look;
  }

  reset() {
    this.state = this.opts.attract ? 'play' : 'ready';
    this.y = 260;
    this.vy = 0;
    this.angle = 0;
    this.pipes = [];
    this.score = this.coins = this.flaps = 0;
    this.time = 0;
    this.deadT = 0;
    this.speed = 160;
    this.parts = [];
    this.pops = [];
    this.bestShown = false;
    this.lastGap = 280;
    const d = this.opts.theme.drift;
    this.drift = d
      ? Array.from({length: d.n}, (_, i) => ({x: prand(i) * W, y: prand(i + 50) * GROUND, s: d.size * (0.6 + prand(i + 9) * 0.8), r: prand(i + 3) * 6, c: d.colors[i % d.colors.length], vx: 0}))
      : [];
    // The first pipe comes in from the right edge.
    for (let i = 0; i < 4; i++) this.addPipe(W + 140 + i * SPACING);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.034, (now - this.last) / 1000);
      this.last = now;
      if (!this.paused) this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** A pinch: start the run, or flap. */
  flap() {
    if (this.paused) return;
    if (this.state === 'ready') {
      this.state = 'play';
      this.opts.onStart?.();
    }
    if (this.state !== 'play') return;
    this.vy = FLAP_V;
    this.wingKick = 1;
    this.flaps++;
    if (!this.opts.attract) sfx.flap();
  }

  // ---- simulation ----------------------------------------------------------------------------
  private addPipe(x: number) {
    const n = this.pipes.length ? this.score + this.pipes.filter(p => !p.scored).length : 0;
    const size = Math.max(152, 176 - n * 0.6);
    const lo = 110 + size / 2;
    const hi = GROUND - 60 - size / 2;
    let gap = lo + Math.random() * (hi - lo);
    gap = Math.max(this.lastGap - 170, Math.min(this.lastGap + 170, gap)); // never an impossible jump
    this.lastGap = gap;
    const coin = !this.opts.attract && Math.random() < 0.5 ? {y: gap + (Math.random() - 0.5) * size * 0.4, taken: false} : null;
    this.pipes.push({x, gap, size, scored: false, coin});
  }

  private update(dt: number) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 3);
    this.wingKick = Math.max(0, this.wingKick - dt * 5);
    const moving = this.state === 'ready' || this.state === 'play';
    if (moving) this.scroll += this.speed * dt;

    // particles and pops
    for (const p of this.parts) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter(p => p.life < p.max);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter(p => p.t < 1);
    const d = this.opts.theme.drift;
    if (d)
      for (const s of this.drift) {
        s.y += d.fall * dt * (0.6 + (s.s / d.size) * 0.4);
        s.x -= (moving ? this.speed * 0.25 : 8) * dt;
        s.r += dt * 1.5;
        if (s.y > GROUND + 10) s.y = -10;
        if (s.y < -20) s.y = GROUND;
        if (s.x < -20) s.x = W + 20;
      }

    if (this.state === 'ready') {
      this.y = 260 + Math.sin(this.t * 3) * 9;
      this.wing = this.t * 9;
      this.angle = 0;
      return;
    }
    if (this.state === 'over') return;

    // bird
    if (this.state === 'play' && this.opts.attract) this.autopilot();
    this.vy = Math.min(MAX_FALL, this.vy + GRAVITY * dt);
    this.y += this.vy * dt;
    if (this.y < -40) {
      this.y = -40;
      this.vy = 0;
    }
    const targetAngle = this.vy < 0 ? -0.42 : Math.min(1.45, -0.42 + (this.vy / MAX_FALL) * 2.1);
    this.angle += (targetAngle - this.angle) * Math.min(1, dt * (this.vy < 0 ? 18 : 6));
    this.wing += dt * (this.state === 'play' ? (this.vy < 0 ? 26 : 12) : 0);

    if (this.state === 'dying') {
      this.deadT += dt;
      if (this.y >= GROUND - R * 0.9) {
        this.y = GROUND - R * 0.9;
        this.vy = 0;
        if (this.deadT > 0.25) {
          this.state = 'over';
          setTimeout(() => this.opts.onEnd?.({score: this.score, coins: this.coins, flaps: this.flaps, time: Math.round(this.time), medal: medalFor(this.score)}), 650);
        }
      }
      return;
    }

    this.time += dt;
    this.speed = Math.min(178, 160 + this.score * 0.4);
    for (const p of this.pipes) p.x -= this.speed * dt;
    if (this.pipes[0] && this.pipes[0].x < -CAP_W) {
      this.pipes.shift();
      this.addPipe(this.pipes[this.pipes.length - 1].x + SPACING);
    }
    this.emitTrail(dt);

    // scoring, coins, collisions
    for (const p of this.pipes) {
      if (!p.scored && p.x + PIPE_W / 2 < BIRD_X) {
        p.scored = true;
        this.score++;
        if (!this.opts.attract) {
          sfx.point();
          const best = this.opts.best ?? 0;
          if (!this.bestShown && best > 0 && this.score > best) {
            this.bestShown = true;
            this.pops.push({x: BIRD_X, y: this.y - 40, text: 'NEW BEST!', color: '#35f2ff', t: 0});
            sfx.best();
          }
          const m = MEDALS.find(m => m.at === this.score);
          if (m) {
            this.pops.push({x: W / 2, y: 150, text: `${m.name.toUpperCase()} MEDAL`, color: m.color, t: -0.1});
            sfx.medal();
          }
        }
      }
      if (p.coin && !p.coin.taken && Math.abs(p.x + PIPE_W / 2 - BIRD_X) < 22 && Math.abs(p.coin.y - this.y) < 28) {
        p.coin.taken = true;
        this.coins++;
        sfx.coin();
        this.pops.push({x: BIRD_X + 10, y: this.y - 30, text: `+${COIN_VALUE}`, color: '#ffc531', t: 0});
        this.burst(BIRD_X + 10, p.coin.y, ['#ffc531', '#fff1b0'], 10, 120);
      }
      if (this.opts.attract) continue;
      if (BIRD_X + HIT_R > p.x && BIRD_X - HIT_R < p.x + PIPE_W) {
        const top = p.gap - p.size / 2;
        const bot = p.gap + p.size / 2;
        if (this.circleHitsRect(p.x, -1000, PIPE_W, top + 1000) || this.circleHitsRect(p.x, bot, PIPE_W, 1000)) return this.die();
      }
      // caps are wider than the pipe
      if (BIRD_X + HIT_R > p.x - (CAP_W - PIPE_W) / 2 && BIRD_X - HIT_R < p.x + PIPE_W + (CAP_W - PIPE_W) / 2) {
        const cx = p.x - (CAP_W - PIPE_W) / 2;
        const top = p.gap - p.size / 2;
        const bot = p.gap + p.size / 2;
        if (this.circleHitsRect(cx, top - CAP_H, CAP_W, CAP_H) || this.circleHitsRect(cx, bot, CAP_W, CAP_H)) return this.die();
      }
    }
    if (this.y + HIT_R >= GROUND) {
      if (this.opts.attract) {
        this.vy = FLAP_V;
        return;
      }
      this.y = GROUND - HIT_R;
      this.die(true);
    }
  }

  private circleHitsRect(rx: number, ry: number, rw: number, rh: number) {
    const cx = Math.max(rx, Math.min(BIRD_X, rx + rw));
    const cy = Math.max(ry, Math.min(this.y, ry + rh));
    return (BIRD_X - cx) ** 2 + (this.y - cy) ** 2 < HIT_R * HIT_R;
  }

  private autopilot() {
    const next = this.pipes.find(p => p.x + PIPE_W + 10 > BIRD_X);
    const target = next ? next.gap + next.size * 0.12 : 300;
    if (this.y > target && this.vy > -60) this.flap();
  }

  private die(ground = false) {
    this.state = 'dying';
    this.deadT = 0;
    this.flash = 1;
    this.shake = 1;
    sfx.hit();
    if (!ground) {
      this.vy = -120;
      setTimeout(() => sfx.fall(), 120);
    }
    const look = this.opts.look;
    const pal = look.color ? itemById(look.color)?.palette : undefined;
    this.burst(BIRD_X, this.y, [pal?.body ?? '#ffd23f', pal?.wing ?? '#ffb21e', '#ffffff'], 18, 220, 'feather');
  }

  private burst(x: number, y: number, colors: string[], n: number, sp: number, shape: TrailSpec['shape'] = 'spark') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = sp * (0.3 + Math.random());
      this.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.5 + Math.random() * 0.6, size: 5 + Math.random() * 5, color: colors[i % colors.length], rot: a, vr: (Math.random() - 0.5) * 8, shape, g: shape === 'feather' ? 220 : 0});
    }
  }

  private emitTrail(dt: number) {
    const id = this.opts.look.trail;
    const spec = id ? itemById(id)?.trail : undefined;
    if (!spec) return;
    this.trailAcc += spec.rate * dt;
    while (this.trailAcc >= 1) {
      this.trailAcc -= 1;
      const color = spec.rainbow ? `hsl(${(this.t * 200) % 360},100%,62%)` : spec.colors[Math.floor(Math.random() * spec.colors.length)];
      this.parts.push({
        x: BIRD_X - R * 0.9 + (Math.random() - 0.5) * 6,
        y: this.y + (Math.random() - 0.5) * R * 0.8,
        vx: -this.speed * 0.9 - Math.random() * 40,
        vy: (Math.random() - 0.5) * 50,
        life: 0,
        max: 0.6 + Math.random() * 0.5,
        size: spec.size * (0.7 + Math.random() * 0.5),
        color,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 4,
        shape: spec.shape,
        g: spec.gravity ?? 0,
      });
    }
  }

  // ---- drawing -------------------------------------------------------------------------------
  private render() {
    const g = this.ctx;
    const th = this.opts.theme;
    g.save();
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    if (this.shake > 0) g.translate((Math.random() - 0.5) * this.shake * 10, (Math.random() - 0.5) * this.shake * 10);
    this.drawSky(g, th);
    for (const p of this.pipes) this.drawPipe(g, p, th);
    this.drawGround(g, th);

    // trail and burst particles
    for (const p of this.parts) {
      g.globalAlpha = Math.max(0, 1 - p.life / p.max);
      drawParticle(g, p.shape, p.x, p.y, p.size, p.color, p.rot);
    }
    g.globalAlpha = 1;

    const flapPhase = this.state === 'over' || this.state === 'dying' ? 0.5 : this.wingKick > 0 ? 1 - this.wingKick : 0.5 + Math.sin(this.wing) * 0.5;
    this.blinkAt -= 1 / 60;
    if (this.blinkAt < -0.12) this.blinkAt = 2 + Math.random() * 3;
    drawBird(g, this.opts.look, BIRD_X, this.y, R, {flap: flapPhase, angle: this.angle, t: this.t, dead: this.state === 'dying' || this.state === 'over', blink: this.blinkAt < 0});

    // pops
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const p of this.pops) {
      if (p.t < 0) continue;
      g.globalAlpha = Math.max(0, 1 - p.t);
      g.fillStyle = p.color;
      g.font = `italic 900 ${p.text.length > 4 ? 24 : 20}px system-ui, Arial`;
      g.fillText(p.text, p.x, p.y - p.t * 36);
    }
    g.globalAlpha = 1;
    if (!this.opts.attract) this.drawHud(g);
    if (this.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`;
      g.fillRect(0, 0, W, H);
    }
    g.restore();
  }

  private drawSky(g: CanvasRenderingContext2D, th: Theme) {
    const sky = g.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(0.7, th.sky[1]);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, GROUND);
    // stars
    for (let i = 0; i < 60; i++) {
      const x = (prand(i) * W * 2 - this.scroll * 0.03) % W;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * (0.6 + prand(i + 7)) + i));
      g.fillStyle = `rgba(255,255,255,${0.25 + tw * 0.45})`;
      const s = prand(i + 20) > 0.85 ? 2 : 1.2;
      g.fillRect((x + W) % W, prand(i + 40) * GROUND * 0.62, s, s);
    }
    // moon
    const mg = g.createRadialGradient(470, 104, 10, 470, 104, 90);
    mg.addColorStop(0, th.moon + '55');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = mg;
    g.fillRect(380, 14, 180, 180);
    circle(g, 470, 104, 30, th.moon);
    circle(g, 460, 96, 6, 'rgba(0,0,0,.08)');
    circle(g, 482, 114, 4, 'rgba(0,0,0,.08)');
    // drifting theme particles (bats, leaves, snow…)
    const d = th.drift;
    if (d) {
      g.globalAlpha = 0.75;
      for (const s of this.drift) drawParticle(g, d.shape, s.x, s.y, s.s, s.c, d.shape === 'bat' ? Math.sin(s.r * 3) * 0.2 : s.r);
      g.globalAlpha = 1;
    }
    // city skyline, scrolling slowly
    if (!this.city) this.city = buildCity(th.city);
    const off = (this.scroll * 0.18) % this.city.width;
    g.drawImage(this.city, -off, GROUND - this.city.height);
    g.drawImage(this.city, -off + this.city.width, GROUND - this.city.height);
  }

  private drawPipe(g: CanvasRenderingContext2D, p: Pipe, th: Theme) {
    const top = p.gap - p.size / 2;
    const bot = p.gap + p.size / 2;
    const body = g.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
    body.addColorStop(0, th.pipe[0]);
    body.addColorStop(0.35, th.pipe[0]);
    body.addColorStop(1, th.pipe[1]);
    const capG = g.createLinearGradient(p.x - 7, 0, p.x + PIPE_W + 7, 0);
    capG.addColorStop(0, th.cap[0]);
    capG.addColorStop(0.35, th.cap[0]);
    capG.addColorStop(1, th.cap[1]);
    const cx = p.x - (CAP_W - PIPE_W) / 2;
    for (const [y0, h] of [
      [-10, top - CAP_H + 10],
      [bot + CAP_H, GROUND - bot - CAP_H],
    ]) {
      g.fillStyle = body;
      g.fillRect(p.x, y0, PIPE_W, h);
      if (th.stripe) {
        g.save();
        g.beginPath();
        g.rect(p.x, y0, PIPE_W, h);
        g.clip();
        g.fillStyle = th.stripe;
        for (let y = y0 - PIPE_W; y < y0 + h; y += 34) {
          g.beginPath();
          g.moveTo(p.x, y);
          g.lineTo(p.x + PIPE_W, y + PIPE_W * 0.6);
          g.lineTo(p.x + PIPE_W, y + PIPE_W * 0.6 + 14);
          g.lineTo(p.x, y + 14);
          g.fill();
        }
        g.restore();
      }
      g.fillStyle = 'rgba(255,255,255,.28)';
      g.fillRect(p.x + 9, y0, 7, h);
    }
    // caps
    for (const y of [top - CAP_H, bot]) {
      rr(g, cx, y, CAP_W, CAP_H, 5);
      g.fillStyle = capG;
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.fillRect(cx + 9, y + 4, 6, CAP_H - 8);
    }
    this.capDecor(g, th, cx, bot, p);
    // coin
    if (p.coin && !p.coin.taken) {
      const x = p.x + PIPE_W / 2;
      const w = Math.abs(Math.cos(this.t * 4)) * 11 + 1.5;
      g.shadowColor = '#ffc531';
      g.shadowBlur = 12;
      ellipse(g, x, p.coin.y, w, 12, 0, '#ffc531');
      g.shadowBlur = 0;
      ellipse(g, x, p.coin.y, w * 0.6, 7.5, 0, '#e8a512');
    }
  }

  private capDecor(g: CanvasRenderingContext2D, th: Theme, cx: number, bot: number, p: Pipe) {
    const k = Math.floor(p.gap) % 3; // vary which caps get decorations
    const mid = cx + CAP_W / 2;
    switch (th.capTop) {
      case 'snow':
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(cx - 2, bot + 6);
        for (let i = 0; i <= 8; i++) g.quadraticCurveTo(cx + i * 11 - 5, bot - 6 - (i % 2) * 4, cx + i * 11, bot + 2);
        g.lineTo(cx + CAP_W + 2, bot + 8);
        g.closePath();
        g.fill();
        break;
      case 'pumpkin':
        if (k === 0) {
          ellipse(g, mid - 14, bot - 14, 16, 14, 0, '#ff8a1a');
          ellipse(g, mid - 14, bot - 14, 8, 14, 0, '#ff9a2a');
          g.fillStyle = '#2f8a2a';
          g.fillRect(mid - 16, bot - 32, 4, 7);
          const lit = 0.7 + Math.sin(this.t * 7 + p.gap) * 0.3;
          g.fillStyle = `rgba(255,230,90,${lit})`;
          poly(g, [mid - 22, bot - 18, mid - 18, bot - 18, mid - 20, bot - 22]);
          g.fill();
          poly(g, [mid - 10, bot - 18, mid - 6, bot - 18, mid - 8, bot - 22]);
          g.fill();
          g.fillRect(mid - 22, bot - 11, 16, 3);
        } else {
          g.strokeStyle = 'rgba(230,230,240,.55)';
          g.lineWidth = 1;
          g.beginPath();
          for (let i = 0; i < 4; i++) {
            g.moveTo(cx + CAP_W, bot + CAP_H);
            g.lineTo(cx + CAP_W - 22 + i * 4, bot + CAP_H + 26 - i * 6);
          }
          g.stroke();
        }
        break;
      case 'leaves':
        for (let i = 0; i < 4; i++) {
          g.save();
          g.translate(cx + 12 + i * 20, bot - 2);
          g.rotate(i * 0.9);
          ellipse(g, 0, 0, 9, 4, 0, ['#e8641a', '#ffb23d', '#c8301a', '#ff9a2a'][i]);
          g.restore();
        }
        break;
      case 'heart':
        if (k !== 2) {
          heart(g, mid, bot - 11, 10);
          g.fillStyle = '#ff2d6a';
          g.fill();
        }
        break;
      case 'clover':
        if (k === 0) clover(g, mid, bot - 14, 14, '#2fbf4a');
        break;
      case 'flower':
        for (let i = 0; i < 3; i++) {
          const x = cx + 18 + i * 26;
          for (let j = 0; j < 5; j++) circle(g, x + Math.cos(j * 1.26) * 5, bot - 6 + Math.sin(j * 1.26) * 5, 4, ['#ff9ad0', '#ffffff', '#ffd23f'][i]);
          circle(g, x, bot - 6, 2.5, '#ffb21e');
        }
        break;
      case 'star':
        if (k !== 1) {
          star(g, mid, bot - 12, 11);
          g.fillStyle = '#ffd23f';
          g.fill();
        }
        break;
    }
  }

  private drawGround(g: CanvasRenderingContext2D, th: Theme) {
    g.fillStyle = th.ground[0];
    g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = th.ground[1];
    g.fillRect(0, GROUND, W, 12);
    const off = this.scroll % 28;
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (let x = -off; x < W; x += 28) {
      g.beginPath();
      g.moveTo(x, GROUND + 12);
      g.lineTo(x + 14, GROUND);
      g.lineTo(x + 22, GROUND);
      g.lineTo(x + 8, GROUND + 12);
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(0, GROUND + 12, W, 3);
    if (th.month === 11) for (let x = -(this.scroll % 90); x < W; x += 90) snowflake(g, x + 30, GROUND + 40, 7, 'rgba(255,255,255,.5)', 1.5);
    if (th.month === 9)
      for (let x = -(this.scroll % 160); x < W; x += 160) {
        g.fillStyle = '#3a3a4a';
        g.beginPath();
        g.moveTo(x + 40, GROUND + 56);
        g.lineTo(x + 40, GROUND + 32);
        g.arc(x + 52, GROUND + 32, 12, Math.PI, 0);
        g.lineTo(x + 64, GROUND + 56);
        g.fill();
        g.fillStyle = '#5a5a6a';
        g.fillRect(x + 50, GROUND + 26, 4, 16);
        g.fillRect(x + 46, GROUND + 31, 12, 4);
      }
  }

  private drawHud(g: CanvasRenderingContext2D) {
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    if (this.state === 'ready') {
      g.font = 'italic 900 40px system-ui, Arial';
      g.lineWidth = 7;
      g.strokeStyle = '#000';
      g.strokeText('GET READY', W / 2, 150);
      g.fillStyle = this.opts.theme.accent;
      g.fillText('GET READY', W / 2, 150);
      const k = 0.55 + 0.45 * Math.sin(this.t * 4);
      g.fillStyle = `rgba(255,255,255,${k})`;
      g.font = '800 18px system-ui, Arial';
      g.fillText('Pinch to flap', W / 2, 360);
      // a little pinch hint
      g.strokeStyle = `rgba(255,255,255,${k})`;
      g.lineWidth = 3;
      const s = Math.abs(Math.sin(this.t * 4)) * 6;
      g.beginPath();
      g.arc(W / 2 - 10 - s, 395, 7, 0, Math.PI * 2);
      g.moveTo(W / 2 + 17 + s, 395);
      g.arc(W / 2 + 10 + s, 395, 7, 0, Math.PI * 2);
      g.stroke();
      return;
    }
    // big score
    g.font = 'italic 900 64px system-ui, Arial';
    g.lineWidth = 9;
    g.strokeStyle = '#000';
    g.strokeText(String(this.score), W / 2, 92);
    g.fillStyle = '#ffffff';
    g.fillText(String(this.score), W / 2, 92);
    if (this.coins) {
      g.font = '900 18px system-ui, Arial';
      g.textAlign = 'left';
      circle(g, 30, 34, 10, '#ffc531');
      g.fillStyle = '#ffc531';
      g.fillText(String(this.coins), 46, 41);
    }
  }
}

/** A strip of city skyline (dark buildings, lit windows), drawn once. */
function buildCity(light: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 150;
  const g = c.getContext('2d')!;
  let x = 0;
  let i = 0;
  while (x < c.width) {
    const w = 40 + prand(i) * 50;
    const h = 40 + prand(i + 100) * 100;
    g.fillStyle = i % 2 ? '#0b1224' : '#0e162c';
    g.fillRect(x, c.height - h, w - 3, h);
    g.fillStyle = light;
    for (let wy = c.height - h + 8; wy < c.height - 6; wy += 12)
      for (let wx = x + 6; wx < x + w - 10; wx += 10) {
        if (prand(wx * 7 + wy) > 0.72) {
          g.globalAlpha = 0.25 + prand(wx + wy * 3) * 0.4;
          g.fillRect(wx, wy, 4, 5);
        }
      }
    g.globalAlpha = 1;
    x += w;
    i++;
  }
  return c;
}
