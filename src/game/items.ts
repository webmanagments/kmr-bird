// Every customization in KMR Bird. Items are grouped by slot; each one knows how to draw itself
// on the bird (see bird.ts for the coordinate system: body radius = 1 unit, facing right).
//
// Where items come from (`source`):
//   starter  owned from the start
//   shop     always for sale in the Wardrobe
//   egg      only from Mystery Eggs
//   daily    only when it shows up in the Daily Shop (the same for every player each day)
//   event    only during its month (Halloween in October, Thanksgiving in November…)
//   achieve  earned by playing
import {drawBeak, drawEye, drawWing, feet, shadeColor, type Ctx, type Palette} from './bird';
import {circle, clover, ellipse, fill, heart, hue, poly, prand, rr, snowflake, star, stroke, twinkles, type G} from './draw';

export const SLOTS = ['color', 'hat', 'eyes', 'mask', 'neck', 'belt', 'pants', 'shoes', 'wings', 'trail'] as const;
export type Slot = (typeof SLOTS)[number];
export type Look = Partial<Record<Slot, string>>;
export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Secret';
export type Source = 'starter' | 'shop' | 'egg' | 'daily' | 'event' | 'achieve';

export const SLOT_NAME: Record<Slot, string> = {
  color: 'Colors',
  hat: 'Hats',
  eyes: 'Eyewear',
  mask: 'Face',
  neck: 'Neck',
  belt: 'Belts',
  pants: 'Pants',
  shoes: 'Shoes',
  wings: 'Wings',
  trail: 'Trails',
};

export const RARITIES: Rarity[] = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Secret'];
export const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#a9b6c6',
  Rare: '#3fa9ff',
  Epic: '#c45cff',
  Legendary: '#ffc531',
  Mythic: '#ff3b5c',
  Secret: '#ffffff',
};

export type TrailShape =
  | 'spark'
  | 'heart'
  | 'star'
  | 'bubble'
  | 'flame'
  | 'note'
  | 'coin'
  | 'leaf'
  | 'snow'
  | 'bat'
  | 'candy'
  | 'confetti'
  | 'clover'
  | 'ribbon'
  | 'ghost'
  | 'petal'
  | 'pixel'
  | 'bolt'
  | 'feather'
  | 'pumpkin';

export interface TrailSpec {
  shape: TrailShape;
  colors: string[];
  rate: number; // particles per second while flying
  size: number; // px at game scale
  rainbow?: boolean;
  gravity?: number; // px/s², negative floats up
}

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  price: number;
  source: Source;
  month?: number; // 0 = January … 11 = December, for event items
  event?: string;
  achieve?: string;
  palette?: Palette;
  trail?: TrailSpec;
  draw: (g: G, c: Ctx) => void;
  legs?: (g: G, c: Ctx) => void;
  back?: (g: G, c: Ctx) => void;
}

const PRICE: Record<Rarity, number> = {Common: 90, Rare: 280, Epic: 800, Legendary: 2400, Mythic: 7500, Secret: 20000};
const noop = () => {};

const ITEMS: Item[] = [];
type Opt = Partial<Pick<Item, 'price' | 'source' | 'month' | 'achieve' | 'legs' | 'back' | 'palette' | 'trail'>>;
function add(slot: Slot, id: string, name: string, rarity: Rarity, draw: Item['draw'], o: Opt = {}) {
  const source = o.source ?? 'shop';
  const mult = source === 'daily' ? 1.2 : source === 'event' ? 1.1 : 1;
  ITEMS.push({id, name, slot, rarity, draw, price: o.price ?? Math.round((PRICE[rarity] * mult) / 10) * 10, source, ...o});
}

// =============================================================================================
// Colors (palettes)
// =============================================================================================
function color(id: string, name: string, rarity: Rarity, palette: Palette, o: Opt = {}) {
  add('color', id, name, rarity, noop, {...o, palette});
}
const pal = (body: string, belly: string, wing: string, beak = '#ff8a1f', leg = '#ff9a3c', extra: Partial<Palette> = {}): Palette => ({body, belly, wing, beak, leg, ...extra});

const stripes =
  (c: string, w = 0.16, gap = 0.36, rot = 0.35) =>
  (g: G) => {
    g.save();
    g.rotate(rot);
    g.fillStyle = c;
    for (let x = -1.6; x < 1.6; x += gap) g.fillRect(x, -1.4, w, 2.8);
    g.restore();
  };
const spots = (c: string, n = 9, r = 0.11) => (g: G) => {
  for (let i = 0; i < n; i++) circle(g, -0.85 + prand(i + 3) * 1.4, -0.7 + prand(i + 40) * 1.2, r * (0.7 + prand(i + 7) * 0.6), c);
};

