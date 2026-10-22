// KMR Bird progress on this device: coins, wardrobe, bests, achievements, daily chest.
import {useSyncExternalStore} from 'react';
import {COIN_VALUE, MEDALS, type Medal, type RunResult} from '../game/engine';
import {ALL_ITEMS, itemById, STARTER_LOOK, type Item, type Look, type Rarity, type Slot} from '../game/items';
import {THEMES} from '../game/season';
import {dayKey, now} from './clock';
import {allQuests, DAILY_ALL_BONUS, dailyQuests, type Quest, type QuestKind} from './quests';

const KEY = 'kmr.bird.v1';
/** Coins per point scored. */
export const SCORE_COINS = 5;

export interface BirdSave {
  coins: number;
  owned: string[];
  look: Look;
  best: number;
  sent: number; // best score the leaderboard has accepted
  games: number;
  totalScore: number;
  totalFlaps: number;
  totalCoins: number; // coins grabbed in runs
  medals: Partial<Record<Medal['id'], number>>;
  achieved: string[];
  chest: {last: string; streak: number};
  eggs: number;
  fresh: string[];
  bought: Record<string, string>; // daily-shop purchases: id → day
  quest: Record<string, {p: number; c?: boolean}>; // progress on the current hourly/daily quests
  bonusDays: string[]; // days whose "all daily quests" bonus was claimed
  gifts: string[]; // one-time gifts already claimed
  sound: boolean;
  seenTutorial: boolean;
}

const initial = (): BirdSave => ({
  coins: 500,
  owned: ['sunny'],
  look: {...STARTER_LOOK},
  best: 0,
  sent: 0,
  games: 0,
  totalScore: 0,
  totalFlaps: 0,
  totalCoins: 0,
  medals: {},
  achieved: [],
  chest: {last: '', streak: 0},
  eggs: 0,
  fresh: [],
  bought: {},
  quest: {},
  bonusDays: [],
  gifts: ['update1'], // new players start with the bigger starting balance instead
  sound: true,
  seenTutorial: false,
});

function load(): BirdSave {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return initial();
    const v = JSON.parse(s) as Partial<BirdSave>;
    const base = initial();
    const owned = Array.from(new Set(['sunny', ...(v.owned ?? [])])).filter(id => itemById(id));
    const look: Look = {};
    for (const [slot, id] of Object.entries(v.look ?? base.look)) if (id && owned.includes(id) && itemById(id)?.slot === slot) look[slot as Slot] = id;
    if (!look.color) look.color = 'sunny';
    return {...base, ...v, owned, look, chest: {...base.chest, ...v.chest}, medals: {...v.medals}, bought: {...v.bought}, quest: {...v.quest}, bonusDays: v.bonusDays ?? [], gifts: v.gifts ?? []};
  } catch {
    return initial();
  }
}

let state = load();
const listeners = new Set<() => void>();
function set(next: BirdSave) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: keep playing */
  }
  listeners.forEach(l => l());
}

// ---- achievements ---------------------------------------------------------------------------
export interface Achievement {
  id: string;
  text: string;
  coins: number;
  test: (s: BirdSave) => boolean;
}
export const ACHIEVEMENTS: Achievement[] = [
  {id: 'first', text: 'Score your first point', coins: 50, test: s => s.best >= 1},
  {id: 'score10', text: 'Score 10 in one run', coins: 100, test: s => s.best >= 10},
  {id: 'games10', text: 'Play 10 games', coins: 100, test: s => s.games >= 10},
  {id: 'score25', text: 'Score 25 in one run', coins: 200, test: s => s.best >= 25},
  {id: 'gold', text: 'Earn a Gold medal', coins: 300, test: s => (s.medals.gold ?? 0) + (s.medals.platinum ?? 0) + (s.medals.diamond ?? 0) + (s.medals.kmr ?? 0) > 0},
  {id: 'games50', text: 'Play 50 games', coins: 300, test: s => s.games >= 50},
  {id: 'score50', text: 'Score 50 in one run', coins: 500, test: s => s.best >= 50},
  {id: 'platinum', text: 'Earn a Platinum medal', coins: 500, test: s => (s.medals.platinum ?? 0) + (s.medals.diamond ?? 0) + (s.medals.kmr ?? 0) > 0},
  {id: 'coins100', text: 'Grab 100 coins in runs', coins: 300, test: s => s.totalCoins >= 100},
  {id: 'score100', text: 'Score 100 in one run', coins: 1500, test: s => s.best >= 100},
  {id: 'games250', text: 'Play 250 games', coins: 1000, test: s => s.games >= 250},
  {id: 'flaps10k', text: 'Flap 10,000 times', coins: 800, test: s => s.totalFlaps >= 10000},
  {id: 'collector', text: 'Own 50 items', coins: 1000, test: s => s.owned.length >= 50},
];
export const achievementItems = (id: string) => ALL_ITEMS.filter(i => i.source === 'achieve' && (i.achieve === id || (id === 'score100' && i.achieve === 'score100b')));

