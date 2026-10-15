// Monthly events: each month dresses up the world and opens its own limited items.
import type {TrailShape} from './items';

export interface Theme {
  month: number;
  event: string; // shown in the shop
  short: string;
  accent: string;
  pipe: [string, string]; // body gradient
  cap: [string, string];
  stripe?: string; // candy-cane style stripes on pipes
  capTop?: 'snow' | 'pumpkin' | 'leaves' | 'heart' | 'clover' | 'flower' | 'star';
  moon: string;
  sky: [string, string]; // faint gradient at the top (kept dark for the glasses)
  city: string; // skyline window lights
  ground: [string, string];
  drift?: {shape: TrailShape; colors: string[]; n: number; fall: number; size: number};
}

const base = {
  pipe: ['#2fdc5a', '#16903a'] as [string, string],
  cap: ['#5cff85', '#1fae48'] as [string, string],
  moon: '#f4f0d8',
  sky: ['#06102a', '#000000'] as [string, string],
  city: '#ffd76a',
  ground: ['#3a2a1a', '#2a6a2a'] as [string, string],
};

export const THEMES: Theme[] = [
  {month: 0, event: 'New Year', short: 'NEW YEAR', accent: '#ffc531', ...base, pipe: ['#ffd65a', '#c8901a'], cap: ['#fff0a0', '#e0a820'], capTop: 'star', drift: {shape: 'confetti', colors: ['#ff3b5c', '#ffd23f', '#3fa9ff', '#39ff88'], n: 26, fall: 50, size: 6}},
  {month: 1, event: "Valentine's", short: 'LOVE', accent: '#ff4f9a', ...base, pipe: ['#ff7ab8', '#d8407f'], cap: ['#ffb0d6', '#e8508f'], capTop: 'heart', drift: {shape: 'heart', colors: ['#ff2d6a', '#ff9ac0'], n: 14, fall: -20, size: 9}},
  {month: 2, event: 'Lucky March', short: 'LUCKY', accent: '#39d85a', ...base, pipe: ['#39d85a', '#1f8f34'], cap: ['#ffd65a', '#c8901a'], capTop: 'clover', drift: {shape: 'clover', colors: ['#2fbf4a', '#39d85a'], n: 12, fall: 40, size: 10}},
  {month: 3, event: 'Spring Hunt', short: 'SPRING', accent: '#ff9ad0', ...base, pipe: ['#b8e6ff', '#7ab8e0'], cap: ['#ffc2e0', '#e88ab8'], capTop: 'flower', drift: {shape: 'petal', colors: ['#ffc2dc', '#ffffff'], n: 18, fall: 40, size: 7}},
  {month: 4, event: 'Blossom Season', short: 'BLOSSOM', accent: '#ffb0d0', ...base, pipe: ['#c08a6a', '#7a5238'], cap: ['#ffc2dc', '#ff8ab8'], capTop: 'flower', drift: {shape: 'petal', colors: ['#ffc2dc', '#ffe0ee'], n: 22, fall: 45, size: 7}},
  {month: 5, event: 'Summer Kickoff', short: 'SUMMER', accent: '#ff9a2a', ...base, pipe: ['#ff9a3d', '#d8601a'], cap: ['#ffd23f', '#e8a512'], sky: ['#2a0a20', '#000000'], moon: '#ffb23d'},
  {month: 6, event: 'Fireworks', short: 'FIREWORKS', accent: '#3fa9ff', ...base, pipe: ['#ffffff', '#c8d0dc'], cap: ['#3a6ad8', '#1a3a9a'], stripe: '#e8102e', capTop: 'star', drift: {shape: 'spark', colors: ['#ff3b5c', '#ffffff', '#3fa9ff'], n: 20, fall: 30, size: 6}},
  {month: 7, event: 'Beach Days', short: 'BEACH', accent: '#3ad0ff', ...base, pipe: ['#3ad0ff', '#1a8ab8'], cap: ['#ffe3a8', '#e8b86a'], ground: ['#e8c87a', '#c8a050'], drift: {shape: 'bubble', colors: ['#9fe0ff'], n: 12, fall: -30, size: 8}},
  {month: 8, event: 'Harvest', short: 'HARVEST', accent: '#ffb23d', ...base, pipe: ['#c8841a', '#8a5418'], cap: ['#ffc23d', '#d8841a'], moon: '#ffb23d', capTop: 'leaves', drift: {shape: 'leaf', colors: ['#e8641a', '#ffb23d'], n: 12, fall: 45, size: 10}},
  {
    month: 9,
    event: 'Halloween',
    short: 'HALLOWEEN',
    accent: '#ff8a1a',
    pipe: ['#5a2a8a', '#2a1240'],
    cap: ['#ff8a1a', '#c85a0a'],
    capTop: 'pumpkin',
    moon: '#ffb23d',
    sky: ['#1a0a24', '#000000'],
    city: '#ff8a1a',
    ground: ['#1a1018', '#3a1a4a'],
    drift: {shape: 'bat', colors: ['#3a2050', '#5a3a7a'], n: 8, fall: -12, size: 16},
  },
  {
    month: 10,
    event: 'Thanksgiving',
    short: 'THANKSGIVING',
    accent: '#e8641a',
    pipe: ['#a8642a', '#6a3a14'],
    cap: ['#e8641a', '#a8320f'],
    capTop: 'leaves',
    moon: '#ffc27a',
    sky: ['#1a0e06', '#000000'],
    city: '#ffb23d',
    ground: ['#4a2a12', '#8a4a1a'],
    drift: {shape: 'leaf', colors: ['#e8641a', '#ffb23d', '#c8301a'], n: 16, fall: 55, size: 11},
  },
  {
    month: 11,
    event: 'Christmas',
    short: 'CHRISTMAS',
    accent: '#e8102e',
    pipe: ['#ffffff', '#d8e0ea'],
    cap: ['#2fbf4a', '#1f8f34'],
    stripe: '#e8102e',
    capTop: 'snow',
    moon: '#e6f6ff',
    sky: ['#06122a', '#000000'],
    city: '#ffd76a',
    ground: ['#e8f4ff', '#a8c8e8'],
    drift: {shape: 'snow', colors: ['#ffffff', '#cfeeff'], n: 30, fall: 40, size: 9},
  },
];

/** The current month, from the server clock when we have it (so changing the device clock doesn't open events). */
export const themeFor = (now: number) => THEMES[new Date(now).getMonth()];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