color('sunny', 'Sunny', 'Common', pal('#ffd23f', '#fff1b0', '#ffb21e'), {source: 'starter', price: 0});
color('sky', 'Sky Blue', 'Common', pal('#4fc3ff', '#d6f2ff', '#2b9be0'));
color('cherry', 'Cherry', 'Common', pal('#ff4b5c', '#ffd0d5', '#d62839', '#ffc23d'));
color('mint', 'Mint', 'Common', pal('#4ff0b0', '#d8fff0', '#25c48b'));
color('grape', 'Grape', 'Common', pal('#9b5cff', '#e4d6ff', '#7136e0', '#ffb43d'));
color('bubblegum', 'Bubblegum', 'Common', pal('#ff7ad1', '#ffe0f4', '#e94fb4'));
color('tangerine', 'Tangerine', 'Common', pal('#ff9a2e', '#ffe2bf', '#ef7a12', '#ffd23f'));
color('snow', 'Snowball', 'Common', pal('#f4f7fb', '#ffffff', '#cdd8e6'));
color('charcoal', 'Charcoal', 'Common', pal('#3a4352', '#6c7889', '#262d38', '#ffb43d'));
color('lime', 'Lime', 'Common', pal('#a6f53a', '#ecffc9', '#78cc17'));
color('teal', 'Teal', 'Common', pal('#1fc8c8', '#c7f7f4', '#139c9c'));
color('peach', 'Peach', 'Common', pal('#ffb29a', '#fff0e8', '#ff8f73'));
color('lavender', 'Lavender', 'Common', pal('#c9a8ff', '#f2eaff', '#a77ff0'));
color('cocoa', 'Cocoa', 'Common', pal('#9a6646', '#e3c2a6', '#7a4c31'));
color('robin', 'Robin', 'Rare', pal('#5b6f8a', '#ff8a3d', '#45566d', '#ffcf3d', '#d9a066'));
color('cardinal', 'Cardinal', 'Rare', pal('#e3192f', '#ff6b6b', '#b30f22', '#ffb43d', '#a35a3a', {pattern: g => ellipse(g, 0.62, -0.05, 0.42, 0.3, 0.2, '#14161c')}));
color('bluejay', 'Blue Jay', 'Rare', pal('#2f7cf6', '#eef3ff', '#1b55c4', '#2a2f3a', '#3a3f4a', {pattern: stripes('rgba(255,255,255,.35)', 0.07, 0.3, 1.4)}));
color('flamingo', 'Flamingo', 'Rare', pal('#ff8fc4', '#ffd9ea', '#ff6aa8', '#2a2a2a', '#ff6aa8'));
color('parrot', 'Parrot', 'Rare', pal('#2fd35b', '#ffe14d', '#e8302f', '#3a3a3a', '#8a8a8a'));
color('toucan', 'Toucan', 'Rare', pal('#1b1f27', '#fff6d6', '#0f1218', '#ff9b1a', '#3a87ff'));
color('penguin', 'Penguin', 'Rare', pal('#20242d', '#ffffff', '#151820', '#ffb21e'));
color('owl', 'Owl', 'Rare', pal('#a87444', '#f0d9b8', '#7f5330', '#e8b23a', '#c49a5c', {pattern: spots('rgba(80,45,20,.45)', 12, 0.07)}));
color('duckling', 'Duckling', 'Rare', pal('#ffe86b', '#fff7c2', '#ffd83b', '#ff9a1f'));
color('peacock', 'Peacock', 'Rare', pal('#0aa6a6', '#47e0c0', '#1e55c8', '#e8c33a', '#7a8a9a', {pattern: spots('rgba(30,60,200,.5)', 8, 0.1)}));
color('canary', 'Canary', 'Rare', pal('#fff04d', '#ffffd0', '#f0d020', '#ff9a1f'));
color('neongreen', 'Neon Glow', 'Epic', pal('#39ff88', '#c8ffe0', '#12d867', '#ffffff', '#39ff88', {glow: 'rgba(57,255,136,.4)'}));
color('neonpink', 'Hot Neon', 'Epic', pal('#ff3ad1', '#ffd0f4', '#d91aac', '#ffffff', '#ff3ad1', {glow: 'rgba(255,58,209,.4)'}));
color('tiger', 'Tiger', 'Epic', pal('#ff8a1a', '#fff1e0', '#e06d00', '#3a2a1a', '#e06d00', {pattern: stripes('#1a1410', 0.1, 0.34, -0.25)}));
color('zebra', 'Zebra', 'Epic', pal('#f4f4f4', '#ffffff', '#1a1a1a', '#ff9a1f', '#888', {pattern: stripes('#151515', 0.12, 0.3, 0.15)}));
color('leopard', 'Leopard', 'Epic', pal('#e8b450', '#fff1d0', '#c48f30', '#3a2a1a', '#c48f30', {
  pattern: g => {
    for (let i = 0; i < 12; i++) {
      const x = -0.85 + prand(i + 11) * 1.5;
      const y = -0.75 + prand(i + 61) * 1.3;
      circle(g, x, y, 0.1, '#3a2410');
      circle(g, x, y, 0.05, '#c48f30');
    }
  },
}));
color('camo', 'Camo', 'Epic', pal('#5f7a3a', '#9fb27a', '#46602a', '#e8b23a', '#7a6a4a', {
  pattern: g => {
    const cs = ['#3c4f22', '#8a7a4a', '#2c3818'];
    for (let i = 0; i < 14; i++) ellipse(g, -0.9 + prand(i) * 1.8, -0.8 + prand(i + 30) * 1.6, 0.18 + prand(i + 5) * 0.12, 0.1, prand(i + 9) * 3, cs[i % 3]);
  },
}));
color('checker', 'Checkers', 'Epic', pal('#f4f4f4', '#f4f4f4', '#1a1a1a', '#ff3b5c', '#ff3b5c', {
  pattern: g => {
    g.fillStyle = '#16181d';
    for (let x = -5; x < 5; x++) for (let y = -5; y < 5; y++) if ((x + y) % 2 === 0) g.fillRect(x * 0.25, y * 0.25, 0.25, 0.25);
  },
}));
color('stealth', 'Stealth', 'Epic', pal('#1b1e24', '#2a2f38', '#121418', '#3a3f4a', '#2a2f38', {eye: '#ff2d55', glow: 'rgba(255,45,85,.18)'}));
color('chrome', 'Chrome', 'Epic', pal('#c9d3de', '#f4f8fc', '#9aa8b8', '#e8eef5', '#9aa8b8', {
  pattern: (g, t) => {
    const x = ((t * 0.8) % 3) - 1.5;
    const gr = g.createLinearGradient(x - 0.4, -1, x + 0.4, 1);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(-1.2, -1, 2.4, 2);
  },
}));
const shine = (c = 'rgba(255,255,255,.75)') => (g: G, t: number) => {
  const x = ((t * 1.1) % 3.2) - 1.6;
  const gr = g.createLinearGradient(x - 0.35, -1, x + 0.35, 1);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.5, c);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(-1.2, -1, 2.4, 2);
};
color('gold', 'Solid Gold', 'Legendary', pal('#ffc531', '#ffe58a', '#e8a512', '#fff1b0', '#e8a512', {pattern: shine(), glow: 'rgba(255,197,49,.35)', eye: '#3b2500'}), {source: 'egg'});
color('diamond', 'Diamond', 'Legendary', pal('#bff4ff', '#ffffff', '#8fe0f5', '#e0fbff', '#8fe0f5', {pattern: (g, t) => twinkles(g, t, 14, '#ffffff', -0.9, -0.8, 1.8, 1.6, 0.09), glow: 'rgba(160,240,255,.4)'}), {source: 'daily'});
color('lava', 'Lava', 'Legendary', pal('#2a0d08', '#ff5a1f', '#1a0805', '#ffb23d', '#ff5a1f', {
  pattern: (g, t) => {
    g.strokeStyle = `rgba(255,${120 + Math.sin(t * 3) * 60},30,.9)`;
    g.lineWidth = 0.06;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      g.moveTo(-0.9 + prand(i) * 1.6, -0.8 + prand(i + 5) * 1.5);
      g.lineTo(-0.7 + prand(i + 8) * 1.6, -0.6 + prand(i + 15) * 1.5);
    }
    g.stroke();
  },
  glow: 'rgba(255,90,31,.45)',
}), {source: 'egg'});
color('icecrystal', 'Ice Crystal', 'Legendary', pal('#7fd8ff', '#e6faff', '#4fb8f0', '#e6faff', '#4fb8f0', {pattern: (g, t) => twinkles(g, t, 8, '#ffffff', -0.9, -0.8, 1.8, 1.6, 0.1), glow: 'rgba(127,216,255,.4)'}), {source: 'shop', price: 3000});
color('rainbow', 'Rainbow', 'Legendary', pal('#ff4b5c', '#ffffff', '#ffd23f', '#ffffff', '#ffd23f', {
  pattern: (g, t) => {
    for (let i = 0; i < 7; i++) {
      g.fillStyle = hue(t, i * 51, 95, 60);
      g.fillRect(-1.2, -1 + i * 0.3, 2.4, 0.31);
    }
  },
}), {source: 'daily'});
color('glitch', 'Glitch', 'Legendary', pal('#18ff8f', '#e0fff0', '#0fcc70', '#ffffff', '#ff2d95', {
  pattern: (g, t) => {
    const k = Math.floor(t * 12);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,45,149,.6)' : 'rgba(53,242,255,.6)';
      g.fillRect(-1.2 + prand(k + i) * 0.3, -0.9 + prand(k * 3 + i) * 1.7, 2.4, 0.06 + prand(k + i * 7) * 0.08);
    }
  },
}), {source: 'daily'});
color('galaxy', 'Galaxy', 'Mythic', pal('#2a1260', '#5a2ab8', '#170a3a', '#e0c3ff', '#5a2ab8', {
  pattern: (g, t) => {
    const r = g.createRadialGradient(0.2, 0.1, 0, 0.2, 0.1, 1.2);
    r.addColorStop(0, 'rgba(255,90,200,.45)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(-1.2, -1, 2.4, 2);
    twinkles(g, t, 20, '#ffffff', -1, -0.9, 2, 1.8, 0.06);
  },
  glow: 'rgba(140,80,255,.45)',
}), {source: 'daily'});
color('phoenix', 'Phoenix', 'Mythic', pal('#ff5a1f', '#ffd23f', '#e8301a', '#fff1b0', '#ff9a1f', {
  pattern: (g, t) => {
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(255,${200 - i * 30},40,.35)`;
      ellipse(g, -0.6 + i * 0.3, 0.6 - ((t * 1.5 + i * 0.37) % 1.6), 0.18, 0.3, 0);
      g.fill();
    }
  },
  glow: 'rgba(255,110,30,.5)',
}), {source: 'daily'});
color('void', 'Void', 'Mythic', pal('#05030a', '#140a26', '#000000', '#b07bff', '#2a1a4a', {eye: '#c79bff', glow: 'rgba(160,80,255,.55)', pattern: (g, t) => twinkles(g, t, 6, '#b07bff', -0.9, -0.8, 1.8, 1.6, 0.05)}), {source: 'egg'});
color('hologram', 'Hologram', 'Mythic', pal('#9ffcff', '#ffffff', '#ffb3f0', '#ffffff', '#c0f0ff', {
  pattern: (g, t) => {
    const gr = g.createLinearGradient(-1, -1, 1, 1);
    gr.addColorStop(0, hue(t, 0, 100, 75, 0.7));
    gr.addColorStop(0.5, hue(t, 120, 100, 75, 0.7));
    gr.addColorStop(1, hue(t, 240, 100, 75, 0.7));
    g.fillStyle = gr;
    g.fillRect(-1.2, -1, 2.4, 2);
  },
  glow: 'rgba(200,255,255,.35)',
}), {source: 'daily'});
color('celestial', 'Celestial', 'Secret', pal('#fff6dc', '#ffffff', '#ffe08a', '#ffd23f', '#ffe08a', {
  pattern: (g, t) => {
    twinkles(g, t, 16, '#ffd23f', -1, -0.9, 2, 1.8, 0.07);
    shine('rgba(255,230,150,.8)')(g, t);
  },
  glow: 'rgba(255,230,150,.6)',
}), {source: 'daily'});
color('royale', 'KMR Royale', 'Secret', pal('#d1001f', '#14161c', '#14161c', '#ffc531', '#ffc531', {pattern: (g, t) => (stripes('#ffc531', 0.05, 0.6, 0.6)(g), shine('rgba(255,215,90,.6)')(g, t)), glow: 'rgba(255,40,60,.45)', eye: '#ffc531'}), {source: 'daily'});
// Event colours
color('pumpkin', 'Pumpkin', 'Rare', pal('#ff8a1a', '#ffc27a', '#2f8a2a', '#5a3a1a', '#2f8a2a', {pattern: stripes('rgba(200,90,0,.45)', 0.08, 0.32, 1.57)}), {source: 'event', month: 9});
color('skeleton', 'Skeleton', 'Epic', pal('#121318', '#1e2028', '#0a0b0e', '#e8e8e8', '#e8e8e8', {
  pattern: g => {
    g.strokeStyle = '#eef0f4';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(-0.05, -0.2);
    g.lineTo(-0.05, 0.7);
    for (let i = 0; i < 4; i++) {
      g.moveTo(-0.05, -0.05 + i * 0.18);
      g.quadraticCurveTo(-0.45, -0.1 + i * 0.18, -0.6, 0.05 + i * 0.18);
      g.moveTo(-0.05, -0.05 + i * 0.18);
      g.quadraticCurveTo(0.35, -0.1 + i * 0.18, 0.5, 0.05 + i * 0.18);
    }
    g.stroke();
  },
  eye: '#ff8a1a',
}), {source: 'event', month: 9});
color('ghost', 'Ghost', 'Epic', pal('rgba(235,242,255,.55)', 'rgba(255,255,255,.35)', 'rgba(220,230,255,.5)', '#c8d4ea', 'rgba(220,230,255,.5)', {glow: 'rgba(200,220,255,.35)', eye: '#2a3550'}), {source: 'event', month: 9});
color('candycorn', 'Candy Corn', 'Rare', pal('#ffffff', '#ffffff', '#ff8a1a', '#ff8a1a', '#ff8a1a', {
  pattern: g => {
    g.fillStyle = '#ffd23f';
    g.fillRect(-1.2, -0.25, 2.4, 0.45);
    g.fillStyle = '#ff8a1a';
    g.fillRect(-1.2, 0.2, 2.4, 1);
  },
}), {source: 'event', month: 9});
color('zombie', 'Zombie', 'Rare', pal('#7fbf5a', '#b8d99a', '#5a8f3a', '#8a7a5a', '#5a8f3a', {pattern: spots('rgba(90,40,40,.35)', 6, 0.1), eye: '#c0302a'}), {source: 'event', month: 9});
color('vampire', 'Vampire', 'Legendary', pal('#e8e4f0', '#ffffff', '#1a1020', '#a0102a', '#1a1020', {eye: '#c0102a', glow: 'rgba(200,16,42,.3)'}), {source: 'event', month: 9});
color('turkey', 'Turkey', 'Rare', pal('#7a4a2a', '#b07a50', '#5a3418', '#ffb21e', '#ff6a3a'), {source: 'event', month: 10});
color('maple', 'Maple', 'Rare', pal('#e8641a', '#ffc27a', '#b8320f', '#5a3418', '#5a3418', {pattern: stripes('rgba(180,40,10,.3)', 0.12, 0.4, 0.8)}), {source: 'event', month: 10});
color('cranberry', 'Cranberry', 'Epic', pal('#a8102e', '#ff6a8a', '#7a0a20', '#ffd23f', '#7a0a20', {pattern: spots('rgba(255,140,170,.35)', 10, 0.06)}), {source: 'event', month: 10});
color('candycane', 'Candy Cane', 'Epic', pal('#ffffff', '#ffffff', '#e8102e', '#e8102e', '#e8102e', {pattern: stripes('#e8102e', 0.13, 0.36, 0.7)}), {source: 'event', month: 11});
color('gingerbread', 'Gingerbread', 'Rare', pal('#b5713a', '#d99a5e', '#8f5428', '#ffffff', '#ffffff', {
  pattern: g => {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(-0.6, 0.55);
    for (let i = 0; i < 6; i++) g.quadraticCurveTo(-0.5 + i * 0.22, 0.65, -0.4 + i * 0.22, 0.55);
    g.stroke();
    circle(g, 0.2, 0.25, 0.06, '#e8102e');
    circle(g, 0.2, 0.45, 0.06, '#2fbf4a');
  },
}), {source: 'event', month: 11});
color('snowman', 'Snowman', 'Rare', pal('#f8fbff', '#ffffff', '#d8e4f2', '#ff8a1a', '#5a3a1a', {pattern: g => [0.1, 0.32, 0.54].forEach(y => circle(g, 0.3, y, 0.055, '#1a1a1a'))}), {source: 'event', month: 11});
color('sweater', 'Ugly Sweater', 'Epic', pal('#c8102e', '#2f8a3a', '#9a0a20', '#ffd23f', '#2f8a3a', {
  pattern: g => {
    g.fillStyle = '#ffffff';
    for (let x = -1; x < 1.2; x += 0.22) {
      poly(g, [x, -0.25, x + 0.11, -0.12, x + 0.22, -0.25, x + 0.11, -0.38]);
      g.fill();
    }
    for (let x = -1; x < 1.2; x += 0.3) snowflake(g, x, 0.55, 0.08, '#ffffff', 0.025);
  },
}), {source: 'event', month: 11});
color('reindeer', 'Reindeer', 'Rare', pal('#8a5a34', '#d9b48a', '#6a4220', '#2a1a10', '#2a1a10'), {source: 'event', month: 11});
color('midnight', 'Midnight Sparkle', 'Epic', pal('#101a3a', '#2a3a7a', '#0a1028', '#ffd23f', '#ffd23f', {pattern: (g, t) => twinkles(g, t, 14, '#ffd23f', -1, -0.9, 2, 1.8, 0.07), glow: 'rgba(255,210,63,.25)'}), {source: 'event', month: 0});
color('valentine', 'Sweetheart', 'Epic', pal('#ff6aa8', '#ffe0ee', '#e8407f', '#ffffff', '#e8407f', {
  pattern: g => {
    for (let i = 0; i < 7; i++) {
      heart(g, -0.8 + prand(i + 2) * 1.5, -0.6 + prand(i + 22) * 1.2, 0.09);
      fill(g, 'rgba(255,255,255,.7)');
    }
  },
}), {source: 'event', month: 1});
color('lucky', 'Lucky', 'Epic', pal('#2fbf4a', '#c8f5d0', '#1f8f34', '#ffc531', '#ffc531', {pattern: g => [0, 1, 2, 3].forEach(i => clover(g, -0.6 + i * 0.4, -0.4 + (i % 2) * 0.5, 0.12, 'rgba(255,197,49,.8)'))}), {source: 'event', month: 2});
color('easter', 'Easter Egg', 'Rare', pal('#b8e6ff', '#fff0f8', '#ffc2e0', '#ffd23f', '#ffc2e0', {
  pattern: g => {
    g.strokeStyle = '#ff9ad0';
    g.lineWidth = 0.08;
    g.beginPath();
    for (let x = -1.2; x < 1.2; x += 0.24) {
      g.lineTo(x, -0.1);
      g.lineTo(x + 0.12, 0.05);
    }
    g.stroke();
    g.strokeStyle = '#fff07a';
    g.beginPath();
    for (let x = -1.2; x < 1.2; x += 0.24) {
      g.lineTo(x, 0.35);
      g.lineTo(x + 0.12, 0.5);
    }
    g.stroke();
  },
}), {source: 'event', month: 3});
color('blossom', 'Blossom', 'Rare', pal('#ffc2dc', '#fff4f8', '#ff9ac0', '#ff8a1f', '#c08a6a', {pattern: spots('rgba(255,255,255,.65)', 10, 0.06)}), {source: 'event', month: 4});
color('sunset', 'Sunset', 'Epic', pal('#ff7a3d', '#ffd23f', '#e8407f', '#ffffff', '#e8407f', {
  pattern: g => {
    const gr = g.createLinearGradient(0, -1, 0, 1);
    gr.addColorStop(0, 'rgba(232,64,127,.8)');
    gr.addColorStop(1, 'rgba(255,210,63,0)');
    g.fillStyle = gr;
    g.fillRect(-1.2, -1, 2.4, 2);
  },
}), {source: 'event', month: 5});
color('starsstripes', 'Stars & Stripes', 'Epic', pal('#ffffff', '#ffffff', '#1a3a9a', '#ffd23f', '#1a3a9a', {
  pattern: g => {
    g.fillStyle = '#d1102e';
    for (let y = -1; y < 1; y += 0.28) g.fillRect(-1.2, y, 2.4, 0.14);
    g.fillStyle = '#1a3a9a';
    g.fillRect(-1.2, -1, 1, 0.75);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      star(g, -0.95 + (i % 3) * 0.28, -0.75 + Math.floor(i / 3) * 0.25, 0.06);
      g.fill();
    }
  },
}), {source: 'event', month: 6});
color('beach', 'Beach Day', 'Rare', pal('#3ad0ff', '#ffe3a8', '#1aa0d8', '#ff8a1f', '#ffb21e', {pattern: stripes('rgba(255,255,255,.35)', 0.06, 0.25, 0)}), {source: 'event', month: 7});
color('harvest', 'Harvest Moon', 'Epic', pal('#ffb23d', '#ffe2a8', '#d8841a', '#5a3418', '#5a3418', {glow: 'rgba(255,178,61,.35)'}), {source: 'event', month: 8});
// Earned
color('champion', 'Champion', 'Legendary', pal('#ffc531', '#ffffff', '#3fa9ff', '#ffffff', '#3fa9ff', {pattern: shine(), glow: 'rgba(255,197,49,.3)'}), {source: 'achieve', achieve: 'score100'});
color('veteran', 'Veteran', 'Epic', pal('#4a5a3a', '#8a9a6a', '#33402a', '#ffc531', '#33402a', {pattern: stripes('rgba(255,197,49,.5)', 0.05, 0.5, 0)}), {source: 'achieve', achieve: 'games250'});

// =============================================================================================
// Hats (drawn in the hat frame: origin on top of the head, base along y = 0, ±0.5 wide)
// =============================================================================================
function hat(id: string, name: string, rarity: Rarity, draw: (g: G, c: Ctx) => void, o: Opt = {}) {
  add(
    'hat',
    id,
    name,
    rarity,
    (g, c) => {
      g.save();
      g.translate(0.14, -0.8);
      g.rotate(-0.16);
      draw(g, c);
      g.restore();
    },
    o,
  );
}
const cap = (col: string, brim: string, logo?: string) => (g: G) => {
  g.beginPath();
  g.arc(0, 0.08, 0.48, Math.PI, 0);
  g.closePath();
  fill(g, col);
  ellipse(g, 0.55, 0.06, 0.4, 0.08, 0.05, brim);
  circle(g, 0, -0.4, 0.06, brim);
  if (logo) circle(g, 0.12, -0.17, 0.1, logo);
};
hat('cap_red', 'Red Cap', 'Common', cap('#e8303f', '#b81e2c', '#ffffff'));
hat('cap_blue', 'Blue Cap', 'Common', cap('#2f7cf6', '#1b55c4', '#ffd23f'));
hat('cap_black', 'Black Cap', 'Common', cap('#20242d', '#0f1218', '#ff3b5c'));
hat('cap_back', 'Backwards Cap', 'Common', g => {
  g.beginPath();
  g.arc(0, 0.08, 0.48, Math.PI, 0);
  g.closePath();
  fill(g, '#2fbf6a');
  ellipse(g, -0.55, 0.04, 0.36, 0.08, -0.1, '#1f8f4a');
});
const beanie = (col: string, band: string, pom: string) => (g: G) => {
  g.beginPath();
  g.arc(0, 0.1, 0.5, Math.PI, 0);
  g.closePath();
  fill(g, col);
  rr(g, -0.52, -0.02, 1.04, 0.16, 0.06);
  fill(g, band);
  circle(g, 0, -0.45, 0.14, pom);
};
hat('beanie_red', 'Red Beanie', 'Common', beanie('#e8303f', '#ffffff', '#ffffff'));
hat('beanie_teal', 'Teal Beanie', 'Common', beanie('#1fc8c8', '#139c9c', '#ffd23f'));
hat('beanie_orange', 'Hunter Beanie', 'Common', beanie('#ff8a1a', '#e06d00', '#ff8a1a'), {source: 'event', month: 8, price: 120});
const tophat = (col: string, band: string, extra?: (g: G) => void) => (g: G) => {
  ellipse(g, 0, 0.04, 0.6, 0.1, 0, col);
  rr(g, -0.34, -0.78, 0.68, 0.82, 0.06);
  fill(g, col);
  g.fillStyle = band;
  g.fillRect(-0.34, -0.22, 0.68, 0.14);
  extra?.(g);
};
hat('tophat', 'Top Hat', 'Rare', tophat('#1a1c22', '#c8102e'));
hat('tophat_white', 'White Tux Hat', 'Rare', tophat('#f4f4f4', '#1a1c22'));
hat('tophat_gold', 'Golden Top Hat', 'Legendary', tophat('#ffc531', '#c8102e', g => twinkles(g, performance.now() / 1000, 5, '#fff', -0.3, -0.7, 0.6, 0.6, 0.06)), {source: 'egg'});
const crown = (col: string, gem: string, glow?: string) => (g: G, c: Ctx) => {
  if (glow) {
    g.shadowColor = glow;
    g.shadowBlur = 12;
  }
  poly(g, [-0.42, 0.06, -0.46, -0.42, -0.24, -0.18, 0, -0.52, 0.24, -0.18, 0.46, -0.42, 0.42, 0.06]);
  fill(g, col);
  g.shadowBlur = 0;
  for (const x of [-0.46, 0, 0.46]) circle(g, x, x === 0 ? -0.52 : -0.42, 0.07, gem);
  circle(g, 0, -0.1, 0.08, gem);
  if (c.pose.t) twinkles(g, c.pose.t, 3, '#ffffff', -0.4, -0.5, 0.8, 0.5, 0.06);
};
hat('crown', 'Gold Crown', 'Legendary', crown('#ffc531', '#e8102e'), {source: 'shop', price: 3500});
hat('crown_diamond', 'Diamond Crown', 'Mythic', crown('#dff8ff', '#3fa9ff', 'rgba(160,240,255,.9)'), {source: 'daily'});
hat('crown_flame', 'Flame Crown', 'Mythic', (g, c) => {
  for (let i = 0; i < 5; i++) {
    const x = -0.36 + i * 0.18;
    const h = 0.45 + Math.sin(c.pose.t * 9 + i * 1.7) * 0.12;
    g.beginPath();
    g.moveTo(x - 0.12, 0.05);
    g.quadraticCurveTo(x - 0.1, -h * 0.6, x, -h);
    g.quadraticCurveTo(x + 0.1, -h * 0.6, x + 0.12, 0.05);
    fill(g, i % 2 ? '#ffd23f' : '#ff5a1f');
  }
  rr(g, -0.45, -0.06, 0.9, 0.14, 0.05);
  fill(g, '#2a1a10');
}, {source: 'daily'});
hat('cowboy', 'Cowboy Hat', 'Rare', g => {
  ellipse(g, 0, 0.02, 0.78, 0.13, 0, '#a8723a');
  g.beginPath();
  g.moveTo(-0.38, 0.0);
  g.bezierCurveTo(-0.42, -0.55, -0.1, -0.5, 0, -0.38);
  g.bezierCurveTo(0.1, -0.5, 0.42, -0.55, 0.38, 0.0);
  g.closePath();
  fill(g, '#c08a4a');
  g.fillStyle = '#5a3418';
  g.fillRect(-0.38, -0.14, 0.76, 0.1);
});
hat('cowboy_black', 'Outlaw Hat', 'Epic', g => {
  ellipse(g, 0, 0.02, 0.8, 0.13, 0, '#1a1c22');
  g.beginPath();
  g.moveTo(-0.38, 0.0);
  g.bezierCurveTo(-0.42, -0.55, -0.1, -0.5, 0, -0.38);
  g.bezierCurveTo(0.1, -0.5, 0.42, -0.55, 0.38, 0.0);
  g.closePath();
  fill(g, '#262a33');
  g.fillStyle = '#c0c8d4';
  g.fillRect(-0.38, -0.14, 0.76, 0.08);
});
const party = (a: string, b: string, pom: string) => (g: G) => {
  g.save();
  poly(g, [-0.32, 0.06, 0.32, 0.06, 0.04, -0.85]);
  g.clip();
  g.fillStyle = a;
  g.fillRect(-0.5, -1, 1, 1.2);
  g.fillStyle = b;
  for (let y = -0.9; y < 0.1; y += 0.24) {
    g.beginPath();
    g.moveTo(-0.5, y + 0.12);
    g.lineTo(0.5, y - 0.08);
    g.lineTo(0.5, y + 0.02);
    g.lineTo(-0.5, y + 0.22);
    g.fill();
  }
  g.restore();
  circle(g, 0.04, -0.86, 0.1, pom);
};
hat('party', 'Party Hat', 'Common', party('#3fa9ff', '#ffd23f', '#ff3b5c'));
hat('party_ny', 'New Year Hat', 'Rare', (g, c) => {
  party('#14161c', '#ffc531', '#ffc531')(g);
  twinkles(g, c.pose.t, 4, '#ffffff', -0.3, -0.8, 0.6, 0.8, 0.06);
}, {source: 'event', month: 0});
hat('wizard', 'Wizard Hat', 'Epic', g => {
  ellipse(g, 0, 0.04, 0.62, 0.1, 0, '#3a2a9a');
  g.beginPath();
  g.moveTo(-0.36, 0.04);
  g.quadraticCurveTo(-0.1, -0.6, -0.3, -1.05);
  g.quadraticCurveTo(0.2, -0.6, 0.36, 0.04);
  g.closePath();
  fill(g, '#4a35c8');
  g.fillStyle = '#ffd23f';
  for (const [x, y, r] of [
    [0, -0.3, 0.08],
    [-0.12, -0.6, 0.06],
    [0.15, -0.12, 0.05],
  ]) {
    star(g, x, y, r);
    g.fill();
  }
});
hat('witch', 'Witch Hat', 'Epic', g => {
  ellipse(g, 0, 0.04, 0.72, 0.11, 0, '#14101c');
  g.beginPath();
  g.moveTo(-0.36, 0.04);
  g.quadraticCurveTo(-0.15, -0.6, -0.45, -1.0);
  g.quadraticCurveTo(0.2, -0.65, 0.36, 0.04);
  g.closePath();
  fill(g, '#1e1628');
  g.fillStyle = '#8a2ad8';
  g.fillRect(-0.35, -0.16, 0.7, 0.12);
  rr(g, -0.08, -0.18, 0.16, 0.16, 0.02);
  stroke(g, '#ffd23f', 0.04);
}, {source: 'event', month: 9});
hat('pumpkinhead', 'Pumpkin Head', 'Legendary', (g, c) => {
  for (const [x, w] of [
    [-0.25, 0.3],
    [0.25, 0.3],
    [0, 0.34],
  ])
    ellipse(g, x, -0.3, w, 0.36, 0, x === 0 ? '#ff9a2a' : '#e8781a');
  g.fillStyle = '#2f8a2a';
  g.fillRect(-0.04, -0.78, 0.08, 0.16);
  const lit = 0.6 + Math.sin(c.pose.t * 6) * 0.3;
  g.fillStyle = `rgba(255,${200 + lit * 40},60,${0.7 + lit * 0.3})`;
  poly(g, [-0.24, -0.4, -0.12, -0.4, -0.18, -0.52]);
  g.fill();
  poly(g, [0.12, -0.4, 0.24, -0.4, 0.18, -0.52]);
  g.fill();
  poly(g, [-0.22, -0.2, 0.22, -0.2, 0.15, -0.1, 0.06, -0.16, 0, -0.08, -0.06, -0.16, -0.15, -0.1]);
  g.fill();
}, {source: 'event', month: 9});
hat('santa', 'Santa Hat', 'Rare', g => {
  g.beginPath();
  g.moveTo(-0.42, 0.02);
  g.quadraticCurveTo(-0.2, -0.75, -0.75, -0.55);
  g.quadraticCurveTo(0.2, -0.75, 0.42, 0.02);
  g.closePath();
  fill(g, '#d81e2c');
  rr(g, -0.5, -0.1, 1.0, 0.2, 0.1);
  fill(g, '#ffffff');
  circle(g, -0.78, -0.55, 0.13, '#ffffff');
}, {source: 'event', month: 11});
hat('elf', 'Elf Hat', 'Rare', (g, c) => {
  g.beginPath();
  g.moveTo(-0.4, 0.02);
  g.quadraticCurveTo(0, -0.6, 0.55, -0.95);
  g.quadraticCurveTo(0.2, -0.4, 0.4, 0.02);
  g.closePath();
  fill(g, '#2fbf4a');
  g.fillStyle = '#d81e2c';
  g.fillRect(-0.44, -0.08, 0.88, 0.14);
  circle(g, 0.57 + Math.sin(c.pose.t * 5) * 0.03, -0.96, 0.09, '#ffd23f');
}, {source: 'event', month: 11});
hat('antlers', 'Reindeer Antlers', 'Epic', g => {
  g.strokeStyle = '#8a5a34';
  g.lineWidth = 0.09;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(0.18 * s, 0.05);
    g.quadraticCurveTo(0.25 * s, -0.4, 0.45 * s, -0.7);
    g.moveTo(0.26 * s, -0.32);
    g.lineTo(0.55 * s, -0.42);
    g.moveTo(0.38 * s, -0.56);
    g.lineTo(0.25 * s, -0.8);
    g.stroke();
  }
  rr(g, -0.45, -0.04, 0.9, 0.12, 0.06);
  fill(g, '#d81e2c');
}, {source: 'event', month: 11});
hat('pilgrim', 'Pilgrim Hat', 'Rare', g => {
  ellipse(g, 0, 0.04, 0.62, 0.1, 0, '#1a1c22');
  poly(g, [-0.32, 0.04, -0.26, -0.7, 0.26, -0.7, 0.32, 0.04]);
  fill(g, '#262a33');
  g.fillStyle = '#e8e2d0';
  g.fillRect(-0.3, -0.24, 0.6, 0.12);
  rr(g, -0.1, -0.27, 0.2, 0.18, 0.02);
  stroke(g, '#ffd23f', 0.045);
}, {source: 'event', month: 10});
hat('propeller', 'Propeller Cap', 'Rare', (g, c) => {
  g.beginPath();
  g.arc(0, 0.08, 0.48, Math.PI, 0);
  g.closePath();
  g.save();
  g.clip();
  for (let i = 0; i < 4; i++) {
    g.fillStyle = ['#e8303f', '#ffd23f', '#2f7cf6', '#2fbf4a'][i];
    g.beginPath();
    g.moveTo(0, 0.1);
    g.arc(0, 0.1, 0.6, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4);
    g.fill();
  }
  g.restore();
  g.strokeStyle = '#888';
  g.lineWidth = 0.04;
  g.beginPath();
  g.moveTo(0, -0.4);
  g.lineTo(0, -0.55);
  g.stroke();
  const w = Math.cos(c.pose.t * 25) * 0.42;
  ellipse(g, 0, -0.56, Math.abs(w) + 0.02, 0.05, 0, '#e8303f');
});
hat('chef', 'Chef Hat', 'Rare', g => {
  rr(g, -0.32, -0.3, 0.64, 0.36, 0.04);
  fill(g, '#ffffff');
  for (const [x, y, r] of [
    [-0.25, -0.45, 0.22],
    [0.0, -0.58, 0.26],
    [0.25, -0.45, 0.22],
  ])
    circle(g, x, y, r, '#ffffff');
  stroke(g, 'rgba(0,0,0,.08)', 0.02);
});
hat('viking', 'Viking Helmet', 'Epic', g => {
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(0.38 * s, -0.12);
    g.quadraticCurveTo(0.75 * s, -0.2, 0.7 * s, -0.7);
    g.quadraticCurveTo(0.6 * s, -0.35, 0.3 * s, -0.3);
    g.closePath();
    fill(g, '#f2ead8');
  }
  g.beginPath();
  g.arc(0, 0.08, 0.5, Math.PI, 0);
  g.closePath();
  fill(g, '#9aa4b0');
  g.fillStyle = '#6a7480';
  g.fillRect(-0.52, -0.06, 1.04, 0.12);
  g.fillRect(-0.05, -0.42, 0.1, 0.4);
});
hat('halo', 'Halo', 'Legendary', (g, c) => {
  const y = -0.42 + Math.sin(c.pose.t * 3) * 0.05;
  g.shadowColor = 'rgba(255,230,120,.9)';
  g.shadowBlur = 14;
  ellipse(g, 0, y, 0.42, 0.11, 0);
  stroke(g, '#ffe58a', 0.08);
  g.shadowBlur = 0;
}, {source: 'egg'});
hat('headphones', 'Headphones', 'Rare', g => {
  g.beginPath();
  g.arc(-0.1, 0.35, 0.58, Math.PI * 0.95, Math.PI * 1.9);
  stroke(g, '#20242d', 0.1);
  rr(g, -0.66, 0.22, 0.3, 0.42, 0.12);
  fill(g, '#20242d');
  rr(g, -0.6, 0.28, 0.18, 0.3, 0.08);
  fill(g, '#ff3b5c');
});
hat('bow', 'Big Bow', 'Common', g => {
  for (const s of [-1, 1]) {
    poly(g, [0, -0.1, 0.42 * s, -0.4, 0.46 * s, 0.12]);
    fill(g, '#ff4fa8');
  }
  circle(g, 0, -0.12, 0.1, '#e8307f');
});
hat('flower', 'Daisy', 'Common', g => {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ellipse(g, Math.cos(a) * 0.18, -0.2 + Math.sin(a) * 0.18, 0.13, 0.06, a, '#ffffff');
  }
  circle(g, 0, -0.2, 0.1, '#ffd23f');
});
hat('flowercrown', 'Flower Crown', 'Epic', g => {
  const cs = ['#ff7ad1', '#ffd23f', '#ffffff', '#c9a8ff', '#ff9a5a'];
  for (let i = 0; i < 6; i++) {
    const x = -0.45 + i * 0.18;
    const y = -0.02 - Math.sin((i / 5) * Math.PI) * 0.12;
    for (let k = 0; k < 5; k++) circle(g, x + Math.cos(k * 1.26) * 0.06, y + Math.sin(k * 1.26) * 0.06, 0.05, cs[i % 5]);
    circle(g, x, y, 0.035, '#ffb21e');
  }
}, {source: 'event', month: 3});
hat('bunnyears', 'Bunny Ears', 'Rare', g => {
  for (const [x, a] of [
    [-0.15, -0.15],
    [0.18, 0.18],
  ]) {
    ellipse(g, x, -0.45, 0.13, 0.42, a, '#f4f4f4');
    ellipse(g, x, -0.45, 0.06, 0.3, a, '#ffb3d0');
  }
}, {source: 'event', month: 3});
hat('gradcap', 'Graduation Cap', 'Rare', (g, c) => {
  g.beginPath();
  g.arc(0, 0.08, 0.38, Math.PI, 0);
  g.closePath();
  fill(g, '#1a1c22');
  poly(g, [-0.62, -0.28, 0, -0.42, 0.62, -0.28, 0, -0.14]);
  fill(g, '#262a33');
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(0, -0.28);
  g.lineTo(0.5, -0.24);
  g.lineTo(0.52 + Math.sin(c.pose.t * 3) * 0.03, 0.1);
  g.stroke();
}, {source: 'event', month: 4});
hat('hardhat', 'Hard Hat', 'Common', g => {
  g.beginPath();
  g.arc(0, 0.06, 0.48, Math.PI, 0);
  g.closePath();
  fill(g, '#ffc531');
  ellipse(g, 0.05, 0.05, 0.6, 0.08, 0, '#e8a512');
  g.fillStyle = '#e8a512';
  g.fillRect(-0.06, -0.42, 0.12, 0.44);
});
hat('pirate', 'Pirate Hat', 'Epic', g => {
  g.beginPath();
  g.moveTo(-0.65, -0.05);
  g.quadraticCurveTo(-0.3, -0.75, 0, -0.42);
  g.quadraticCurveTo(0.3, -0.75, 0.65, -0.05);
  g.quadraticCurveTo(0, 0.12, -0.65, -0.05);
  fill(g, '#1a1c22');
  stroke(g, '#ffc531', 0.04);
  circle(g, 0, -0.25, 0.1, '#f4f4f4');
  g.fillStyle = '#1a1c22';
  g.fillRect(-0.05, -0.27, 0.03, 0.03);
  g.fillRect(0.02, -0.27, 0.03, 0.03);
});
hat('fez', 'Fez', 'Rare', (g, c) => {
  poly(g, [-0.3, 0.06, -0.24, -0.5, 0.24, -0.5, 0.3, 0.06]);
  fill(g, '#c8102e');
  g.strokeStyle = '#1a1c22';
  g.lineWidth = 0.03;
  g.beginPath();
  g.moveTo(0, -0.5);
  g.quadraticCurveTo(0.2 + Math.sin(c.pose.t * 4) * 0.04, -0.4, 0.28, -0.2);
  g.stroke();
});
hat('mohawk', 'Mohawk', 'Epic', g => {
  for (let i = 0; i < 6; i++) {
    const x = -0.35 + i * 0.14;
    poly(g, [x - 0.08, 0.08, x + 0.02, -0.55 - Math.sin(i * 0.6) * 0.1, x + 0.1, 0.08]);
    fill(g, ['#ff3ad1', '#ff3b5c', '#ffd23f', '#39ff88', '#3fa9ff', '#c45cff'][i]);
  }
});
hat('afro', 'Afro', 'Rare', g => {
  for (let i = 0; i < 9; i++) circle(g, -0.38 + (i % 3) * 0.38 + (Math.floor(i / 3) % 2) * 0.1, -0.1 - Math.floor(i / 3) * 0.22, 0.28, '#2a1a12');
});
hat('bandana', 'Bandana', 'Common', g => {
  g.beginPath();
  g.arc(0, 0.12, 0.5, Math.PI, 0);
  g.closePath();
  fill(g, '#d81e2c');
  g.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 6; i++) circle(g, -0.3 + prand(i) * 0.6, -0.25 + prand(i + 5) * 0.3, 0.035);
  poly(g, [-0.48, 0.0, -0.78, -0.1, -0.7, 0.18]);
  fill(g, '#b0101e');
});
hat('tiara', 'Tiara', 'Epic', (g, c) => {
  poly(g, [-0.4, 0.05, -0.3, -0.18, -0.15, -0.08, 0, -0.38, 0.15, -0.08, 0.3, -0.18, 0.4, 0.05]);
  fill(g, '#e8eef5');
  circle(g, 0, -0.2, 0.07, '#ff4fa8');
  twinkles(g, c.pose.t, 3, '#ffffff', -0.35, -0.35, 0.7, 0.3, 0.05);
});
hat('fishbowl', 'Space Helmet', 'Legendary', g => {
  circle(g, -0.05, 0.62, 1.12);
  g.fillStyle = 'rgba(160,220,255,.12)';
  g.fill();
  stroke(g, 'rgba(200,235,255,.75)', 0.05);
  g.beginPath();
  g.arc(-0.05, 0.62, 0.95, -2.4, -1.8);
  stroke(g, 'rgba(255,255,255,.75)', 0.08);
}, {source: 'shop', price: 2800});
hat('devil', 'Devil Horns', 'Rare', g => {
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(0.12 * s, 0.05);
    g.quadraticCurveTo(0.3 * s, -0.1, 0.38 * s, -0.42);
    g.quadraticCurveTo(0.44 * s, -0.08, 0.32 * s, 0.08);
    g.closePath();
    fill(g, '#e8102e');
  }
}, {source: 'event', month: 9});
hat('unicorn', 'Unicorn Horn', 'Epic', (g, c) => {
  poly(g, [-0.12, 0.05, 0.12, 0.05, 0.05, -0.72]);
  fill(g, hue(c.pose.t, 0, 90, 75));
  g.strokeStyle = 'rgba(255,255,255,.8)';
  g.lineWidth = 0.03;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    g.moveTo(-0.1 + i * 0.03, -0.02 - i * 0.17);
    g.lineTo(0.1 - i * 0.015, -0.1 - i * 0.17);
  }
  g.stroke();
}, {source: 'egg'});
hat('sprout', 'Sprout', 'Common', g => {
  g.strokeStyle = '#2fbf4a';
  g.lineWidth = 0.05;
  g.beginPath();
  g.moveTo(0, 0.05);
  g.lineTo(0, -0.3);
  g.stroke();
  ellipse(g, -0.14, -0.34, 0.15, 0.07, 0.4, '#39d85a');
  ellipse(g, 0.14, -0.38, 0.15, 0.07, -0.4, '#39d85a');
});
hat('catears', 'Cat Ears', 'Rare', g => {
  for (const s of [-1, 1]) {
    poly(g, [0.1 * s, 0.05, 0.42 * s, -0.42, 0.45 * s, 0.05]);
    fill(g, '#2a2a30');
    poly(g, [0.2 * s, 0.0, 0.38 * s, -0.25, 0.38 * s, 0.0]);
    fill(g, '#ff9ac0');
  }
});
hat('comb', 'Rooster Comb', 'Common', g => {
  for (let i = 0; i < 3; i++) circle(g, -0.15 + i * 0.15, -0.12 - (i === 1 ? 0.06 : 0), 0.13, '#e8102e');
});
hat('leprechaun', 'Leprechaun Hat', 'Epic', g => {
  tophat('#1f8f34', '#1a1c22')(g);
  rr(g, -0.1, -0.24, 0.2, 0.18, 0.02);
  stroke(g, '#ffd23f', 0.045);
  clover(g, 0.22, -0.45, 0.14, '#39d85a');
}, {source: 'event', month: 2});
hat('beret', 'Beret', 'Rare', g => {
  ellipse(g, 0.05, -0.08, 0.55, 0.2, -0.1, '#c8102e');
  circle(g, 0.1, -0.28, 0.04, '#c8102e');
});
hat('strawhat', 'Straw Hat', 'Rare', g => {
  ellipse(g, 0, 0.03, 0.8, 0.12, 0, '#f0d27a');
  g.beginPath();
  g.arc(0, 0.04, 0.38, Math.PI, 0);
  g.closePath();
  fill(g, '#e8c25a');
  g.fillStyle = '#ff5a5a';
  g.fillRect(-0.38, -0.1, 0.76, 0.09);
}, {source: 'event', month: 5});
hat('unclesam', 'Firework Top Hat', 'Epic', (g, c) =>
  tophat('#ffffff', '#1a3a9a', g2 => {
    g2.fillStyle = '#d1102e';
    for (let x = -0.3; x < 0.34; x += 0.16) g2.fillRect(x, -0.76, 0.08, 0.54);
    g2.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      star(g2, -0.2 + i * 0.2, -0.15, 0.05);
      g2.fill();
    }
    twinkles(g2, c.pose.t, 3, '#ffd23f', -0.3, -0.8, 0.6, 0.4, 0.06);
  })(g),
  {source: 'event', month: 6},
);
hat('heartband', 'Heart Boppers', 'Rare', (g, c) => {
  g.beginPath();
  g.arc(0, 0.2, 0.5, Math.PI * 1.1, Math.PI * 1.9);
  stroke(g, '#ff4fa8', 0.06);
  for (const s of [-1, 1]) {
    const b = Math.sin(c.pose.t * 6 + s) * 0.04;
    g.strokeStyle = '#ff4fa8';
    g.lineWidth = 0.03;
    g.beginPath();
    g.moveTo(0.2 * s, -0.2);
    g.lineTo(0.3 * s, -0.55 + b);
    g.stroke();
    heart(g, 0.3 * s, -0.62 + b, 0.11);
    fill(g, '#ff2d6a');
  }
}, {source: 'event', month: 1});
hat('jester', 'Jester Hat', 'Epic', (g, c) => {
  const cs = ['#c8102e', '#1a3a9a', '#ffd23f'];
  for (let i = 0; i < 3; i++) {
    const a = -0.9 + i * 0.9;
    g.beginPath();
    g.moveTo(-0.4 + i * 0.4, 0.05);
    g.quadraticCurveTo(-0.3 + i * 0.3, -0.5, Math.sin(a) * 0.7, -0.6 + Math.abs(a) * 0.2);
    g.lineTo(0.4 - (2 - i) * 0.4 + 0.4, 0.05);
    fill(g, cs[i]);
    circle(g, Math.sin(a) * 0.7, -0.6 + Math.abs(a) * 0.2 + Math.sin(c.pose.t * 6 + i) * 0.02, 0.07, '#ffd23f');
  }
});
hat('mushroom', 'Mushroom Cap', 'Rare', g => {
  g.beginPath();
  g.arc(0, 0.1, 0.6, Math.PI, 0);
  g.closePath();
  fill(g, '#e8303f');
  for (const [x, y, r] of [
    [-0.3, -0.15, 0.1],
    [0.1, -0.35, 0.12],
    [0.35, -0.1, 0.08],
  ])
    circle(g, x, y, r, '#ffffff');
});
hat('eggshell', 'Egg Shell', 'Epic', g => {
  g.beginPath();
  g.moveTo(-0.45, 0.06);
  g.lineTo(-0.38, -0.12);
  g.lineTo(-0.22, 0.0);
  g.lineTo(-0.08, -0.16);
  g.lineTo(0.08, 0.0);
  g.lineTo(0.22, -0.14);
  g.lineTo(0.38, 0.0);
  g.lineTo(0.45, 0.06);
  g.lineTo(0.38, -0.05);
  g.bezierCurveTo(0.4, -0.6, -0.4, -0.6, -0.42, -0.05);
  g.closePath();
  g.beginPath();
  g.moveTo(-0.45, 0.04);
  g.bezierCurveTo(-0.45, -0.75, 0.45, -0.75, 0.45, 0.04);
  g.lineTo(0.3, -0.06);
  g.lineTo(0.15, 0.06);
  g.lineTo(0, -0.08);
  g.lineTo(-0.15, 0.06);
  g.lineTo(-0.3, -0.06);
  g.closePath();
  fill(g, '#fff6e0');
  stroke(g, 'rgba(0,0,0,.12)', 0.025);
}, {source: 'egg'});
hat('traffic', 'Traffic Cone', 'Common', g => {
  poly(g, [-0.3, 0.06, 0.3, 0.06, 0.06, -0.75, -0.06, -0.75]);
  fill(g, '#ff7a1a');
  g.fillStyle = '#ffffff';
  poly(g, [-0.2, -0.22, 0.2, -0.22, 0.15, -0.38, -0.15, -0.38]);
  g.fill();
  rr(g, -0.4, -0.02, 0.8, 0.1, 0.03);
  fill(g, '#e8641a');
});
hat('knight', 'Knight Helm', 'Legendary', g => {
  g.beginPath();
  g.arc(-0.02, 0.45, 0.62, Math.PI * 1.02, Math.PI * 1.98);
  g.closePath();
  fill(g, '#b8c2ce');
  g.fillStyle = '#7a8694';
  g.fillRect(-0.02, -0.18, 0.06, 0.6);
  g.beginPath();
  g.moveTo(-0.1, -0.15);
  g.quadraticCurveTo(-0.4, -0.7, -0.75, -0.55);
  g.quadraticCurveTo(-0.45, -0.45, -0.25, -0.05);
  fill(g, '#c8102e');
}, {source: 'daily'});
hat('kmrcap', 'KMR Snapback', 'Epic', g => {
  cap('#14161c', '#d1001f')(g);
  g.fillStyle = '#d1001f';
  g.font = 'italic 900 0.28px system-ui, Arial';
  g.textAlign = 'center';
  g.fillText('KMR', 0.05, -0.1);
}, {source: 'achieve', achieve: 'score50'});
hat('ufo', 'Tiny UFO', 'Mythic', (g, c) => {
  const y = -0.45 + Math.sin(c.pose.t * 2.5) * 0.06;
  g.fillStyle = 'rgba(120,255,180,.18)';
  poly(g, [-0.18, y + 0.05, 0.18, y + 0.05, 0.35, 0.06, -0.35, 0.06]);
  g.fill();
  ellipse(g, 0, y - 0.08, 0.18, 0.14, 0, 'rgba(150,240,255,.85)');
  ellipse(g, 0, y, 0.45, 0.1, 0, '#9aa4b0');
  for (let i = 0; i < 5; i++) circle(g, -0.32 + i * 0.16, y + 0.02, 0.03, Math.floor(c.pose.t * 6 + i) % 2 ? '#39ff88' : '#ffd23f');
}, {source: 'daily'});

// =============================================================================================
// Eyewear (drawn around the eye at (0.45, -0.26))
// =============================================================================================
function eyes(id: string, name: string, rarity: Rarity, draw: (g: G, c: Ctx) => void, o: Opt = {}) {
  add(
    'eyes',
    id,
    name,
    rarity,
    (g, c) => {
      g.save();
      g.translate(0.45, -0.26);
      draw(g, c);
      g.restore();
    },
    o,
  );
}
const arm = (g: G, col: string, w = 0.05) => {
  g.beginPath();
  g.moveTo(-0.33, -0.02);
  g.lineTo(-0.6, -0.08);
  stroke(g, col, w);
};
eyes('roundglasses', 'Round Glasses', 'Common', g => {
  arm(g, '#2a2f3a');
  circle(g, 0.04, 0, 0.33);
  g.fillStyle = 'rgba(200,230,255,.18)';
  g.fill();
  stroke(g, '#2a2f3a', 0.06);
});
eyes('nerd', 'Nerd Glasses', 'Common', g => {
  arm(g, '#14161c', 0.07);
  rr(g, -0.3, -0.27, 0.68, 0.5, 0.1);
  g.fillStyle = 'rgba(200,230,255,.15)';
  g.fill();
  stroke(g, '#14161c', 0.1);
  g.fillStyle = '#ffffff';
  g.fillRect(0.38, -0.05, 0.12, 0.06);
});
const shades = (lens: string, frame: string) => (g: G) => {
  arm(g, frame);
  g.beginPath();
  g.moveTo(-0.32, -0.2);
  g.lineTo(0.42, -0.2);
  g.quadraticCurveTo(0.42, 0.25, 0.05, 0.22);
  g.quadraticCurveTo(-0.32, 0.2, -0.32, -0.2);
  fill(g, lens);
  stroke(g, frame, 0.05);
  g.strokeStyle = 'rgba(255,255,255,.5)';
  g.lineWidth = 0.04;
  g.beginPath();
  g.moveTo(0.18, -0.12);
  g.lineTo(0.3, -0.02);
  g.stroke();
};
eyes('shades', 'Sunglasses', 'Common', shades('#14161c', '#14161c'));
eyes('aviator', 'Aviators', 'Rare', shades('rgba(255,170,60,.8)', '#c8a050'));
eyes('mirror', 'Mirror Shades', 'Rare', shades('rgba(80,200,255,.85)', '#c0c8d4'));
eyes('shutter', 'Shutter Shades', 'Rare', g => {
  arm(g, '#ff3ad1');
  rr(g, -0.32, -0.24, 0.72, 0.46, 0.08);
  stroke(g, '#ff3ad1', 0.06);
  g.strokeStyle = '#ff3ad1';
  g.lineWidth = 0.045;
  g.beginPath();
  for (let y = -0.14; y < 0.2; y += 0.1) {
    g.moveTo(-0.3, y);
    g.lineTo(0.38, y);
  }
  g.stroke();
});
eyes('pixel', 'Pixel Shades', 'Epic', g => {
  g.fillStyle = '#0a0a0a';
  g.fillRect(-0.7, -0.14, 1.1, 0.1);
  const p = 0.09;
  const rows = [
    [0, 1, 2, 3, 4, 5, 6],
    [0, 1, 3, 4, 5, 6],
    [1, 2, 4, 5],
  ];
  rows.forEach((r, y) => r.forEach(x => g.fillRect(-0.3 + x * p, -0.06 + y * p, p, p)));
  g.fillStyle = '#ffffff';
  g.fillRect(-0.3 + 2 * p, -0.06 + p, p, p);
});
eyes('cateye', 'Cat-Eye Glasses', 'Rare', g => {
  arm(g, '#c8102e');
  g.beginPath();
  g.moveTo(-0.3, -0.12);
  g.quadraticCurveTo(0.0, -0.32, 0.5, -0.3);
  g.quadraticCurveTo(0.4, 0.25, 0.05, 0.22);
  g.quadraticCurveTo(-0.32, 0.2, -0.3, -0.12);
  g.fillStyle = 'rgba(255,200,220,.2)';
  g.fill();
  stroke(g, '#c8102e', 0.07);
});
eyes('heartglasses', 'Heart Glasses', 'Rare', g => {
  arm(g, '#ff2d6a');
  heart(g, 0.05, 0.0, 0.36);
  fill(g, 'rgba(255,45,106,.75)');
  stroke(g, '#ff2d6a', 0.05);
}, {source: 'event', month: 1});
eyes('starglasses', 'Star Glasses', 'Rare', g => {
  arm(g, '#ffd23f');
  star(g, 0.05, 0.02, 0.4, 5, 0.5);
  fill(g, 'rgba(255,210,63,.6)');
  stroke(g, '#ffb21e', 0.05);
});
eyes('3d', '3D Glasses', 'Common', g => {
  arm(g, '#f4f4f4');
  rr(g, -0.3, -0.22, 0.68, 0.44, 0.04);
  fill(g, 'rgba(255,40,60,.6)');
  stroke(g, '#f4f4f4', 0.07);
});
eyes('monocle', 'Monocle', 'Epic', g => {
  circle(g, 0.05, 0, 0.3);
  g.fillStyle = 'rgba(220,240,255,.15)';
  g.fill();
  stroke(g, '#ffc531', 0.05);
  g.beginPath();
  g.moveTo(0.05, 0.3);
  g.quadraticCurveTo(-0.1, 0.8, -0.35, 0.75);
  stroke(g, '#ffc531', 0.025);
});
eyes('eyepatch', 'Eye Patch', 'Rare', g => {
  g.beginPath();
  g.moveTo(-0.85, -0.45);
  g.lineTo(0.4, 0.3);
  stroke(g, '#14161c', 0.05);
  ellipse(g, 0.06, 0.0, 0.3, 0.26, 0.2, '#14161c');
});
eyes('eyepatch_gold', 'Captain Patch', 'Epic', g => {
  g.beginPath();
  g.moveTo(-0.85, -0.45);
  g.lineTo(0.4, 0.3);
  stroke(g, '#5a3418', 0.05);
  ellipse(g, 0.06, 0.0, 0.3, 0.26, 0.2, '#14161c');
  star(g, 0.06, 0, 0.12);
  fill(g, '#ffc531');
});
eyes('goggles', 'Ski Goggles', 'Rare', g => {
  g.beginPath();
  g.moveTo(-0.3, 0);
  g.lineTo(-1.0, 0.05);
  stroke(g, '#2a2f3a', 0.14);
  rr(g, -0.32, -0.26, 0.78, 0.52, 0.22);
  const gr = g.createLinearGradient(-0.3, -0.26, 0.4, 0.26);
  gr.addColorStop(0, '#ffd23f');
  gr.addColorStop(1, '#ff3ad1');
  g.fillStyle = gr;
  g.fill();
  stroke(g, '#14161c', 0.07);
});
eyes('swim', 'Swim Goggles', 'Common', g => {
  g.beginPath();
  g.moveTo(-0.28, 0);
  g.lineTo(-1.0, 0.04);
  stroke(g, '#2f7cf6', 0.06);
  ellipse(g, 0.06, 0, 0.32, 0.25, 0, 'rgba(80,180,255,.45)');
  stroke(g, '#2f7cf6', 0.07);
}, {source: 'event', month: 5});
eyes('visor', 'Laser Visor', 'Epic', (g, c) => {
  g.shadowColor = '#ff2d55';
  g.shadowBlur = 10;
  rr(g, -0.5, -0.12, 1.0, 0.24, 0.12);
  fill(g, `rgba(255,${40 + Math.sin(c.pose.t * 8) * 30},80,.95)`);
  g.shadowBlur = 0;
  rr(g, -0.52, -0.16, 1.04, 0.32, 0.14);
  stroke(g, '#3a3f4a', 0.06);
});
eyes('laser', 'Laser Eyes', 'Mythic', (g, c) => {
  const k = 0.7 + Math.sin(c.pose.t * 14) * 0.3;
  g.shadowColor = '#ff2d55';
  g.shadowBlur = 16;
  circle(g, 0.1, 0.02, 0.17, `rgba(255,60,80,${k})`);
  g.beginPath();
  g.moveTo(0.1, 0.02);
  g.lineTo(3.2, 0.15);
  stroke(g, `rgba(255,60,80,${0.5 * k})`, 0.12);
  g.shadowBlur = 0;
}, {source: 'daily'});
eyes('diamondshades', 'Diamond Shades', 'Mythic', (g, c) => {
  shades('rgba(190,244,255,.85)', '#e0fbff')(g);
  twinkles(g, c.pose.t, 4, '#ffffff', -0.3, -0.2, 0.7, 0.4, 0.07);
}, {source: 'egg'});
eyes('googly', 'Googly Eye', 'Common', (g, c) => {
  circle(g, 0.04, 0, 0.34, '#ffffff');
  stroke(g, '#14161c', 0.03);
  const a = c.pose.t * 4;
  circle(g, 0.04 + Math.cos(a) * 0.14, Math.sin(a) * 0.14 + 0.05, 0.15, '#14161c');
});
eyes('pumpkinglasses', 'Pumpkin Specs', 'Rare', g => {
  arm(g, '#2f8a2a');
  ellipse(g, 0.05, 0.02, 0.36, 0.3, 0, 'rgba(255,138,26,.75)');
  stroke(g, '#e8641a', 0.05);
  g.fillStyle = '#2f8a2a';
  g.fillRect(0.02, -0.38, 0.06, 0.1);
}, {source: 'event', month: 9});
eyes('snowglasses', 'Snowflake Specs', 'Rare', g => {
  arm(g, '#bfe6ff');
  circle(g, 0.05, 0, 0.32, 'rgba(191,230,255,.3)');
  snowflake(g, 0.05, 0, 0.34, '#e6f6ff', 0.05);
}, {source: 'event', month: 11});
eyes('cloverglasses', 'Clover Specs', 'Rare', g => {
  arm(g, '#2fbf4a');
  circle(g, 0.05, 0, 0.32, 'rgba(47,191,74,.35)');
  stroke(g, '#2fbf4a', 0.06);
  clover(g, 0.32, -0.3, 0.12, '#39d85a');
}, {source: 'event', month: 2});
eyes('smart', 'Display Glasses', 'Epic', (g, c) => {
  arm(g, '#14161c', 0.07);
  rr(g, -0.3, -0.24, 0.7, 0.46, 0.14);
  g.fillStyle = 'rgba(30,40,55,.55)';
  g.fill();
  stroke(g, '#14161c', 0.09);
  g.fillStyle = `rgba(57,255,136,${0.6 + Math.sin(c.pose.t * 4) * 0.3})`;
  g.fillRect(0.08, -0.12, 0.2, 0.08);
}, {source: 'achieve', achieve: 'games50'});
eyes('noir', 'Noir Mask Shades', 'Legendary', (g, c) => {
  shades('#0a0a0a', '#ffc531')(g);
  g.fillStyle = hue(c.pose.t, 0, 100, 60, 0.35);
  g.fillRect(-0.3, -0.18, 0.7, 0.36);
}, {source: 'daily'});

// =============================================================================================
// Face (masks, beards, noses; body coordinates)
// =============================================================================================
function mask(id: string, name: string, rarity: Rarity, draw: (g: G, c: Ctx) => void, o: Opt = {}) {
  add('mask', id, name, rarity, draw, o);
}
const band = (col: string) => (g: G, c: Ctx) => {
  g.beginPath();
  g.moveTo(-0.3, -0.5);
  g.quadraticCurveTo(0.4, -0.62, 0.88, -0.38);
  g.lineTo(0.84, -0.08);
  g.quadraticCurveTo(0.4, -0.02, -0.34, -0.2);
  g.closePath();
  fill(g, col);
  c.eye();
};
mask('bandit', 'Bandit Mask', 'Common', band('#14161c'));
mask('hero_red', 'Hero Mask', 'Rare', band('#d81e2c'));
mask('hero_blue', 'Night Hero Mask', 'Rare', band('#1b3aa8'));
mask('hero_purple', 'Mystery Mask', 'Rare', band('#7a2ad8'));
mask('surgical', 'Face Mask', 'Common', g => {
  g.beginPath();
  g.moveTo(0.62, -0.06);
  g.quadraticCurveTo(1.45, -0.08, 1.4, 0.18);
  g.quadraticCurveTo(1.0, 0.42, 0.62, 0.32);
  g.closePath();
  fill(g, '#9fd8f0');
  g.beginPath();
  g.moveTo(0.62, 0.0);
  g.lineTo(0.2, -0.1);
  g.moveTo(0.62, 0.26);
  g.lineTo(0.2, 0.2);
  stroke(g, '#e8f4fa', 0.025);
});
mask('ninja', 'Ninja Wrap', 'Epic', (g, c) => {
  g.save();
  g.beginPath();
  g.ellipse(0, 0, 1, 0.88, 0, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#20242d';
  g.fillRect(-1.1, -1, 2.2, 0.62);
  g.fillRect(-1.1, -0.06, 2.2, 0.5);
  g.restore();
  c.eye();
  c.beak();
  g.beginPath();
  g.moveTo(-0.9, -0.55);
  g.quadraticCurveTo(-1.3, -0.6 + Math.sin(c.pose.t * 6) * 0.08, -1.55, -0.4);
  stroke(g, '#d81e2c', 0.09);
  g.strokeStyle = '#d81e2c';
  g.beginPath();
  g.moveTo(-0.95, -0.5);
  g.lineTo(0.95, -0.42);
  g.stroke();
});
mask('hockey', 'Hockey Mask', 'Epic', g => {
  ellipse(g, 0.55, -0.12, 0.42, 0.5, 0.1, '#f2f0e8');
  g.fillStyle = '#14161c';
  ellipse(g, 0.5, -0.25, 0.12, 0.08, 0.1, '#14161c');
  for (const [x, y] of [
    [0.38, 0.05],
    [0.55, 0.12],
    [0.7, 0.05],
    [0.62, -0.48],
    [0.42, -0.45],
  ])
    circle(g, x, y, 0.03, '#14161c');
  g.strokeStyle = '#d81e2c';
  g.lineWidth = 0.035;
  g.beginPath();
  g.moveTo(0.3, -0.42);
  g.lineTo(0.4, -0.32);
  g.moveTo(0.78, -0.4);
  g.lineTo(0.7, -0.3);
  g.stroke();
}, {source: 'event', month: 9});
mask('skullpaint', 'Skull Paint', 'Rare', (g, c) => {
  ellipse(g, 0.5, -0.12, 0.45, 0.48, 0.1, 'rgba(250,250,250,.92)');
  circle(g, 0.48, -0.26, 0.2, '#14161c');
  c.eye();
  g.strokeStyle = '#14161c';
  g.lineWidth = 0.03;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    g.moveTo(0.38 + i * 0.07, 0.18);
    g.lineTo(0.38 + i * 0.07, 0.3);
  }
  g.stroke();
  c.beak();
}, {source: 'event', month: 9});
mask('mummy', 'Mummy Wraps', 'Epic', (g, c) => {
  g.save();
  g.beginPath();
  g.ellipse(0, 0, 1, 0.88, 0, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = '#ece4cc';
  g.lineWidth = 0.13;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(-1.1, -0.8 + i * 0.27);
    g.lineTo(1.1, -0.6 + i * 0.27 + (i % 2 ? 0.1 : -0.05));
    g.stroke();
  }
  g.restore();
  c.eye();
  c.beak();
}, {source: 'event', month: 9});
mask('clownnose', 'Clown Nose', 'Common', g => {
  circle(g, 1.38, 0.06, 0.13, '#e8102e');
  circle(g, 1.34, 0.02, 0.04, 'rgba(255,255,255,.7)');
});
mask('mustache', 'Fancy Mustache', 'Rare', g => {
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(1.0, 0.16);
    g.quadraticCurveTo(1.0 + 0.25 * s, 0.32, 1.0 + 0.36 * s, 0.14);
    g.quadraticCurveTo(1.0 + 0.3 * s, 0.24, 1.0, 0.2);
    fill(g, '#3a2a1a');
  }
});
mask('beard', 'Santa Beard', 'Epic', g => {
  g.beginPath();
  g.moveTo(0.35, 0.1);
  g.quadraticCurveTo(0.6, 0.95, 1.05, 0.55);
  g.quadraticCurveTo(1.2, 0.3, 1.1, 0.16);
  g.closePath();
  fill(g, '#ffffff');
  for (let i = 0; i < 6; i++) circle(g, 0.45 + i * 0.11, 0.42 + Math.sin(i) * 0.12, 0.1, '#ffffff');
}, {source: 'event', month: 11});
mask('gum', 'Bubble Gum', 'Rare', (g, c) => {
  const r = 0.1 + ((c.pose.t * 0.4) % 1) * 0.35;
  circle(g, 1.35 + r * 0.6, 0.12, r, 'rgba(255,122,209,.75)');
  circle(g, 1.3 + r * 0.4, 0.04, r * 0.25, 'rgba(255,255,255,.5)');
});
mask('masquerade', 'Masquerade', 'Legendary', (g, c) => {
  g.beginPath();
  g.moveTo(0.05, -0.32);
  g.quadraticCurveTo(0.45, -0.7, 0.92, -0.38);
  g.quadraticCurveTo(0.9, -0.05, 0.5, 0.02);
  g.quadraticCurveTo(0.15, -0.05, 0.05, -0.32);
  fill(g, '#ffc531');
  stroke(g, '#b8860b', 0.03);
  c.eye();
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(0.1, -0.35);
    g.quadraticCurveTo(-0.2 - i * 0.1, -0.9, -0.1 + i * 0.15, -1.1 + i * 0.05);
    stroke(g, ['#c45cff', '#ff3ad1', '#3fa9ff'][i], 0.06);
  }
  twinkles(g, c.pose.t, 3, '#ffffff', 0.1, -0.6, 0.8, 0.5, 0.06);
}, {source: 'shop', price: 3000});
mask('fangs', 'Vampire Fangs', 'Rare', g => {
  for (const x of [0.92, 1.12]) {
    poly(g, [x, 0.25, x + 0.07, 0.25, x + 0.035, 0.4]);
    fill(g, '#ffffff');
  }
}, {source: 'event', month: 9});
mask('wattle', 'Turkey Wattle', 'Rare', g => {
  g.beginPath();
  g.moveTo(0.95, 0.22);
  g.quadraticCurveTo(1.05, 0.65, 0.88, 0.6);
  g.quadraticCurveTo(0.8, 0.4, 0.95, 0.22);
  fill(g, '#e8102e');
}, {source: 'event', month: 10});
mask('rednose', 'Glowing Red Nose', 'Epic', (g, c) => {
  g.shadowColor = '#ff2d2d';
  g.shadowBlur = 14 + Math.sin(c.pose.t * 5) * 6;
  circle(g, 1.4, 0.06, 0.15, '#ff2d2d');
  g.shadowBlur = 0;
  circle(g, 1.36, 0.01, 0.05, 'rgba(255,255,255,.7)');
}, {source: 'event', month: 11});
mask('disguise', 'Disguise Kit', 'Epic', g => {
  ellipse(g, 1.0, 0.0, 0.18, 0.13, 0, '#ffb29a');
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(1.0, 0.16);
    g.quadraticCurveTo(1.0 + 0.25 * s, 0.32, 1.0 + 0.32 * s, 0.14);
    g.quadraticCurveTo(1.0 + 0.3 * s, 0.24, 1.0, 0.2);
    fill(g, '#14161c');
  }
}, {source: 'egg'});
mask('warpaint', 'War Paint', 'Rare', g => {
  g.fillStyle = '#ff3b5c';
  g.fillRect(0.55, 0.0, 0.25, 0.05);
  g.fillRect(0.55, 0.09, 0.25, 0.05);
});
mask('cyber', 'Cyber Mask', 'Legendary', (g, c) => {
  g.beginPath();
  g.moveTo(0.55, -0.02);
  g.lineTo(1.4, 0.02);
  g.lineTo(1.35, 0.3);
  g.lineTo(0.55, 0.35);
  g.closePath();
  fill(g, '#262a33');
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(53,242,255,${0.4 + 0.5 * Math.max(0, Math.sin(c.pose.t * 6 - i))})`;
    g.fillRect(0.7 + i * 0.16, 0.12, 0.1, 0.05);
  }
}, {source: 'daily'});

// =============================================================================================
// Neck (along the curve under the beak)
// =============================================================================================
function neckPt(s: number): [number, number] {
  const [x0, y0, x1, y1, x2, y2] = [0.22, 0.02, 0.4, 0.66, 0.9, 0.3];
  const u = 1 - s;
  return [u * u * x0 + 2 * u * s * x1 + s * s * x2, u * u * y0 + 2 * u * s * y1 + s * s * y2];
}
function neckLine(g: G, col: string, w: number) {
  g.beginPath();
  g.moveTo(0.22, 0.02);
  g.quadraticCurveTo(0.4, 0.66, 0.9, 0.3);
  stroke(g, col, w);
}
function neck(id: string, name: string, rarity: Rarity, draw: (g: G, c: Ctx) => void, o: Opt = {}) {
  add('neck', id, name, rarity, draw, o);
}
const chain = (col: string, bead: number, pendant?: (g: G, x: number, y: number, c: Ctx) => void, sparkle = false) => (g: G, c: Ctx) => {
  for (let s = 0.02; s <= 1; s += bead * 1.15) {
    const [x, y] = neckPt(s);
    circle(g, x, y, bead * 0.75, col);
    stroke(g, 'rgba(0,0,0,.35)', 0.018);
  }
  if (pendant) {
    const [x, y] = neckPt(0.55);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y + 0.12);
    stroke(g, col, 0.03);
    pendant(g, x, y + 0.2, c);
  }
  if (sparkle) twinkles(g, c.pose.t, 4, '#ffffff', 0.05, 0.2, 0.8, 0.4, 0.06);
};
neck('chain_gold', 'Gold Chain', 'Rare', chain('#ffc531', 0.075));
neck('chain_silver', 'Silver Chain', 'Common', chain('#d0d8e2', 0.065));
neck('chain_cuban', 'Cuban Link', 'Epic', chain('#ffc531', 0.11, undefined, true));
neck('chain_diamond', 'Iced Out Chain', 'Legendary', chain('#e0fbff', 0.09, undefined, true), {source: 'egg'});
neck('chain_kmr', 'KMR Medallion', 'Legendary', chain('#ffc531', 0.06, (g, x, y) => {
  circle(g, x, y, 0.16, '#ffc531');
  circle(g, x, y, 0.12, '#d1001f');
  g.fillStyle = '#ffc531';
  g.font = '900 0.16px system-ui, Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('K', x, y + 0.01);
}), {source: 'daily'});
neck('chain_dollar', 'Coin Pendant', 'Epic', chain('#ffc531', 0.055, (g, x, y) => {
  circle(g, x, y, 0.14, '#ffc531');
  circle(g, x, y, 0.09, '#e8a512');
}));
neck('pearls', 'Pearl Necklace', 'Rare', chain('#fff6ee', 0.07));
const bowtie = (col: string, dot?: string) => (g: G) => {
  const [x, y] = neckPt(0.7);
  poly(g, [x, y, x - 0.2, y - 0.13, x - 0.2, y + 0.13]);
  fill(g, col);
  poly(g, [x, y, x + 0.2, y - 0.13, x + 0.2, y + 0.13]);
  fill(g, col);
  circle(g, x, y, 0.06, dot ?? shadeColor(col, -0.25));
};
neck('bowtie_red', 'Red Bow Tie', 'Common', bowtie('#d81e2c'));
neck('bowtie_black', 'Black Bow Tie', 'Common', bowtie('#14161c'));
neck('bowtie_gold', 'Gold Bow Tie', 'Epic', bowtie('#ffc531'));
neck('bowtie_polka', 'Polka Bow Tie', 'Rare', (g, c) => {
  bowtie('#2f7cf6', '#ffffff')(g);
  void c;
});
const tie = (col: string, stripe?: string) => (g: G) => {
  const [x, y] = neckPt(0.66);
  poly(g, [x - 0.07, y - 0.02, x + 0.07, y - 0.02, x + 0.05, y + 0.08, x - 0.05, y + 0.08]);
  fill(g, col);
  poly(g, [x - 0.06, y + 0.08, x + 0.06, y + 0.08, x + 0.1, y + 0.5, x, y + 0.6, x - 0.1, y + 0.5]);
  fill(g, col);
  if (stripe) {
    g.save();
    g.clip();
    g.strokeStyle = stripe;
    g.lineWidth = 0.04;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      g.moveTo(x - 0.15, y + 0.1 + k * 0.1);
      g.lineTo(x + 0.15, y + 0.2 + k * 0.1);
    }
    g.stroke();
    g.restore();
  }
};
neck('tie_red', 'Red Tie', 'Common', tie('#d81e2c'));
neck('tie_blue', 'Office Tie', 'Common', tie('#1b55c4', '#ffd23f'));
neck('tie_rainbow', 'Rainbow Tie', 'Epic', (g, c) => tie(hue(c.pose.t, 0, 90, 60))(g));
const scarf = (a: string, b: string) => (g: G, c: Ctx) => {
  neckLine(g, a, 0.2);
  g.save();
  g.setLineDash([0.08, 0.08]);
  neckLine(g, b, 0.2);
  g.restore();
  const sw = Math.sin(c.pose.t * 5) * 0.06;
  const [x, y] = neckPt(0.25);
  rr(g, x - 0.1, y, 0.18, 0.5 + sw, 0.05);
  fill(g, a);
  g.fillStyle = b;
  g.fillRect(x - 0.1, y + 0.15, 0.18, 0.08);
  g.fillRect(x - 0.1, y + 0.32, 0.18, 0.08);
};
neck('scarf_red', 'Cozy Scarf', 'Common', scarf('#d81e2c', '#ffffff'));
neck('scarf_green', 'Holiday Scarf', 'Rare', scarf('#2f8a3a', '#d81e2c'), {source: 'event', month: 11});
neck('scarf_autumn', 'Autumn Scarf', 'Rare', scarf('#e8641a', '#ffc27a'), {source: 'event', month: 10});
neck('scarf_rainbow', 'Pride Scarf', 'Epic', (g, c) => {
  for (let i = 0; i < 5; i++) {
    g.save();
    g.translate(0, (i - 2) * 0.035);
    neckLine(g, hue(0, i * 60, 95, 58), 0.05);
    g.restore();
  }
  void c;
});
neck('bandana_neck', 'Neck Bandana', 'Common', g => {
  neckLine(g, '#2f7cf6', 0.12);
  const [x, y] = neckPt(0.6);
  poly(g, [x - 0.2, y - 0.04, x + 0.2, y - 0.04, x, y + 0.3]);
  fill(g, '#2f7cf6');
});
neck('spiked', 'Spiked Collar', 'Rare', g => {
  neckLine(g, '#14161c', 0.12);
  for (let s = 0.1; s <= 0.95; s += 0.13) {
    const [x, y] = neckPt(s);
    circle(g, x, y, 0.04, '#d0d8e2');
  }
});
neck('bell', 'Bell Collar', 'Common', (g, c) => {
  neckLine(g, '#d81e2c', 0.09);
  const [x, y] = neckPt(0.62);
  circle(g, x, y + 0.08 + Math.sin(c.pose.t * 8) * 0.01, 0.09, '#ffd23f');
  g.fillStyle = '#3a2a1a';
  g.fillRect(x - 0.06, y + 0.1, 0.12, 0.015);
});
neck('lei', 'Flower Lei', 'Rare', g => {
  const cs = ['#ff5a8a', '#ffd23f', '#ffffff', '#ff8a3d'];
  let i = 0;
  for (let s = 0.02; s <= 1; s += 0.09) {
    const [x, y] = neckPt(s);
    circle(g, x, y, 0.08, cs[i++ % 4]);
    circle(g, x, y, 0.03, '#ffb21e');
  }
}, {source: 'event', month: 6});
neck('medal', 'Gold Medal', 'Epic', g => {
  const [x0, y0] = neckPt(0.35);
  const [x1, y1] = neckPt(0.8);
  poly(g, [x0, y0, x0 + 0.08, y0, x1 - 0.1, y1 + 0.3, x1 - 0.2, y1 + 0.3]);
  fill(g, '#1b55c4');
  circle(g, x1 - 0.14, y1 + 0.42, 0.14, '#ffc531');
  star(g, x1 - 0.14, y1 + 0.42, 0.08);
  fill(g, '#e8a512');
}, {source: 'achieve', achieve: 'platinum'});
neck('cape', 'Vampire Cape', 'Legendary', (g, c) => {
  g.beginPath();
  g.moveTo(-0.1, -0.15);
  g.quadraticCurveTo(-0.6, -0.85, -0.2, -0.75);
  g.lineTo(0.0, 0.05);
  fill(g, '#8a0a1e');
  g.beginPath();
  g.moveTo(-0.05, 0.1);
  g.quadraticCurveTo(-1.6, 0.4 + Math.sin(c.pose.t * 4) * 0.1, -1.3, 1.0);
  g.quadraticCurveTo(-0.8, 0.7, 0.4, 0.62);
  fill(g, '#14101c');
  neckLine(g, '#c0102a', 0.06);
}, {source: 'event', month: 9});
neck('lights', 'Holiday Lights', 'Epic', (g, c) => {
  neckLine(g, '#1f5a2a', 0.03);
  const cs = ['#ff3b5c', '#ffd23f', '#39ff88', '#3fa9ff'];
  let i = 0;
  for (let s = 0.08; s <= 0.95; s += 0.14) {
    const [x, y] = neckPt(s);
    const on = (Math.floor(c.pose.t * 3) + i) % 2 === 0;
    g.shadowColor = cs[i % 4];
    g.shadowBlur = on ? 10 : 0;
    ellipse(g, x, y + 0.06, 0.05, 0.08, 0, on ? cs[i % 4] : shadeColor('#888888', -0.3));
    i++;
  }
  g.shadowBlur = 0;
}, {source: 'event', month: 11});
neck('locket', 'Heart Locket', 'Rare', chain('#ffc531', 0.04, (g, x, y) => {
  heart(g, x, y, 0.13);
  fill(g, '#ff2d6a');
}), {source: 'event', month: 1});
neck('shamrock', 'Shamrock Chain', 'Rare', chain('#ffc531', 0.045, (g, x, y) => clover(g, x, y - 0.05, 0.14, '#2fbf4a')), {source: 'event', month: 2});
neck('pumpkinchain', 'Jack Chain', 'Rare', chain('#2a2a30', 0.045, (g, x, y) => {
  ellipse(g, x, y, 0.15, 0.12, 0, '#ff8a1a');
  g.fillStyle = '#14161c';
  poly(g, [x - 0.08, y - 0.03, x - 0.02, y - 0.03, x - 0.05, y - 0.08]);
  g.fill();
  poly(g, [x + 0.02, y - 0.03, x + 0.08, y - 0.03, x + 0.05, y - 0.08]);
  g.fill();
}), {source: 'event', month: 9});
neck('choker', 'Diamond Choker', 'Mythic', (g, c) => {
  neckLine(g, '#14161c', 0.08);
  for (let s = 0.1; s <= 0.95; s += 0.1) {
    const [x, y] = neckPt(s);
    star(g, x, y, 0.06, 4, 0.5);
    fill(g, '#e0fbff');
  }
  twinkles(g, c.pose.t, 5, '#ffffff', 0.05, 0.2, 0.8, 0.4, 0.07);
}, {source: 'daily'});
neck('dogtags', 'Dog Tags', 'Rare', chain('#a8b2be', 0.03, (g, x, y) => {
  rr(g, x - 0.08, y - 0.06, 0.16, 0.22, 0.04);
  fill(g, '#c0c8d4');
}), {source: 'achieve', achieve: 'games10'});

