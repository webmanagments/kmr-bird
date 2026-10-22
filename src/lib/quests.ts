// Hourly and daily quests. Everyone gets the same quests in the same hour/day (seeded by the
// server-corrected clock), progress counts up from your runs, and you claim the coins in Quests.
import {dayKey, now} from './clock';

export type QuestKind = 'score' | 'gaps' | 'coins' | 'games' | 'flaps' | 'medal' | 'egg';
export interface Quest {
  id: string; // period key + slot, e.g. "d:2026-10-21:0"
  period: 'hour' | 'day';
  kind: QuestKind;
  target: number;
  reward: number;
  text: string;
}

const MEDAL_NAMES = ['', 'Bronze', 'Silver', 'Gold', 'Platinum'];
const TEMPLATES: Record<'hour' | 'day', {kind: QuestKind; targets: number[]; reward: [number, number]}[]> = {
  hour: [
    {kind: 'score', targets: [5, 8, 10, 12], reward: [150, 300]},
    {kind: 'gaps', targets: [15, 25, 35], reward: [150, 300]},
    {kind: 'coins', targets: [3, 5, 8], reward: [150, 250]},
    {kind: 'games', targets: [3, 4, 5], reward: [120, 220]},
    {kind: 'flaps', targets: [150, 250, 400], reward: [120, 220]},
  ],
  day: [
    {kind: 'score', targets: [15, 20, 25, 30], reward: [600, 1200]},
    {kind: 'gaps', targets: [80, 120, 180], reward: [600, 1100]},
    {kind: 'coins', targets: [15, 25, 40], reward: [600, 1000]},
    {kind: 'games', targets: [10, 15, 20], reward: [500, 900]},
    {kind: 'flaps', targets: [800, 1500, 2500], reward: [500, 900]},
    {kind: 'medal', targets: [1, 2, 3], reward: [700, 1400]},
    {kind: 'egg', targets: [1, 2], reward: [500, 800]},
  ],
};
export const DAILY_ALL_BONUS = 1000;

function text(kind: QuestKind, n: number): string {
  switch (kind) {
    case 'score':
      return `Score ${n} in one run`;
    case 'gaps':
      return `Fly through ${n} gaps`;
    case 'coins':
      return `Grab ${n} coins in the gaps`;
    case 'games':
      return `Play ${n} games`;
    case 'flaps':
      return `Flap ${n.toLocaleString()} times`;
    case 'medal':
      return `Earn a ${MEDAL_NAMES[n]} medal or better`;
    case 'egg':
      return n === 1 ? 'Open a Mystery Egg' : `Open ${n} Mystery Eggs`;
  }
}

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

export const hourKey = (t = now()) => new Date(t).toISOString().slice(0, 13);
export const msToNextHour = (t = now()) => 3600000 - (t % 3600000);

function build(period: 'hour' | 'day', key: string, count: number): Quest[] {
  const rnd = seeded(`kmr-bird-quests-${key}`);
  const pool = [...TEMPLATES[period]];
  const out: Quest[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const ti = Math.floor(rnd() * t.targets.length);
    const target = t.targets[ti];
    const k = t.targets.length > 1 ? ti / (t.targets.length - 1) : 0.5;
    const reward = Math.round((t.reward[0] + (t.reward[1] - t.reward[0]) * k) / 10) * 10;
    out.push({id: `${period[0]}:${key}:${i}`, period, kind: t.kind, target, reward, text: text(t.kind, target)});
  }
  return out;
}

export const hourlyQuests = () => build('hour', hourKey(), 2);
export const dailyQuests = () => build('day', dayKey(), 3);
export const allQuests = () => [...hourlyQuests(), ...dailyQuests()];