// ---- daily chest ----------------------------------------------------------------------------
export const CHEST_REWARDS = [250, 350, 450, 600, 800, 1000, 1500];
export function chestStatus(s: BirdSave = state) {
  const today = dayKey();
  const yesterday = dayKey(now() - 86400000);
  const ready = s.chest.last !== today;
  const day = ready ? (s.chest.last === yesterday ? (s.chest.streak % 7) + 1 : 1) : s.chest.streak;
  return {ready, day, coins: CHEST_REWARDS[day - 1], egg: day === 7};
}

// ---- eggs -----------------------------------------------------------------------------------
export interface EggKind {
  id: 'egg' | 'golden';
  name: string;
  price: number;
  odds: Partial<Record<Rarity, number>>;
}
export const EGGS: EggKind[] = [
  {id: 'egg', name: 'Mystery Egg', price: 300, odds: {Common: 50, Rare: 31, Epic: 14, Legendary: 4.4, Mythic: 0.6}},
  {id: 'golden', name: 'Golden Egg', price: 1500, odds: {Rare: 42, Epic: 38, Legendary: 16, Mythic: 4}},
];
export const eggPool = (r: Rarity) => ALL_ITEMS.filter(i => (i.source === 'shop' || i.source === 'egg') && i.rarity === r);
export const refundFor = (it: Item) => Math.max(30, Math.round((it.price * 0.4) / 10) * 10);

function rollEgg(kind: EggKind): Item {
  const entries = Object.entries(kind.odds) as [Rarity, number][];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  for (let tries = 0; tries < 8; tries++) {
    let r = Math.random() * total;
    let rar: Rarity = entries[0][0];
    for (const [k, w] of entries) {
      r -= w;
      if (r < 0) {
        rar = k;
        break;
      }
    }
    const pool = eggPool(rar);
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  }
  return eggPool('Common')[0];
}

// ---- daily shop: the same six items for everyone each (UTC) day -----------------------------
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Chance per featured slot of each rarity in the daily shop. Secrets are about 1 in 125 per slot. */
export const DAILY_ODDS: Partial<Record<Rarity, number>> = {Legendary: 64, Mythic: 35.2, Secret: 0.8};
export interface DailyOffer {
  item: Item;
  price: number;
  deal: boolean;
}
export function dailyShop(day = dayKey()): DailyOffer[] {
  const rnd = seeded(`kmr-bird-daily-${day}`);
  const exclusive = ALL_ITEMS.filter(i => i.source === 'daily');
  const out: DailyOffer[] = [];
  const pick = (pool: Item[]) => pool.filter(i => !out.some(o => o.item.id === i.id));
  for (let slot = 0; slot < 4; slot++) {
    let r = rnd() * 100;
    let rar: Rarity = 'Legendary';
    for (const [k, w] of Object.entries(DAILY_ODDS) as [Rarity, number][]) {
      r -= w;
      if (r < 0) {
        rar = k;
        break;
      }
    }
    let pool = pick(exclusive.filter(i => i.rarity === rar));
    if (!pool.length) pool = pick(exclusive);
    const it = pool[Math.floor(rnd() * pool.length)];
    if (it) out.push({item: it, price: it.price, deal: false});
  }
  // Two deals on regular items, 30% off.
  const regular = ALL_ITEMS.filter(i => i.source === 'shop' && i.rarity !== 'Common');
  for (let k = 0; k < 2; k++) {
    const pool = pick(regular);
    const it = pool[Math.floor(rnd() * pool.length)];
    if (it) out.push({item: it, price: Math.round((it.price * 0.7) / 10) * 10, deal: true});
  }
  return out;
}

// ---- events ---------------------------------------------------------------------------------
export const currentTheme = () => THEMES[new Date(now()).getMonth()];
export const eventItems = (month = new Date(now()).getMonth()) => ALL_ITEMS.filter(i => i.source === 'event' && i.month === month);