// =============================================================================================
// Belts (around the lower body)
// =============================================================================================
function beltBand(g: G) {
  g.beginPath();
  g.moveTo(-1.1, 0.46);
  g.quadraticCurveTo(0, 0.62, 1.1, 0.42);
  g.lineTo(1.1, 0.56);
  g.quadraticCurveTo(0, 0.78, -1.1, 0.62);
  g.closePath();
}
function belt(id: string, name: string, rarity: Rarity, col: string, buckle: (g: G, c: Ctx) => void, o: Opt = {}, extra?: (g: G, c: Ctx) => void) {
  add(
    'belt',
    id,
    name,
    rarity,
    (g, c) => {
      g.save();
      g.beginPath();
      g.ellipse(0, 0, 1, 0.88, 0, 0, Math.PI * 2);
      g.clip();
      beltBand(g);
      fill(g, col);
      if (extra) {
        beltBand(g);
        g.clip();
        extra(g, c);
      }
      g.restore();
      buckle(g, c);
    },
    o,
  );
}
const buckle = (col: string, w = 0.2, h = 0.18) => (g: G) => {
  rr(g, 0.42 - w / 2, 0.6 - h / 2, w, h, 0.03);
  stroke(g, col, 0.045);
};
belt('belt_brown', 'Leather Belt', 'Common', '#6a4220', buckle('#d0d8e2'));
belt('belt_black', 'Black Belt', 'Common', '#14161c', buckle('#ffc531'));
belt('belt_white', 'White Belt', 'Common', '#f4f4f4', buckle('#a8b2be'));
belt('belt_studded', 'Studded Belt', 'Rare', '#14161c', buckle('#d0d8e2'), {}, g => {
  for (let x = -0.9; x < 0.9; x += 0.16) circle(g, x, 0.55 + Math.abs(x) * -0.05, 0.025, '#d0d8e2');
});
belt('belt_cowboy', 'Big Buckle', 'Rare', '#8a5a34', g => {
  ellipse(g, 0.42, 0.6, 0.16, 0.12, 0, '#ffc531');
  star(g, 0.42, 0.6, 0.07);
  fill(g, '#c8102e');
});
belt('belt_champ', 'Champion Belt', 'Legendary', '#14161c', (g, c) => {
  ellipse(g, 0.4, 0.6, 0.28, 0.2, 0, '#ffc531');
  ellipse(g, 0.4, 0.6, 0.2, 0.13, 0, '#e8a512');
  star(g, 0.4, 0.6, 0.1);
  fill(g, '#fff1b0');
  twinkles(g, c.pose.t, 3, '#ffffff', 0.15, 0.45, 0.5, 0.3, 0.06);
}, {source: 'achieve', achieve: 'score100b'});
belt('belt_utility', 'Utility Belt', 'Epic', '#ffc531', buckle('#14161c'), {}, g => {
  for (const x of [-0.6, -0.25, 0.75]) {
    rr(g, x - 0.1, 0.48, 0.2, 0.2, 0.04);
    fill(g, '#e8a512');
  }
});
belt('belt_rope', 'Rope Belt', 'Common', '#d8b07a', g => {
  g.beginPath();
  g.moveTo(0.4, 0.62);
  g.quadraticCurveTo(0.45, 0.85, 0.36, 0.95);
  stroke(g, '#d8b07a', 0.05);
});
belt('belt_rainbow', 'Rainbow Belt', 'Epic', '#ffffff', buckle('#ffffff'), {}, (g, c) => {
  for (let i = 0; i < 6; i++) {
    g.fillStyle = hue(c.pose.t, i * 60, 95, 60);
    g.fillRect(-1.1 + i * 0.37, 0.3, 0.37, 0.6);
  }
});
belt('belt_karate', 'Karate Belt', 'Rare', '#14161c', g => {
  g.beginPath();
  g.moveTo(0.4, 0.62);
  g.lineTo(0.3, 0.95);
  g.moveTo(0.42, 0.62);
  g.lineTo(0.55, 0.92);
  stroke(g, '#14161c', 0.08);
}, {source: 'achieve', achieve: 'flaps10k'});
belt('belt_candycane', 'Candy Cane Belt', 'Rare', '#ffffff', buckle('#2fbf4a'), {source: 'event', month: 11}, g => {
  g.fillStyle = '#e8102e';
  for (let x = -1.1; x < 1.1; x += 0.2) {
    poly(g, [x, 0.4, x + 0.08, 0.4, x + 0.18, 0.8, x + 0.1, 0.8]);
    g.fill();
  }
});
belt('fannypack', 'Fanny Pack', 'Rare', '#3fa9ff', g => {
  rr(g, 0.15, 0.48, 0.5, 0.3, 0.12);
  fill(g, '#ff3ad1');
  g.beginPath();
  g.moveTo(0.2, 0.58);
  g.lineTo(0.6, 0.58);
  stroke(g, '#ffd23f', 0.03);
});

