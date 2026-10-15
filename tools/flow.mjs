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
check('Starts with 150 coins and the Sunny bird', (await st()).coins === 150 && (await st()).look.color === 'sunny');

// ---- home
check('Home focuses Play', (await focused()).includes('Play'), await focused());
await noClip('home');
await shot('01-home');
await key('ArrowDown');
check('Down goes to the event chip', (await focused()).includes('limited') || (await focused()).includes('collected'), await focused());
await key('ArrowDown');
check('Down again reaches the bottom row', /Wardrobe|Shop/.test(await focused()), await focused());
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
check('Coins paid: 2/point + grabs + medal + achievements', s1.coins > 150 + botScore * 2, s1.coins);
check('Best saved', s1.best === botScore);
const rank = await text('.res-sub');
check('Results show a rank', /#1 of 1/.test(rank), rank);
const entry = await (await fetch(`${DB}/arcade/bird_classic/flappy1.json`)).json();
check('Best and outfit on the leaderboard', entry?.best === botScore && typeof entry?.look === 'string', JSON.stringify(entry));

// ---- wardrobe: buy and wear
await page.evaluate(() => window.__set({coins: 2000}));
await key('Escape', 1, 700);
check('Back from results goes home', (await page.locator('.play-btn').count()) === 1);
await page.evaluate(() => document.querySelector('[data-nav="wardrobe"]').focus());
await key('Enter', 1, 700);
check('Wardrobe opens on Colors', (await focused()) === 'Colors', await focused());
await noClip('wardrobe');
await key('ArrowDown');
check('Down to Hats switches the slot', (await text('.rail-btn.is-on')) === 'Hats');
await key('ArrowRight', 1, 400);
const firstHat = await focused();
check('Right enters the grid', /Hat|Horns|Cap|Ears|Beanie/.test(firstHat), firstHat);
await shot('04-wardrobe');
// Find Red Cap on the first page and buy it.
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
await key('Enter', 1, 300);
s2 = await st();
check('Pinch again takes it off', !s2.look.hat);
await key('Enter', 1, 300);
// Page down past the last row
for (let i = 0; i < 5; i++) await key('ArrowDown', 1, 200);
check('Swiping down past the bottom turns the page', (await text('.ward-pager')).includes('Page 2'), await text('.ward-pager'));
await noClip('wardrobe page 2');
await key('ArrowLeft', 3, 200);
check('Left from the grid returns to Hats', (await focused()) === 'Hats', await focused());
// Locked items can't be bought
await page.evaluate(() => document.querySelector('[data-slot="color"]').focus());
await page.waitForTimeout(300);
await key('Escape', 1, 600);

// ---- shop: chest, daily, eggs
await page.evaluate(() => document.querySelector('[data-nav="shop"]').focus());
await key('Enter', 1, 700);
check('Shop opens on the chest when it is ready', (await text('.tab.is-on')) === 'Chest', await text('.tab.is-on'));
await noClip('shop chest');
const c0 = (await st()).coins;
await page.click('.chest-btn');
await page.waitForTimeout(400);
check('Chest pays day 1 (60)', (await st()).coins === c0 + 60);
check('Chest can only be claimed once a day', (await page.locator('.chest-btn[disabled]').count()) === 1);
await page.evaluate(() => document.querySelector('[data-tab="daily"]').focus());
await page.waitForTimeout(400);
check('Daily shop has 6 offers', (await page.locator('.offer').count()) === 6);
await noClip('daily shop');
await shot('05-daily');
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
check('Egg cost 300', s3.coins <= 5000 - 300 + 3000);
await key('Escape', 1, 400);
check('Back closes the reveal', (await page.locator('.reveal').count()) === 0);
await page.evaluate(() => document.querySelector('[data-tab="event"]').focus());
await page.waitForTimeout(400);
check('Event tab lists this month', (await page.locator('.ev').count()) > 0);
await noClip('event tab');
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
