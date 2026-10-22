// Dev-only: D-pad walkthrough of KMR Bird with assertions, against the mock leaderboard.
// Needs: ../kmr/tools/mock-db.mjs on 9199 and `vite preview --port 4195`.
// Usage: node tools/flow.mjs [base] [shotsDir]
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const [base = 'http://127.0.0.1:4195/?dev', shots] = process.argv.slice(2);
const DB = process.env.DB ?? 'http://127.0.0.1:9199';
if (shots) mkdirSync(shots, {recursive: true});
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
const page = await browser.newPage({viewport: {width: 600, height: 600}});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
let fails = 0;
const check = (n, ok, x = '') => (ok || fails++, console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x !== '' ? ` — ${x}` : ''}`));
const shot = async n => shots && (await page.screenshot({path: `${shots}/${n}.png`}));
const key = async (k, n = 1, wait = 220) => {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(k);
    await page.waitForTimeout(wait);
  }
};
const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 40) || 'none');
const clipped = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('button,[tabindex]:not([tabindex="-1"])')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[inert]') && (r.left < -1 || r.top < -1 || r.right > 601 || r.bottom > 601);
      })
      .map(el => el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 20)),
  );
const noClip = async where => {
  const c = await clipped();
  check(`Nothing cut off: ${where}`, c.length === 0, c.join(', '));
};
const text = sel => page.evaluate(s => document.querySelector(s)?.textContent ?? '', sel);
const st = () => page.evaluate(() => window.__save.get());

await fetch(`${DB}/__reset`, {method: 'POST'});

// ---- first launch: name
await page.goto(base, {waitUntil: 'load'});
await page.evaluate(db => {
  localStorage.clear();
  localStorage.setItem('kmr.dbOverride', db);
}, DB);
await page.reload({waitUntil: 'load'});
await page.waitForTimeout(600);
check('First launch asks for a name', (await text('.ns-titles h1')).includes('name'));
await noClip('name setup');
for (const ch of 'Flappy1') await page.evaluate(l => [...document.querySelectorAll('.ns-key')].find(b => b.getAttribute('aria-label') === l)?.click(), ch);
await page.waitForTimeout(700);
await page.click('.ns-join');
await page.waitForTimeout(900);
check('Joined: menu shows', (await page.locator('.play-btn').count()) === 1);
check('Starts with 500 coins and the Sunny bird', (await st()).coins === 500 && (await st()).look.color === 'sunny');

// ---- home
check('Home focuses Play', (await focused()).includes('Play'), await focused());
await noClip('home');
await shot('01-home');
await key('ArrowDown');
check('Down goes to the event chip', (await focused()).includes('limited') || (await focused()).includes('collected'), await focused());
await key('ArrowDown');
check('Down again reaches the bottom row', /Locker|Shop|Quests/.test(await focused()), await focused());
await key('ArrowUp', 2);

// ---- play: tutorial, flap, pause, crash
await key('Enter', 1, 500);
check('First game shows how to play', (await text('.tut h2')) === 'How to play');
await noClip('tutorial');
await key('Enter', 1, 400);
check('Focus on the play surface', (await focused()).startsWith('Playing'), await focused());
check('Waiting to start', (await page.evaluate(() => window.__game.state)) === 'ready');
const y0 = await page.evaluate(() => window.__game.y);
await key('Enter', 1, 60);
const after = await page.evaluate(() => ({s: window.__game.state, vy: window.__game.vy, y: window.__game.y}));
check('A pinch starts the run and flaps', after.s === 'play' && after.y < y0 + 5, JSON.stringify(after));
// One pinch = one flap even if the glasses send Enter and a click together.
await page.waitForTimeout(200);
const f0 = await page.evaluate(() => window.__game.flaps);
await page.evaluate(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
  document.activeElement.click();
});
await page.waitForTimeout(30);
check('Enter + click flap once', (await page.evaluate(() => window.__game.flaps)) === f0 + 1);
await key('Escape', 1, 300);
check('Back pauses', (await text('.pause h2')) === 'Paused');
await noClip('pause');
await key('Escape', 1, 300);
check('Back resumes', (await page.locator('.pause').count()) === 0 && !(await page.evaluate(() => window.__game.paused)));

// Bot: flap when below the next gap. Proves the physics and hitboxes allow long runs.
await page.evaluate(() => {
  const g = window.__game;
  window.__bot = setInterval(() => {
    if (g.state !== 'play') return;
    const next = g.pipes.find(p => p.x + 74 + 6 > 170);
    const target = next ? next.gap + next.size * 0.22 : 300;
    if (g.y > target && g.vy > -40) g.flap();
  }, 16);
});
await page.waitForFunction(() => window.__game.score >= 25 || window.__game.state !== 'play', null, {timeout: 90000});
const botScore = await page.evaluate(() => window.__game.score);
check('A simple bot gets through gaps (fair hitboxes)', botScore >= 10, botScore);
await shot('02-playing');
await page.evaluate(() => clearInterval(window.__bot));
await page.waitForSelector('.results', {timeout: 15000});
await page.waitForTimeout(1600);
await shot('03-results');
await noClip('results');
check('Results focus Play again', (await focused()).includes('Play again'), await focused());
check('Medal box shown', (await text('.res-medal-name')).length > 0, await text('.res-medal-name'));
const s1 = await st();
check('Coins paid: 5/point + 10/coin + medal + achievements', s1.coins >= 500 + botScore * 5, s1.coins);
check('Best saved', s1.best === botScore);
const rank = await text('.res-sub');
check('Results show a rank', /#1 of 1/.test(rank), rank);
const entry = await (await fetch(`${DB}/arcade/bird_classic/flappy1.json`)).json();
check('Best and outfit on the leaderboard', entry?.best === botScore && typeof entry?.look === 'string', JSON.stringify(entry));

// ---- shop › Permanent: buy and wear
await page.evaluate(() => window.__set({coins: 2000}));
await key('Escape', 1, 700);
check('Back from results goes home', (await page.locator('.play-btn').count()) === 1);
await page.evaluate(() => document.querySelector('[data-nav="shop"]').focus());
await key('Enter', 1, 700);
check('Shop opens on Daily', (await text('.tab.is-on')) === 'Daily', await text('.tab.is-on'));
await page.evaluate(() => document.querySelector('[data-tab="permanent"]').focus());
await page.waitForTimeout(400);
check('Permanent tab shows every item', (await page.locator('.ward-grid .tile').count()) === 9);
await noClip('permanent');
await page.evaluate(() => document.querySelector('[data-slot="hat"]').focus());
await page.waitForTimeout(300);
check('Hats slot selected', (await text('.rail-btn.is-on')) === 'Hats');
await key('ArrowRight', 1, 400);
const firstHat = await focused();
check('Right enters the grid', /Hat|Horns|Cap|Ears|Beanie/.test(firstHat), firstHat);
await key('ArrowUp', 1, 300);
check('Up from the top row goes to the Permanent tab (not another tab)', (await text('.tab.is-on')) === 'Permanent' && (await focused()) === 'Permanent', await focused());
await page.evaluate(() => document.querySelector('[data-slot="hat"]').focus());
await page.waitForTimeout(300);
await shot('04-permanent');
const redCapPage = async () => {
  for (let i = 0; i < 8 && !(await page.locator('[data-item="cap_red"]').count()); i++) {
    await page.evaluate(() => document.querySelector('.ward-grid [data-idx="6"]')?.focus());
    await key('ArrowDown', 1, 250);
  }
};
await redCapPage();
await page.evaluate(() => document.querySelector('[data-item="cap_red"]').focus());
await key('Enter', 1, 400);
check('Buying asks first', (await text('.confirm h2')).includes('Red Cap'));
await noClip('confirm');
await key('Escape', 1, 400);
check('Back closes only the popup', (await page.locator('.confirm').count()) === 0 && (await page.locator('.ward-grid').count()) === 1);
check('Focus back on the item', (await focused()).startsWith('Red Cap'), await focused());
await key('Enter', 1, 400);
await key('Enter', 1, 500);
let s2 = await st();
check('Bought and wearing Red Cap', s2.owned.includes('cap_red') && s2.look.hat === 'cap_red' && s2.coins === 2000 - 90, `${s2.coins}`);
await key('ArrowLeft', 3, 200);
check('Left from the grid returns to Hats', (await focused()) === 'Hats', await focused());
// Eggs
await page.evaluate(() => document.querySelector('[data-tab="eggs"]').focus());
await page.waitForTimeout(300);
await key('ArrowDown', 1, 300);
const eggFocus = await focused();
check('Down reaches an egg', /Egg/.test(eggFocus), eggFocus);
await page.evaluate(() => window.__set({coins: 5000}));
await page.evaluate(() => document.querySelector('[data-egg="egg"]').focus());
const owned0 = (await st()).owned.length;
await key('Enter', 1, 300);
check('Egg opening shows', (await page.locator('.reveal').count()) === 1);
await page.waitForTimeout(1800);
await shot('06-reveal');
await noClip('egg reveal');
const s3 = await st();
check('Egg gave an item (or a refund)', s3.owned.length === owned0 + 1 || s3.coins > 5000 - 300, `${s3.owned.length} ${s3.coins}`);
await key('Escape', 1, 400);
check('Back closes the reveal', (await page.locator('.reveal').count()) === 0);
await page.evaluate(() => document.querySelector('[data-tab="daily"]').focus());
await page.waitForTimeout(400);
check('Daily shop has 6 offers', (await page.locator('.offer').count()) === 6);
await noClip('daily shop');
await key('ArrowDown', 1, 300);
await key('ArrowRight', 2, 250);
await key('ArrowUp', 1, 300);
check('Up from a daily offer returns to Daily', (await text('.tab.is-on')) === 'Daily', await text('.tab.is-on'));
await page.evaluate(() => document.querySelector('[data-tab="event"]').focus());
await page.waitForTimeout(400);
check('Event tab lists this month (incl. the Invisible Horseman in October)', (await page.locator('.ev').count()) > 0);
await noClip('event tab');
await key('Escape', 1, 600);

// ---- locker: only what you own
await page.evaluate(() => document.querySelector('[data-nav="locker"]').focus());
await key('Enter', 1, 700);
check('Locker opens on Colors', (await focused()).startsWith('Colors'), await focused());
await noClip('locker');
const lockerItems = await page.evaluate(() => [...document.querySelectorAll('.lk-grid [data-item]')].map(b => b.dataset.item));
const own = (await st()).owned;
check('Locker shows only owned colors', lockerItems.length > 0 && lockerItems.every(id => own.includes(id)), lockerItems.join(','));
await page.evaluate(() => document.querySelector('[data-slot="hat"]').focus());
await page.waitForTimeout(300);
await key('ArrowDown', 1, 300);
check('Down reaches your hats', (await focused()).startsWith('Red Cap'), await focused());
await key('Enter', 1, 300);
check('Pinch takes it off', !(await st()).look.hat);
await key('Enter', 1, 300);
check('Pinch again wears it', (await st()).look.hat === 'cap_red');
await key('ArrowUp', 1, 300);
check('Up returns to the Hats slot', (await focused()).startsWith('Hats'), await focused());
await shot('07-locker');
await page.evaluate(() => [...document.querySelectorAll('.lk-actions button')][0].click());
await page.waitForTimeout(300);
const sh = (await st()).look;
check('Shuffle wears only owned items', Object.values(sh).every(id => own.includes(id) || id === 'cap_red'), JSON.stringify(sh));
await key('Escape', 1, 600);

// ---- quests: gift, login, hourly/daily
await page.evaluate(() => document.querySelector('[data-nav="quests"]').focus());
await key('Enter', 1, 700);
await noClip('quests');
await shot('08-quests');
const q0 = (await st()).coins;
await page.evaluate(() => [...document.querySelectorAll('.q-top .q-card')].find(b => b.textContent.includes('Daily login')).click());
await page.waitForTimeout(300);
check('Daily login pays 250 on day 1', (await st()).coins === q0 + 250, (await st()).coins - q0);
const qs = await page.evaluate(() => [...document.querySelectorAll('.q-card.is-quest')].length);
check('2 hourly + 3 daily quests', qs === 5, qs);
// Finish the first hourly quest (dev hook), then claim it.
const qid = await page.evaluate(() => document.querySelector('.q-card.is-quest').dataset.quest);
await page.evaluate(id => window.__set({quest: {...window.__save.get().quest, [id]: {p: 99999}}}), qid);
await page.waitForTimeout(200);
check('A finished quest shows Claim', (await page.locator(`[data-quest="${qid}"].is-ready`).count()) === 1);
const c1 = (await st()).coins;
await page.locator(`[data-quest="${qid}"]`).click();
await page.waitForTimeout(300);
const c2 = (await st()).coins;
check('Claiming a finished quest pays coins', c2 > c1, c2 - c1);
await page.locator(`[data-quest="${qid}"]`).click();
await page.waitForTimeout(300);
check('A quest pays only once', (await st()).coins === c2);
await key('Escape', 1, 600);

// ---- leaderboard
await page.evaluate(() => document.querySelector('[data-nav="board"]').focus());
await key('Enter', 1, 1200);
check('Leaderboard lists me', (await text('.row.is-me .row-name')) === 'Flappy1');
await noClip('leaderboard');
await shot('07-board');
await key('Escape', 1, 500);
check('Back home', (await page.locator('.play-btn').count()) === 1);

check('No page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