// =============================================================================================
// Pants (lower body, clipped to the body; plus the legs)
// =============================================================================================
function pantsTop(g: G) {
  g.beginPath();
  g.moveTo(-1.1, 0.46);
  g.quadraticCurveTo(0, 0.62, 1.1, 0.42);
  g.lineTo(1.1, 1.2);
  g.lineTo(-1.1, 1.2);
  g.closePath();
}
function pants(id: string, name: string, rarity: Rarity, col: string, o: Opt & {pattern?: (g: G, c: Ctx) => void; short?: boolean} = {}) {
  const {pattern, short, ...rest} = o;
  add(
    'pants',
    id,
    name,
    rarity,
    (g, c) => {
      pantsTop(g);
      fill(g, col);
      if (pattern) {
        g.save();
        pantsTop(g);
        g.clip();
        pattern(g, c);
        g.restore();
      }
      g.beginPath();
      g.moveTo(-1.1, 0.46);
      g.quadraticCurveTo(0, 0.62, 1.1, 0.42);
      stroke(g, shadeColor(col.startsWith('#') ? col : '#888888', -0.3), 0.05);
    },
    {
      ...rest,
      legs: (g, c) => {
        const tuck = c.pose.flap * 0.06;
        for (const [x0, x1] of [
          [-0.16, -0.22],
          [0.2, 0.16],
        ]) {
          g.beginPath();
          g.moveTo(x0, 0.62);
          g.lineTo(x0 + (x1 - x0) * (short ? 0.3 : 0.75), (short ? 0.82 : 1.05) - tuck * 0.7);
          stroke(g, col, 0.22);
        }
      },
    },
  );
}
const denim = (g: G) => {
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(0.1, 0.55);
  g.lineTo(0.12, 1.1);
  g.stroke();
};
pants('jeans', 'Jeans', 'Common', '#2f5aa8', {pattern: denim});
pants('jeans_black', 'Black Jeans', 'Common', '#262a33', {pattern: denim});
pants('ripped', 'Ripped Jeans', 'Rare', '#5a86d0', {
  pattern: g => {
    g.fillStyle = '#e8eef5';
    for (const [x, y] of [
      [-0.4, 0.75],
      [0.3, 0.8],
    ])
      g.fillRect(x, y, 0.16, 0.04);
  },
});
pants('shorts', 'Khaki Shorts', 'Common', '#c8a86a', {short: true});
pants('tux', 'Tuxedo Pants', 'Rare', '#14161c', {
  pattern: g => {
    g.fillStyle = '#3a3f4a';
    g.fillRect(-0.02, 0.5, 0.04, 0.7);
  },
});
pants('track', 'Track Pants', 'Rare', '#d81e2c', {
  pattern: g => {
    g.fillStyle = '#ffffff';
    g.fillRect(-0.5, 0.5, 0.04, 0.7);
    g.fillRect(-0.42, 0.5, 0.04, 0.7);
  },
});
pants('kilt', 'Plaid Kilt', 'Rare', '#c8102e', {
  short: true,
  pattern: g => {
    g.fillStyle = 'rgba(20,40,90,.5)';
    for (let x = -1; x < 1; x += 0.25) g.fillRect(x, 0.4, 0.08, 0.8);
    for (let y = 0.5; y < 1.2; y += 0.2) g.fillRect(-1.1, y, 2.2, 0.06);
  },
});
pants('tutu', 'Tutu', 'Rare', '#ffb3d6', {
  short: true,
  pattern: g => {
    for (let x = -1; x < 1; x += 0.15) circle(g, x, 0.62, 0.1, '#ff8ac0');
  },
});
pants('camo_pants', 'Camo Pants', 'Rare', '#5f7a3a', {
  pattern: g => {
    for (let i = 0; i < 8; i++) ellipse(g, -0.9 + prand(i) * 1.8, 0.55 + prand(i + 4) * 0.5, 0.15, 0.07, 1, ['#3c4f22', '#8a7a4a'][i % 2]);
  },
});
pants('pajama', 'Pajamas', 'Common', '#8ab4ff', {pattern: g => [0, 1, 2, 3, 4, 5].forEach(i => circle(g, -0.8 + i * 0.32, 0.7 + (i % 2) * 0.2, 0.05, '#ffffff'))});
pants('overalls', 'Overalls', 'Rare', '#3a6ab8', {
  pattern: denim,
  back: undefined,
});
pants('skeleton_pants', 'Bone Leggings', 'Rare', '#14161c', {
  source: 'event',
  month: 9,
  pattern: g => {
    g.strokeStyle = '#eef0f4';
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(-0.4, 0.6);
    g.lineTo(-0.4, 1.1);
    g.moveTo(0.4, 0.6);
    g.lineTo(0.4, 1.1);
    g.stroke();
  },
});
pants('elf_pants', 'Elf Tights', 'Rare', '#2fbf4a', {source: 'event', month: 11, pattern: g => [0, 1, 2, 3].forEach(i => ((g.fillStyle = '#d81e2c'), g.fillRect(-1.1, 0.55 + i * 0.16, 2.2, 0.07)))});
pants('trunks', 'Swim Trunks', 'Rare', '#ff5a3d', {short: true, source: 'event', month: 6, pattern: g => [0, 1, 2, 3, 4].forEach(i => circle(g, -0.8 + i * 0.4, 0.75, 0.08, '#ffd23f'))});
pants('gold_pants', 'Gold Pants', 'Legendary', '#ffc531', {source: 'egg', pattern: (g, c) => shine()(g, c.pose.t)});
pants('galaxy_pants', 'Galaxy Pants', 'Mythic', '#2a1260', {source: 'daily', pattern: (g, c) => twinkles(g, c.pose.t, 10, '#ffffff', -1, 0.5, 2, 0.7, 0.05)});
pants('pumpkin_pants', 'Harvest Shorts', 'Rare', '#e8641a', {short: true, source: 'event', month: 10});