/** Can this item be bought right now, and where from? */
export function availability(it: Item, s: BirdSave = state): {how: 'owned' | 'buy' | 'daily' | 'event' | 'egg' | 'achieve' | 'gone'; price?: number; text: string} {
  if (s.owned.includes(it.id)) return {how: 'owned', text: 'Owned'};
  switch (it.source) {
    case 'starter':
    case 'shop':
      return {how: 'buy', price: it.price, text: it.price.toLocaleString()};
    case 'egg':
      return {how: 'egg', text: 'Mystery Egg'};
    case 'achieve': {
      const a = ACHIEVEMENTS.find(x => x.id === it.achieve || (it.achieve === 'score100b' && x.id === 'score100'));
      return {how: 'achieve', text: a?.text ?? 'Achievement'};
    }
    case 'daily': {
      const offer = dailyShop().find(o => o.item.id === it.id);
      return offer ? {how: 'daily', price: offer.price, text: 'In the Daily Shop now!'} : {how: 'gone', text: 'Daily Shop exclusive'};
    }
    case 'event': {
      const m = new Date(now()).getMonth();
      const th = THEMES[it.month ?? 0];
      return it.month === m ? {how: 'event', price: it.price, text: `${th.event} event`} : {how: 'gone', text: `${th.event} only (back next ${monthName(it.month ?? 0)})`};
    }
  }
}
const monthName = (m: number) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m];

export interface Reward {
  result: RunResult;
  coins: number;
  scoreCoins: number;
  grabCoins: number;
  medalCoins: number;
  prevBest: number;
  newBest: boolean;
  unlocked: Item[];
  achievements: Achievement[];
  questsDone: Quest[];
}

// ---- quests ---------------------------------------------------------------------------------
const MEDAL_RANK: Record<string, number> = {bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5, kmr: 6};
function bumpQuests(prev: BirdSave['quest'], ev: {run?: RunResult; kind?: QuestKind; add?: number}): BirdSave['quest'] {
  const out: BirdSave['quest'] = {};
  for (const q of allQuests()) {
    const cur = prev[q.id] ?? {p: 0};
    let p = cur.p;
    const r = ev.run;
    if (r)
      switch (q.kind) {
        case 'score':
          p = Math.max(p, r.score);
          break;
        case 'gaps':
          p += r.score;
          break;
        case 'coins':
          p += r.coins;
          break;
        case 'games':
          p += 1;
          break;
        case 'flaps':
          p += r.flaps;
          break;
        case 'medal':
          p = Math.max(p, r.medal ? MEDAL_RANK[r.medal.id] : 0);
          break;
      }
    else if (ev.kind === q.kind) p += ev.add ?? 1;
    out[q.id] = {...cur, p};
  }
  return out; // quests from past hours/days drop off here
}
export const questProgress = (q: Quest, s: BirdSave = state) => s.quest[q.id] ?? {p: 0};
export function claimableQuests(s: BirdSave = state): number {
  const qs = allQuests().filter(q => {
    const st = s.quest[q.id];
    return st && st.p >= q.target && !st.c;
  }).length;
  const daily = dailyQuests();
  const bonus = daily.every(q => s.quest[q.id]?.c) && !s.bonusDays.includes(dayKey()) ? 1 : 0;
  return qs + bonus + (s.gifts.includes(UPDATE_GIFT.id) ? 0 : 1);
}
export const UPDATE_GIFT = {id: 'update1', coins: 2000, text: 'Thanks for playing! Coins are easier to earn now.'};

