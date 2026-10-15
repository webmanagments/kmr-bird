// Dev-only: every item on the bird, for checking the art. Open /sheet.html?slot=hat in the dev server.
import {drawBird} from '../game/bird';
import {ALL_ITEMS, RARITY_COLOR, SLOTS, SLOT_NAME, drawParticle, type Look} from '../game/items';

const q = new URLSearchParams(location.search);
const only = q.get('slot');
const t = Number(q.get('t') ?? 0.6);
const out = document.getElementById('out')!;
for (const slot of SLOTS) {
  if (only && slot !== only) continue;
  const h = document.createElement('h2');
  h.textContent = SLOT_NAME[slot];
  out.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'grid';
  out.appendChild(grid);
  for (const it of ALL_ITEMS.filter(i => i.slot === slot)) {
    const cell = document.createElement('div');
    cell.className = 'c';
    const c = document.createElement('canvas');
    c.width = 140;
    c.height = 130;
    const g = c.getContext('2d')!;
    const look: Look = {color: 'sunny', [slot]: it.id};
    if (it.trail) for (let i = 0; i < 9; i++) drawParticle(g, it.trail.shape, 10 + i * 6, 70 + Math.sin(i) * 16, it.trail.size * 1.2, it.trail.colors[i % it.trail.colors.length], i);
    drawBird(g, look, 78, 68, 34, {flap: 0.35, angle: 0, t});
    cell.appendChild(c);
    const l = document.createElement('div');
    l.innerHTML = `<b style="color:${RARITY_COLOR[it.rarity]}">${it.name}</b><br><span style="color:#8c9bb0">${it.rarity} · ${it.source}${it.month !== undefined ? ' m' + (it.month + 1) : ''}</span>`;
    cell.appendChild(l);
    grid.appendChild(cell);
  }
}
(window as unknown as {__done: boolean}).__done = true;