// =============================================================================================
// Shoes (at both feet)
// =============================================================================================
function shoes(id: string, name: string, rarity: Rarity, draw: (g: G, x: number, y: number, c: Ctx, i: number) => void, o: Opt = {}) {
  add(
    'shoes',
    id,
    name,
    rarity,
    (g, c) => {
      feet(c.pose).forEach(([x, y], i) => draw(g, x, y, c, i));
    },
    o,
  );
}
const sneaker = (col: string, sole = '#ffffff', swoosh?: string) => (g: G, x: number, y: number) => {
  g.beginPath();
  g.moveTo(x - 0.13, y + 0.08);
  g.lineTo(x - 0.12, y - 0.1);
  g.quadraticCurveTo(x + 0.02, y - 0.12, x + 0.1, y - 0.02);
  g.quadraticCurveTo(x + 0.3, y - 0.02, x + 0.28, y + 0.08);
  g.closePath();
  fill(g, col);
  rr(g, x - 0.14, y + 0.06, 0.44, 0.07, 0.03);
  fill(g, sole);
  if (swoosh) {
    g.beginPath();
    g.moveTo(x - 0.06, y + 0.02);
    g.quadraticCurveTo(x + 0.1, y + 0.05, x + 0.2, y - 0.02);
    stroke(g, swoosh, 0.025);
  }
};
shoes('sneakers_white', 'White Kicks', 'Common', sneaker('#f4f4f4', '#d0d8e2', '#14161c'));
shoes('sneakers_red', 'Red Kicks', 'Common', sneaker('#e8303f', '#ffffff', '#ffffff'));
shoes('sneakers_black', 'Black Kicks', 'Common', sneaker('#20242d', '#ffffff', '#ff3b5c'));
shoes('hightops', 'High-Tops', 'Rare', (g, x, y) => {
  rr(g, x - 0.13, y - 0.22, 0.17, 0.26, 0.04);
  fill(g, '#2f7cf6');
  sneaker('#2f7cf6', '#ffffff', '#ffffff')(g, x, y);
});
shoes('boots', 'Cowboy Boots', 'Rare', (g, x, y) => {
  rr(g, x - 0.13, y - 0.28, 0.18, 0.34, 0.03);
  fill(g, '#8a5a34');
  sneaker('#8a5a34', '#4a2a12')(g, x, y);
  star(g, x - 0.04, y - 0.15, 0.04);
  fill(g, '#ffc531');
});
shoes('rainboots', 'Rain Boots', 'Common', (g, x, y) => {
  rr(g, x - 0.13, y - 0.26, 0.18, 0.32, 0.04);
  fill(g, '#ffd23f');
  sneaker('#ffd23f', '#e8a512')(g, x, y);
});
shoes('flipflops', 'Flip Flops', 'Common', (g, x, y) => {
  rr(g, x - 0.12, y + 0.06, 0.4, 0.05, 0.02);
  fill(g, '#3fa9ff');
  g.beginPath();
  g.moveTo(x - 0.05, y + 0.06);
  g.lineTo(x + 0.06, y - 0.03);
  g.lineTo(x + 0.14, y + 0.06);
  stroke(g, '#ff3ad1', 0.03);
}, {source: 'event', month: 5});
shoes('heels', 'Red Heels', 'Rare', (g, x, y) => {
  g.beginPath();
  g.moveTo(x - 0.12, y - 0.06);
  g.quadraticCurveTo(x + 0.1, y - 0.04, x + 0.28, y + 0.1);
  g.lineTo(x - 0.06, y + 0.06);
  g.closePath();
  fill(g, '#d81e2c');
  g.fillStyle = '#d81e2c';
  g.fillRect(x - 0.13, y - 0.02, 0.04, 0.18);
});
shoes('skates', 'Roller Skates', 'Epic', (g, x, y, c) => {
  sneaker('#ff7ad1', '#ffffff')(g, x, y);
  for (const dx of [-0.06, 0.18]) {
    circle(g, x + dx, y + 0.18, 0.055, '#ffd23f');
    g.save();
    g.translate(x + dx, y + 0.18);
    g.rotate(c.pose.t * 10);
    g.fillStyle = '#e8a512';
    g.fillRect(-0.04, -0.008, 0.08, 0.016);
    g.restore();
  }
});
shoes('iceskates', 'Ice Skates', 'Rare', (g, x, y) => {
  rr(g, x - 0.13, y - 0.2, 0.18, 0.26, 0.04);
  fill(g, '#ffffff');
  sneaker('#ffffff', '#d0d8e2')(g, x, y);
  g.fillStyle = '#c0c8d4';
  g.fillRect(x - 0.14, y + 0.15, 0.44, 0.03);
}, {source: 'event', month: 11});
shoes('elfshoes', 'Elf Shoes', 'Rare', (g, x, y) => {
  g.beginPath();
  g.moveTo(x - 0.13, y + 0.1);
  g.lineTo(x - 0.12, y - 0.08);
  g.quadraticCurveTo(x + 0.3, y - 0.05, x + 0.34, y - 0.2);
  g.quadraticCurveTo(x + 0.38, y + 0.12, x - 0.13, y + 0.1);
  fill(g, '#2fbf4a');
  circle(g, x + 0.34, y - 0.21, 0.04, '#ffd23f');
}, {source: 'event', month: 11});
shoes('clown', 'Clown Shoes', 'Rare', (g, x, y) => {
  ellipse(g, x + 0.12, y + 0.04, 0.3, 0.12, 0, '#e8303f');
  ellipse(g, x + 0.2, y + 0.0, 0.12, 0.06, 0, 'rgba(255,255,255,.5)');
});
shoes('bunnyslippers', 'Bunny Slippers', 'Rare', (g, x, y) => {
  ellipse(g, x + 0.08, y + 0.04, 0.22, 0.1, 0, '#ffffff');
  ellipse(g, x - 0.02, y - 0.12, 0.04, 0.12, -0.3, '#ffffff');
  ellipse(g, x + 0.06, y - 0.12, 0.04, 0.12, 0.3, '#ffffff');
  circle(g, x + 0.24, y + 0.0, 0.025, '#ff7ab0');
}, {source: 'event', month: 3});
shoes('goldkicks', 'Golden Kicks', 'Legendary', (g, x, y, c, i) => {
  sneaker('#ffc531', '#fff1b0', '#ffffff')(g, x, y);
  if (i === 1) twinkles(g, c.pose.t, 3, '#ffffff', x - 0.1, y - 0.1, 0.4, 0.2, 0.05);
}, {source: 'egg'});
shoes('rocketboots', 'Rocket Boots', 'Mythic', (g, x, y, c) => {
  rr(g, x - 0.14, y - 0.18, 0.3, 0.26, 0.05);
  fill(g, '#9aa4b0');
  const f = 0.15 + Math.sin(c.pose.t * 30 + x * 10) * 0.05;
  g.beginPath();
  g.moveTo(x - 0.08, y + 0.08);
  g.quadraticCurveTo(x + 0.01, y + 0.08 + f * 2, x + 0.1, y + 0.08);
  fill(g, '#ffd23f');
  g.beginPath();
  g.moveTo(x - 0.04, y + 0.08);
  g.quadraticCurveTo(x + 0.01, y + 0.08 + f, x + 0.06, y + 0.08);
  fill(g, '#ffffff');
}, {source: 'daily'});
shoes('witchboots', 'Witch Boots', 'Rare', (g, x, y) => {
  rr(g, x - 0.13, y - 0.24, 0.17, 0.3, 0.03);
  fill(g, '#14101c');
  g.beginPath();
  g.moveTo(x - 0.13, y + 0.1);
  g.lineTo(x - 0.12, y - 0.06);
  g.quadraticCurveTo(x + 0.3, y - 0.02, x + 0.36, y - 0.1);
  g.quadraticCurveTo(x + 0.3, y + 0.12, x - 0.13, y + 0.1);
  fill(g, '#14101c');
  g.fillStyle = '#8a2ad8';
  g.fillRect(x - 0.13, y - 0.12, 0.17, 0.05);
}, {source: 'event', month: 9});
shoes('buckleshoes', 'Buckle Shoes', 'Rare', (g, x, y) => {
  sneaker('#14161c', '#14161c')(g, x, y);
  rr(g, x + 0.02, y - 0.06, 0.1, 0.08, 0.01);
  stroke(g, '#ffd23f', 0.025);
}, {source: 'event', month: 10});
shoes('lightup', 'Light-Up Kicks', 'Epic', (g, x, y, c, i) => {
  sneaker('#ffffff', `hsl(${(c.pose.t * 300 + i * 90) % 360},100%,60%)`)(g, x, y);
});
shoes('slides', 'Slides & Socks', 'Common', (g, x, y) => {
  rr(g, x - 0.12, y - 0.16, 0.16, 0.22, 0.05);
  fill(g, '#ffffff');
  rr(g, x - 0.14, y + 0.06, 0.42, 0.06, 0.03);
  fill(g, '#14161c');
  rr(g, x - 0.06, y - 0.03, 0.24, 0.08, 0.03);
  fill(g, '#14161c');
});