export const save = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  setSound(sound: boolean) {
    set({...state, sound});
  },
  seenTutorial() {
    if (!state.seenTutorial) set({...state, seenTutorial: true});
  },
  seenFresh() {
    if (state.fresh.length) set({...state, fresh: []});
  },
  equip(it: Item) {
    if (!state.owned.includes(it.id)) return;
    const look = {...state.look};
    if (look[it.slot] === it.id && it.slot !== 'color') delete look[it.slot];
    else look[it.slot] = it.id;
    set({...state, look});
  },
  /** Wear a whole outfit at once (only items you own). */
  setLook(look: Look) {
    const next: Look = {};
    for (const [slot, id] of Object.entries(look)) if (id && state.owned.includes(id) && itemById(id)?.slot === slot) next[slot as Slot] = id;
    next.color ??= state.look.color ?? 'sunny';
    set({...state, look: next});
  },
  unequip(slot: Slot) {
    if (slot === 'color') return;
    const look = {...state.look};
    delete look[slot];
    set({...state, look});
  },
  /** Buy an item for coins (wardrobe, event, or today's daily shop). */
  buy(it: Item): boolean {
    const a = availability(it);
    if (a.price === undefined || !['buy', 'daily', 'event'].includes(a.how) || state.coins < a.price) return false;
    set({
      ...state,
      coins: state.coins - a.price,
      owned: [...state.owned, it.id],
      look: {...state.look, [it.slot]: it.id},
      bought: a.how === 'daily' ? {...state.bought, [it.id]: dayKey()} : state.bought,
    });
    return true;
  },
  openEgg(kind: EggKind, free = false): {item: Item; dupe: boolean; refund: number} | null {
    if (!free && state.coins < kind.price) return null;
    const item = rollEgg(kind);
    const dupe = state.owned.includes(item.id);
    const refund = dupe ? refundFor(item) : 0;
    set({
      ...state,
      coins: state.coins - (free ? 0 : kind.price) + refund,
      owned: dupe ? state.owned : [...state.owned, item.id],
      fresh: dupe ? state.fresh : [...state.fresh, item.id],
      eggs: state.eggs + 1,
      quest: bumpQuests(state.quest, {kind: 'egg', add: 1}),
    });
    return {item, dupe, refund};
  },
  claimChest(): {coins: number; egg: boolean} | null {
    const c = chestStatus();
    if (!c.ready) return null;
    set({...state, coins: state.coins + c.coins, chest: {last: dayKey(), streak: c.day}});
    return {coins: c.coins, egg: c.egg};
  },
  finishRun(r: RunResult): Reward {
    const s = state;
    const scoreCoins = r.score * SCORE_COINS;
    const grabCoins = r.coins * COIN_VALUE;
    const medalCoins = r.medal?.bonus ?? 0;
    const coins = scoreCoins + grabCoins + medalCoins;
    const medals = {...s.medals};
    if (r.medal) medals[r.medal.id] = (medals[r.medal.id] ?? 0) + 1;
    const next: BirdSave = {
      ...s,
      coins: s.coins + coins,
      best: Math.max(s.best, r.score),
      games: s.games + 1,
      totalScore: s.totalScore + r.score,
      totalFlaps: s.totalFlaps + r.flaps,
      totalCoins: s.totalCoins + r.coins,
      medals,
      quest: bumpQuests(s.quest, {run: r}),
    };
    const done = ACHIEVEMENTS.filter(a => !next.achieved.includes(a.id) && a.test(next));
    const unlocked: Item[] = [];
    for (const a of done) {
      next.coins += a.coins;
      next.achieved = [...next.achieved, a.id];
      for (const it of achievementItems(a.id)) if (!next.owned.includes(it.id)) unlocked.push(it);
    }
    next.owned = [...next.owned, ...unlocked.map(i => i.id)];
    next.fresh = [...next.fresh, ...unlocked.map(i => i.id)];
    set(next);
    const questsDone = allQuests().filter(q => (s.quest[q.id]?.p ?? 0) < q.target && (next.quest[q.id]?.p ?? 0) >= q.target);
    return {result: r, coins, scoreCoins, grabCoins, medalCoins, prevBest: s.best, newBest: r.score > s.best, unlocked, achievements: done, questsDone};
  },
  claimQuest(q: Quest): boolean {
    const st = state.quest[q.id];
    if (!st || st.c || st.p < q.target) return false;
    set({...state, coins: state.coins + q.reward, quest: {...state.quest, [q.id]: {...st, c: true}}});
    return true;
  },
  claimDailyBonus(): boolean {
    const day = dayKey();
    if (state.bonusDays.includes(day) || !dailyQuests().every(q => state.quest[q.id]?.c)) return false;
    set({...state, coins: state.coins + DAILY_ALL_BONUS, bonusDays: [...state.bonusDays.slice(-6), day]});
    return true;
  },
  claimGift(): boolean {
    if (state.gifts.includes(UPDATE_GIFT.id)) return false;
    set({...state, coins: state.coins + UPDATE_GIFT.coins, gifts: [...state.gifts, UPDATE_GIFT.id]});
    return true;
  },
  markSent(best: number) {
    if (state.sent < best) set({...state, sent: best});
  },
  resetSent() {
    set({...state, sent: 0});
  },
};

export const MEDAL_LIST = MEDALS;

export function useSave(): BirdSave {
  return useSyncExternalStore(save.subscribe, () => state, () => state);
}

if (/[?&]dev\b/.test(location.search)) (window as unknown as {__save: typeof save; __set: (p: Partial<BirdSave>) => void}).__save = save;
if (/[?&]dev\b/.test(location.search)) (window as unknown as {__set: (p: Partial<BirdSave>) => void}).__set = p => set({...state, ...p});
