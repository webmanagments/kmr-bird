// Dev-only: high-resolution renders of the bird and every item, for the design canvas.
import {drawBird} from '../game/bird';
import {ALL_ITEMS, RARITY_COLOR, SLOTS, drawParticle, type Item, type Look, type Slot} from '../game/items';

const out = document.getElementById('out')!;
const T = 0.6;
const font = 'system-ui, -apple-system, Segoe UI, sans-serif';

function make(id: string, w: number, h: number) {
  const c = document.createElement('canvas');
  c.id = id;
  c.width = w;
  c.height = h;
  out.appendChild(c);
  const g = c.getContext('2d')!;
  g.fillStyle = '#07090d';
  g.fillRect(0, 0, w, h);
  return g;
}

function trailBehind(g: CanvasRenderingContext2D, it: Item | undefined, x: number, y: number, s: number) {
  const spec = it?.trail;
  if (!spec) return;
  for (let i = 0; i < 9; i++) {
    const k = i / 9;
    g.globalAlpha = 1 - k * 0.8;
    const col = spec.rainbow ? `hsl(${i * 40},100%,62%)` : spec.colors[i % spec.colors.length];
    drawParticle(g, spec.shape, x - s * 1.2 - k * s * 2.6, y + Math.sin(i * 2.1) * s * 0.4, Math.min(spec.size * 2.2, s * 0.7), col, i);
  }
  g.globalAlpha = 1;
}

// One sheet per group of slots: cells with the bird wearing the item, name and rarity.
function sheet(id: string, slots: Slot[], cols = 6) {
  const items = ALL_ITEMS.filter(i => slots.includes(i.slot));
  const cw = 250;
  const ch = 230;
  const rows = Math.ceil(items.length / cols);
  const g = make(id, cols * cw, rows * ch);
  items.forEach((it, i) => {
    const x = (i % cols) * cw;
    const y = Math.floor(i / cols) * ch;
    g.fillStyle = '#10141c';
    g.beginPath();
    g.roundRect(x + 8, y + 8, cw - 16, ch - 16, 18);
    g.fill();
    g.strokeStyle = RARITY_COLOR[it.rarity] + '66';
    g.lineWidth = 2;
    g.stroke();
    const look: Look = it.slot === 'color' ? {color: it.id} : {color: 'sunny', [it.slot]: it.id};
    trailBehind(g, it.slot === 'trail' ? it : undefined, x + cw / 2 + 10, y + 92, 44);
    drawBird(g, look, x + cw / 2 + 10, y + 92, 44, {flap: 0.35, angle: 0, t: T});
    g.textAlign = 'center';
    g.fillStyle = '#f4f7fb';
    g.font = `800 19px ${font}`;
    g.fillText(it.name, x + cw / 2, y + 178);
    g.fillStyle = RARITY_COLOR[it.rarity];
    g.font = `800 13px ${font}`;
    const src = {starter: 'Starter', shop: 'Shop', egg: 'Mystery Egg', daily: 'Daily Shop', event: 'Event', achieve: 'Earned'}[it.source];
    g.fillText(`${it.rarity.toUpperCase()} · ${src}${it.month !== undefined ? ' · ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][it.month] : ''}`, x + cw / 2, y + 202);
  });
}

// Hero: the base bird, big, plus a few full outfits.
const hero = make('hero', 1440, 640);
drawBird(hero, {color: 'sunny'}, 330, 330, 200, {flap: 0.35, angle: 0, t: T});
const outfits: Look[] = [
  {color: 'robin', hat: 'cap_red', eyes: 'shades', neck: 'chain_gold', shoes: 'sneakers_white', trail: 't_spark'},
  {color: 'pumpkin', hat: 'witch', mask: 'fangs', neck: 'cape', wings: 'bat', trail: 't_bats'},
  {color: 'galaxy', hat: 'crown_diamond', eyes: 'laser', wings: 'galaxy_wings', trail: 't_galaxy'},
  {color: 'candycane', hat: 'santa', mask: 'beard', neck: 'lights', shoes: 'elfshoes', trail: 't_snow'},
];
outfits.forEach((look, i) => {
  const x = 860 + (i % 2) * 330;
  const y = 170 + Math.floor(i / 2) * 300;
  const tr = look.trail ? ALL_ITEMS.find(it => it.id === look.trail) : undefined;
  trailBehind(hero, tr, x, y, 64);
  drawBird(hero, {...look, eyes: look.eyes === 'laser' ? 'diamondshades' : look.eyes}, x, y, 64, {flap: 0.35, angle: 0, t: T});
});

sheet('colors', ['color'], 8);
sheet('hats', ['hat'], 8);
sheet('face', ['eyes', 'mask'], 8);
sheet('neck', ['neck', 'belt'], 7);
sheet('lower', ['pants', 'shoes'], 6);
sheet('wings', ['wings', 'trail'], 8);
(window as unknown as {__done: boolean}).__done = true;
export {SLOTS};