// =============================================================================================
// Wings (replace the flapping wing; drawn in the wing frame)
// =============================================================================================
function wings(id: string, name: string, rarity: Rarity, draw: (g: G, c: Ctx) => void, o: Opt = {}) {
  add('wings', id, name, rarity, draw, o);
}
const feathered = (cols: string[], len = 1) => (g: G) => {
  for (let i = 0; i < cols.length; i++) {
    g.save();
    g.rotate(-0.25 + i * 0.16);
    ellipse(g, -0.3 * len, 0.02, 0.42 * len, 0.1, 0, cols[i]);
    g.restore();
  }
  ellipse(g, 0.05, 0.0, 0.3, 0.18, 0, cols[0]);
};
wings('angel', 'Angel Wings', 'Epic', feathered(['#ffffff', '#f4f7fb', '#e8eef5', '#dfe7f0', '#d0dae6'], 1.3));
wings('bat', 'Bat Wings', 'Epic', g => {
  g.beginPath();
  g.moveTo(0.3, -0.05);
  g.lineTo(-0.2, -0.3);
  g.lineTo(-0.85, -0.2);
  g.quadraticCurveTo(-0.7, 0.0, -0.75, 0.12);
  g.quadraticCurveTo(-0.55, 0.05, -0.45, 0.22);
  g.quadraticCurveTo(-0.3, 0.1, -0.15, 0.28);
  g.quadraticCurveTo(0.1, 0.15, 0.3, -0.05);
  fill(g, '#2a1a3a');
  g.strokeStyle = '#5a3a7a';
  g.lineWidth = 0.03;
  g.beginPath();
  g.moveTo(-0.2, -0.3);
  g.lineTo(-0.45, 0.2);
  g.moveTo(-0.2, -0.3);
  g.lineTo(-0.15, 0.26);
  g.stroke();
}, {source: 'event', month: 9});
wings('fire', 'Fire Wings', 'Legendary', (g, c) => {
  for (let i = 0; i < 5; i++) {
    const l = 0.55 + Math.sin(c.pose.t * 12 + i * 1.3) * 0.12;
    g.save();
    g.rotate(-0.3 + i * 0.15);
    g.beginPath();
    g.moveTo(0.2, 0);
    g.quadraticCurveTo(-l * 0.5, -0.14, -l, 0);
    g.quadraticCurveTo(-l * 0.5, 0.14, 0.2, 0);
    fill(g, ['#ff3b1a', '#ff6a1a', '#ff9a1a', '#ffc31a', '#fff06a'][i]);
    g.restore();
  }
}, {source: 'egg'});
wings('ice', 'Ice Wings', 'Legendary', (g, c) => {
  for (let i = 0; i < 4; i++) {
    g.save();
    g.rotate(-0.25 + i * 0.18);
    poly(g, [0.2, -0.05, -0.75 + i * 0.08, -0.08, -0.9 + i * 0.1, 0.02, -0.7 + i * 0.08, 0.08, 0.2, 0.05]);
    fill(g, `rgba(${170 + i * 20},${230 + i * 6},255,.85)`);
    g.restore();
  }
  twinkles(g, c.pose.t, 3, '#ffffff', -0.8, -0.2, 0.8, 0.4, 0.06);
}, {source: 'shop', price: 3200});
wings('butterfly', 'Butterfly Wings', 'Epic', g => {
  ellipse(g, -0.35, -0.12, 0.42, 0.26, -0.3, '#ff7ad1');
  ellipse(g, -0.3, 0.18, 0.3, 0.18, 0.4, '#c45cff');
  circle(g, -0.45, -0.15, 0.08, '#ffd23f');
  circle(g, -0.3, 0.2, 0.06, '#ffffff');
}, {source: 'event', month: 3});
wings('mech', 'Mech Wings', 'Legendary', (g, c) => {
  for (let i = 0; i < 4; i++) {
    g.save();
    g.rotate(-0.3 + i * 0.18);
    rr(g, -0.8 + i * 0.1, -0.06, 0.95 - i * 0.1, 0.12, 0.03);
    fill(g, ['#9aa4b0', '#b8c2ce', '#8a94a0', '#a8b2be'][i]);
    g.restore();
  }
  circle(g, 0.1, 0, 0.08, `rgba(53,242,255,${0.6 + Math.sin(c.pose.t * 8) * 0.4})`);
}, {source: 'daily'});
wings('golden', 'Golden Wings', 'Legendary', (g, c) => {
  feathered(['#ffc531', '#ffd25a', '#ffdf80', '#ffe8a0', '#fff1c0'], 1.2)(g);
  twinkles(g, c.pose.t, 4, '#ffffff', -0.8, -0.2, 0.9, 0.4, 0.06);
}, {source: 'daily'});
wings('rainbow_wings', 'Rainbow Wings', 'Epic', (g, c) => feathered([0, 1, 2, 3, 4].map(i => hue(c.pose.t, i * 60, 95, 62)), 1.15)(g));
wings('leaf', 'Leaf Wings', 'Rare', feathered(['#e8641a', '#ff9a2a', '#c8301a', '#ffc23d', '#a8501a'], 1.1), {source: 'event', month: 10});
wings('candy_wings', 'Peppermint Wings', 'Rare', g => {
  circle(g, -0.25, 0.02, 0.32, '#ffffff');
  g.save();
  g.clip();
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(-0.25, 0.02);
    g.arc(-0.25, 0.02, 0.4, (i * Math.PI) / 3, (i * Math.PI) / 3 + 0.5);
    fill(g, '#e8102e');
  }
  g.restore();
}, {source: 'event', month: 11});
wings('cupid', 'Cupid Wings', 'Rare', g => {
  feathered(['#ffd0e4', '#ffc0da', '#ffb0d0'], 0.9)(g);
  heart(g, -0.15, -0.02, 0.1);
  fill(g, '#ff2d6a');
}, {source: 'event', month: 1});
wings('dragon', 'Dragon Wings', 'Legendary', g => {
  g.beginPath();
  g.moveTo(0.3, -0.05);
  g.lineTo(-0.3, -0.38);
  g.lineTo(-0.95, -0.3);
  g.quadraticCurveTo(-0.75, -0.05, -0.85, 0.12);
  g.quadraticCurveTo(-0.6, 0.02, -0.5, 0.22);
  g.quadraticCurveTo(-0.3, 0.08, -0.15, 0.3);
  g.closePath();
  fill(g, '#1f8f4a');
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 0.03;
  g.beginPath();
  g.moveTo(-0.3, -0.38);
  g.lineTo(-0.5, 0.2);
  g.moveTo(-0.3, -0.38);
  g.lineTo(-0.85, 0.1);
  g.stroke();
}, {source: 'egg'});
wings('galaxy_wings', 'Galaxy Wings', 'Mythic', (g, c) => {
  feathered(['#2a1260', '#3a1a80', '#4a2aa0', '#5a3ac0', '#6a4ae0'], 1.35)(g);
  twinkles(g, c.pose.t, 8, '#ffffff', -1, -0.3, 1.1, 0.5, 0.05);
}, {source: 'daily'});
wings('lightning', 'Storm Wings', 'Mythic', (g, c) => {
  feathered(['#1a2a5a', '#22356a', '#2a407a'], 1.2)(g);
  if (Math.sin(c.pose.t * 7) > 0.3) {
    g.shadowColor = '#bfe6ff';
    g.shadowBlur = 10;
    poly(g, [-0.1, -0.2, -0.35, 0.0, -0.25, 0.02, -0.5, 0.25], false);
    stroke(g, '#e6f6ff', 0.05);
    g.shadowBlur = 0;
  }
}, {source: 'daily'});
wings('paper', 'Paper Plane', 'Rare', g => {
  poly(g, [0.3, 0, -0.7, -0.25, -0.5, 0.0, -0.7, 0.2]);
  fill(g, '#f4f7fb');
  stroke(g, '#c0c8d4', 0.02);
});
wings('phoenix_wings', 'Phoenix Wings', 'Secret', (g, c) => {
  for (let i = 0; i < 6; i++) {
    const l = 0.75 + Math.sin(c.pose.t * 10 + i) * 0.12;
    g.save();
    g.rotate(-0.4 + i * 0.14);
    g.shadowColor = '#ff9a1a';
    g.shadowBlur = 12;
    ellipse(g, -l * 0.45, 0, l * 0.55, 0.09, 0, ['#fff06a', '#ffc31a', '#ff9a1a', '#ff6a1a', '#ff3b1a', '#d81e2c'][i]);
    g.restore();
  }
  g.shadowBlur = 0;
}, {source: 'daily'});
wings('turkeyfan', 'Turkey Tail Fan', 'Epic', g => drawWing(g, {body: '', belly: '', wing: '#7a4a2a', beak: '', leg: ''}), {
  source: 'event',
  month: 10,
  back: g => {
    const cs = ['#c8301a', '#e8641a', '#ffb23d', '#7a4a2a', '#ffb23d', '#e8641a', '#c8301a'];
    for (let i = 0; i < 7; i++) {
      g.save();
      g.translate(-0.55, 0.0);
      g.rotate(-Math.PI / 2 - 1.1 + i * 0.37);
      ellipse(g, 0, -0.6, 0.16, 0.6, 0, cs[i]);
      circle(g, 0, -1.0, 0.07, '#2a1a0a');
      g.restore();
    }
  },
});
wings('stealth_wings', 'Jet Wings', 'Epic', g => {
  poly(g, [0.3, -0.05, -0.85, -0.12, -0.7, 0.05, 0.3, 0.08]);
  fill(g, '#3a3f4a');
  g.fillStyle = '#ff3b5c';
  g.fillRect(-0.72, -0.05, 0.12, 0.05);
}, {source: 'achieve', achieve: 'score25'});

// =============================================================================================
// Trails (particles behind the bird while flying)
// =============================================================================================
function trail(id: string, name: string, rarity: Rarity, spec: TrailSpec, o: Opt = {}) {
  add('trail', id, name, rarity, noop, {...o, trail: spec});
}
trail('t_spark', 'Sparkles', 'Common', {shape: 'spark', colors: ['#ffffff', '#fff1b0'], rate: 26, size: 5});
trail('t_bubble', 'Bubbles', 'Common', {shape: 'bubble', colors: ['#9fe0ff'], rate: 14, size: 7, gravity: -60});
trail('t_heart', 'Hearts', 'Rare', {shape: 'heart', colors: ['#ff2d6a', '#ff7ab0'], rate: 12, size: 8, gravity: -40});
trail('t_star', 'Stars', 'Rare', {shape: 'star', colors: ['#ffd23f', '#ffffff'], rate: 14, size: 8});
trail('t_note', 'Music Notes', 'Rare', {shape: 'note', colors: ['#c45cff', '#3fa9ff', '#39ff88'], rate: 9, size: 10, gravity: -50});
trail('t_coin', 'Coin Shower', 'Epic', {shape: 'coin', colors: ['#ffc531'], rate: 10, size: 8, gravity: 260});
trail('t_flame', 'Flames', 'Epic', {shape: 'flame', colors: ['#ff5a1a', '#ffb21e', '#fff06a'], rate: 34, size: 9, gravity: -90});
trail('t_rainbow', 'Rainbow Ribbon', 'Legendary', {shape: 'ribbon', colors: ['#ffffff'], rate: 60, size: 7, rainbow: true}, {source: 'egg'});
trail('t_pixel', 'Glitch Pixels', 'Epic', {shape: 'pixel', colors: ['#39ff88', '#ff2d95', '#35f2ff'], rate: 24, size: 6});
trail('t_bolt', 'Lightning', 'Legendary', {shape: 'bolt', colors: ['#bfe6ff', '#ffffff'], rate: 8, size: 14}, {source: 'daily'});
trail('t_feather', 'Feathers', 'Common', {shape: 'feather', colors: ['#ffffff', '#ffe8b0'], rate: 6, size: 10, gravity: 40});
trail('t_galaxy', 'Stardust', 'Mythic', {shape: 'star', colors: ['#b07bff', '#ffffff', '#ff7ad1'], rate: 40, size: 6, rainbow: false}, {source: 'daily'});
trail('t_bats', 'Bats', 'Epic', {shape: 'bat', colors: ['#2a1a3a', '#5a3a7a'], rate: 6, size: 14, gravity: -70}, {source: 'event', month: 9});
trail('t_candy', 'Candy', 'Rare', {shape: 'candy', colors: ['#ff8a1a', '#c45cff', '#39ff88'], rate: 9, size: 9, gravity: 160}, {source: 'event', month: 9});
trail('t_ghost', 'Ghosts', 'Epic', {shape: 'ghost', colors: ['#e8f0ff'], rate: 5, size: 14, gravity: -40}, {source: 'event', month: 9});
trail('t_pumpkin', 'Pumpkins', 'Rare', {shape: 'pumpkin', colors: ['#ff8a1a'], rate: 6, size: 11, gravity: 200}, {source: 'event', month: 9});
trail('t_leaf', 'Falling Leaves', 'Rare', {shape: 'leaf', colors: ['#e8641a', '#ffb23d', '#c8301a'], rate: 9, size: 10, gravity: 70}, {source: 'event', month: 10});
trail('t_snow', 'Snowflakes', 'Rare', {shape: 'snow', colors: ['#ffffff', '#cfeeff'], rate: 12, size: 9, gravity: 50}, {source: 'event', month: 11});
trail('t_confetti', 'Confetti', 'Rare', {shape: 'confetti', colors: ['#ff3b5c', '#ffd23f', '#3fa9ff', '#39ff88', '#c45cff'], rate: 22, size: 7, gravity: 120}, {source: 'event', month: 0});
trail('t_valentine', 'Love Hearts', 'Epic', {shape: 'heart', colors: ['#ff2d6a', '#ffffff'], rate: 18, size: 9, gravity: -60}, {source: 'event', month: 1});
trail('t_clover', 'Lucky Clovers', 'Rare', {shape: 'clover', colors: ['#2fbf4a', '#39d85a'], rate: 8, size: 10, gravity: 60}, {source: 'event', month: 2});
trail('t_petal', 'Petals', 'Rare', {shape: 'petal', colors: ['#ffc2dc', '#ffffff'], rate: 12, size: 7, gravity: 50}, {source: 'event', month: 3});
trail('t_firework', 'Fireworks', 'Epic', {shape: 'spark', colors: ['#ff3b5c', '#ffffff', '#3fa9ff'], rate: 50, size: 5}, {source: 'event', month: 6});
trail('t_sun', 'Sunshine', 'Rare', {shape: 'spark', colors: ['#ffd23f', '#ff9a2a'], rate: 30, size: 6}, {source: 'event', month: 5});
trail('t_apple', 'Harvest Leaves', 'Rare', {shape: 'leaf', colors: ['#c8301a', '#ffb23d'], rate: 7, size: 10, gravity: 80}, {source: 'event', month: 8});
trail('t_beach', 'Sea Bubbles', 'Rare', {shape: 'bubble', colors: ['#3ad0ff', '#ffffff'], rate: 18, size: 7, gravity: -80}, {source: 'event', month: 7});
trail('t_kmr', 'KMR Embers', 'Secret', {shape: 'flame', colors: ['#d1001f', '#ffc531', '#ffffff'], rate: 50, size: 8, gravity: -120}, {source: 'daily'});
trail('t_medal', 'Medal Glow', 'Epic', {shape: 'star', colors: ['#ffc531', '#e0fbff'], rate: 18, size: 7}, {source: 'achieve', achieve: 'gold'});

// =============================================================================================
// More monthly event items (so every month has a proper set)
// =============================================================================================
// January — New Year
hat('tophat_ny', 'Midnight Top Hat', 'Epic', (g, c) => tophat('#14161c', '#ffc531', g2 => twinkles(g2, c.pose.t, 4, '#ffd23f', -0.3, -0.75, 0.6, 0.6, 0.06))(g), {source: 'event', month: 0});
eyes('glitter', 'Glitter Shades', 'Rare', (g, c) => {
  shades('rgba(255,197,49,.85)', '#ffc531')(g);
  twinkles(g, c.pose.t, 3, '#ffffff', -0.3, -0.2, 0.7, 0.4, 0.06);
}, {source: 'event', month: 0});
// May — Blossom
color('ladybug', 'Ladybug', 'Rare', pal('#e8202e', '#ffd0d4', '#14161c', '#14161c', '#14161c', {pattern: spots('#14161c', 8, 0.11)}), {source: 'event', month: 4});
hat('tulip', 'Tulip', 'Common', g => {
  g.strokeStyle = '#2fbf4a';
  g.lineWidth = 0.05;
  g.beginPath();
  g.moveTo(0, 0.05);
  g.lineTo(0, -0.3);
  g.stroke();
  poly(g, [-0.16, -0.3, -0.18, -0.6, -0.06, -0.48, 0, -0.62, 0.06, -0.48, 0.18, -0.6, 0.16, -0.3]);
  fill(g, '#ff5a8a');
}, {source: 'event', month: 4});
neck('scarf_spring', 'Spring Scarf', 'Rare', scarf('#ff9ac0', '#ffffff'), {source: 'event', month: 4});
wings('bee', 'Bee Wings', 'Epic', g => {
  ellipse(g, -0.3, -0.12, 0.4, 0.2, -0.4, 'rgba(220,240,255,.7)');
  ellipse(g, -0.25, 0.1, 0.3, 0.15, 0.3, 'rgba(220,240,255,.55)');
  g.strokeStyle = 'rgba(80,100,130,.6)';
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(0.1, 0);
  g.lineTo(-0.6, -0.25);
  g.stroke();
}, {source: 'event', month: 4});
// August — Beach Days
eyes('surfshades', 'Surf Shades', 'Rare', shades('rgba(40,220,230,.85)', '#ff7ad1'), {source: 'event', month: 7});
mask('snorkel', 'Snorkel', 'Rare', g => {
  g.beginPath();
  g.moveTo(0.95, 0.25);
  g.lineTo(0.95, 0.45);
  g.quadraticCurveTo(0.9, 0.55, 0.75, 0.5);
  g.lineTo(0.0, -0.75);
  stroke(g, '#ffd23f', 0.08);
  circle(g, 0.0, -0.8, 0.07, '#ff5a3d');
}, {source: 'event', month: 7});
neck('shells', 'Shell Necklace', 'Rare', chain('#f2e6d0', 0.05, (g, x, y) => {
  ellipse(g, x, y, 0.12, 0.1, 0, '#ffb3a0');
  g.strokeStyle = '#e88a70';
  g.lineWidth = 0.02;
  g.beginPath();
  for (let i = -2; i <= 2; i++) {
    g.moveTo(x, y + 0.09);
    g.lineTo(x + i * 0.04, y - 0.08);
  }
  g.stroke();
}), {source: 'event', month: 7});
shoes('sandals', 'Sandals', 'Common', (g, x, y) => {
  rr(g, x - 0.12, y + 0.06, 0.4, 0.05, 0.02);
  fill(g, '#a8723a');
  g.fillStyle = '#c08a4a';
  g.fillRect(x - 0.02, y - 0.02, 0.2, 0.05);
  g.fillRect(x - 0.08, y + 0.0, 0.06, 0.07);
}, {source: 'event', month: 7});
// September — Harvest
color('flannel', 'Flannel', 'Rare', pal('#c8302a', '#e8d8c0', '#8a1a1a', '#ffb21e', '#5a3418', {
  pattern: g => {
    g.fillStyle = 'rgba(20,20,20,.35)';
    for (let x = -1.1; x < 1.1; x += 0.3) g.fillRect(x, -1, 0.1, 2);
    for (let y = -1; y < 1; y += 0.3) g.fillRect(-1.1, y, 2.2, 0.1);
  },
}), {source: 'event', month: 8});
hat('apple', 'Apple Hat', 'Rare', g => {
  circle(g, -0.1, -0.25, 0.28, '#e8202e');
  circle(g, 0.12, -0.25, 0.28, '#e8202e');
  g.fillStyle = '#5a3418';
  g.fillRect(-0.02, -0.65, 0.05, 0.16);
  ellipse(g, 0.12, -0.58, 0.12, 0.05, -0.4, '#2fbf4a');
}, {source: 'event', month: 8});
// February / March extras
belt('belt_heart', 'Heart Belt', 'Rare', '#ff4f9a', g => {
  heart(g, 0.42, 0.58, 0.1);
  fill(g, '#ffffff');
}, {source: 'event', month: 1});
shoes('goldboots', 'Pot-of-Gold Boots', 'Epic', (g, x, y) => {
  rr(g, x - 0.13, y - 0.24, 0.18, 0.3, 0.03);
  fill(g, '#1f8f34');
  sneaker('#1f8f34', '#14161c')(g, x, y);
  g.fillStyle = '#ffc531';
  g.fillRect(x - 0.13, y - 0.1, 0.18, 0.05);
}, {source: 'event', month: 2});

// =============================================================================================
// Lookups
// =============================================================================================
export const ALL_ITEMS: readonly Item[] = ITEMS;
const BY_ID = new Map(ITEMS.map(i => [i.id, i]));
export const itemById = (id: string): Item | undefined => BY_ID.get(id);
export const itemsIn = (slot: Slot) => ITEMS.filter(i => i.slot === slot);
export const STARTER_LOOK: Look = {color: 'sunny'};

// Short look codes for the leaderboard: one index per slot (append new items at the end of a slot).
const SLOT_LISTS = Object.fromEntries(SLOTS.map(s => [s, itemsIn(s)])) as Record<Slot, Item[]>;
export function encodeLook(look: Look): string {
  return (['color', 'hat', 'eyes', 'mask', 'neck'] as Slot[])
    .map(s => {
      const i = look[s] ? SLOT_LISTS[s].findIndex(it => it.id === look[s]) : -1;
      return i < 0 ? '' : i.toString(36);
    })
    .join('.')
    .replace(/\.+$/, '');
}
export function decodeLook(code: string | undefined): Look {
  const look: Look = {};
  if (!code) return look;
  code.split('.').forEach((p, k) => {
    const s = (['color', 'hat', 'eyes', 'mask', 'neck'] as Slot[])[k];
    if (!s || !p) return;
    const it = SLOT_LISTS[s][parseInt(p, 36)];
    if (it) look[s] = it.id;
  });
  return look;
}

// =============================================================================================
// Trail particle drawing (used by the game and the wardrobe previews)
// =============================================================================================
export function drawParticle(g: G, shape: TrailShape, x: number, y: number, s: number, color: string, rot: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = color;
  g.strokeStyle = color;
  switch (shape) {
    case 'spark':
      star(g, 0, 0, s * 0.6, 4, 0.3);
      g.fill();
      break;
    case 'star':
      star(g, 0, 0, s * 0.6);
      g.fill();
      break;
    case 'heart':
      heart(g, 0, 0, s * 0.5);
      g.fill();
      break;
    case 'bubble':
      circle(g, 0, 0, s * 0.5);
      g.lineWidth = Math.max(1, s * 0.12);
      g.stroke();
      circle(g, -s * 0.15, -s * 0.15, s * 0.1, color);
      break;
    case 'flame':
      g.beginPath();
      g.moveTo(0, -s * 0.7);
      g.quadraticCurveTo(s * 0.5, 0, 0, s * 0.4);
      g.quadraticCurveTo(-s * 0.5, 0, 0, -s * 0.7);
      g.fill();
      break;
    case 'note':
      circle(g, 0, s * 0.3, s * 0.22, color);
      g.lineWidth = Math.max(1, s * 0.1);
      g.beginPath();
      g.moveTo(s * 0.2, s * 0.3);
      g.lineTo(s * 0.2, -s * 0.45);
      g.lineTo(s * 0.45, -s * 0.3);
      g.stroke();
      break;
    case 'coin':
      ellipse(g, 0, 0, s * 0.5 * Math.abs(Math.cos(rot * 3)) + 0.5, s * 0.5, 0, color);
      break;
    case 'leaf':
      ellipse(g, 0, 0, s * 0.55, s * 0.25, 0, color);
      break;
    case 'snow':
      snowflake(g, 0, 0, s * 0.5, color, Math.max(1, s * 0.1));
      break;
    case 'bat':
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-s * 0.3, -s * 0.4, -s * 0.7, -s * 0.1);
      g.quadraticCurveTo(-s * 0.4, 0, -s * 0.3, s * 0.15);
      g.quadraticCurveTo(-s * 0.1, 0, 0, s * 0.2);
      g.quadraticCurveTo(s * 0.1, 0, s * 0.3, s * 0.15);
      g.quadraticCurveTo(s * 0.4, 0, s * 0.7, -s * 0.1);
      g.quadraticCurveTo(s * 0.3, -s * 0.4, 0, 0);
      g.fill();
      break;
    case 'candy':
      ellipse(g, 0, 0, s * 0.3, s * 0.22, 0, color);
      poly(g, [-s * 0.3, 0, -s * 0.55, -s * 0.18, -s * 0.55, s * 0.18]);
      g.fill();
      poly(g, [s * 0.3, 0, s * 0.55, -s * 0.18, s * 0.55, s * 0.18]);
      g.fill();
      break;
    case 'confetti':
      g.fillRect(-s * 0.3, -s * 0.15, s * 0.6, s * 0.3);
      break;
    case 'clover':
      clover(g, 0, 0, s * 0.5, color);
      break;
    case 'ribbon':
      g.fillRect(-s * 0.3, -s * 0.5, s * 0.6, s);
      break;
    case 'ghost':
      g.beginPath();
      g.arc(0, 0, s * 0.4, Math.PI, 0);
      g.lineTo(s * 0.4, s * 0.45);
      for (let i = 0; i < 4; i++) g.lineTo(s * 0.4 - (i + 0.5) * s * 0.2, s * (i % 2 ? 0.45 : 0.3));
      g.lineTo(-s * 0.4, s * 0.45);
      g.closePath();
      g.globalAlpha *= 0.85;
      g.fill();
      g.fillStyle = '#2a3550';
      circle(g, -s * 0.13, -s * 0.05, s * 0.07, '#2a3550');
      circle(g, s * 0.13, -s * 0.05, s * 0.07, '#2a3550');
      break;
    case 'petal':
      ellipse(g, 0, 0, s * 0.45, s * 0.25, 0, color);
      break;
    case 'pixel':
      g.fillRect(-s * 0.35, -s * 0.35, s * 0.7, s * 0.7);
      break;
    case 'bolt':
      g.lineWidth = Math.max(1.5, s * 0.15);
      poly(g, [0, -s * 0.6, -s * 0.2, -s * 0.05, s * 0.15, 0, -s * 0.1, s * 0.6], false);
      g.stroke();
      break;
    case 'feather':
      ellipse(g, 0, 0, s * 0.55, s * 0.18, 0, color);
      g.strokeStyle = 'rgba(0,0,0,.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-s * 0.55, 0);
      g.lineTo(s * 0.55, 0);
      g.stroke();
      break;
    case 'pumpkin':
      ellipse(g, 0, 0, s * 0.5, s * 0.4, 0, color);
      g.fillStyle = '#2f8a2a';
      g.fillRect(-s * 0.05, -s * 0.55, s * 0.1, s * 0.18);
      break;
  }
  g.restore();
}
