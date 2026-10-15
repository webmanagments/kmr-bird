// Global leaderboards, shared with the KMR Casino's Firebase database.
//
//   owners/<name>                 the device key that owns a name (write-once, unreadable)
//   stamp/<name>                  {k, t}: rewritten with every update to prove ownership
//   board/<name>                  casino stats (read only here, to see if a name is in use)
//   arcade/bird_classic/<name>    {name, best, games, skin, look, updated}
//
// A name picked in the casino works here too, and the other way round.
import {encodeLook} from '../game/items';
import {learnServerTime} from './clock';
import {leaderboardEnabled, request, TIMESTAMP} from './db';
import {profile} from './profile';
import {save} from './save';

export {leaderboardEnabled};

export const BOARD = 'bird_classic';

export interface ArcadeEntry {
  name: string;
  best: number;
  games: number;
  skin: string;
  look?: string;
  updated: number;
}

export type NameStatus = 'free' | 'taken' | 'offline';

async function exists(path: string): Promise<boolean | null> {
  try {
    const r = await request(`${path}.json`);
    if (r.status === 401 || r.status === 403) return false; // not readable (rules not set up yet)
    if (!r.ok) return null;
    return (await r.json()) !== null;
  } catch {
    return null;
  }
}

/** Is this name already somebody's (on the casino board or any snake board)? */
export async function checkName(name: string): Promise<NameStatus> {
  if (!leaderboardEnabled()) return 'free';
  const key = name.toLowerCase();
  const found = await Promise.all(['board', 'arcade/snake_classic', 'arcade/snake_portal', 'arcade/snake_maze', `arcade/${BOARD}`].map(b => exists(`${b}/${key}/name`)));
  if (found.some(f => f === true)) return 'taken';
  if (found[0] === null) return 'offline';
  return 'free';
}

async function patch(body: Record<string, unknown>, keepalive = false): Promise<Response | null> {
  try {
    const r = await request('.json', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, keepalive, body: JSON.stringify(body)});
    if (r.ok && !keepalive) void learnFrom(r.clone());
    return r;
  } catch {
    return null;
  }
}

/** The database echoes what it wrote, with server timestamps filled in: that's the server's clock. */
async function learnFrom(r: Response) {
  try {
    const data = (await r.json()) as Record<string, unknown>;
    for (const v of Object.values(data ?? {})) {
      const t = (v as {t?: unknown; updated?: unknown})?.t ?? (v as {updated?: unknown})?.updated;
      if (typeof t === 'number') return learnServerTime(t);
    }
  } catch {
    /* ignore */
  }
}

/** Prove we own `name` (works only if this device's key is the one on file). */
async function stampOnly(name: string): Promise<boolean> {
  const p = profile.get();
  const r = await patch({[`stamp/${name.toLowerCase()}`]: {k: p.secret, t: TIMESTAMP}});
  return !!r?.ok;
}

export type ClaimResult = 'ok' | 'taken' | 'offline';

/** Claim a name for this device. Atomic: the database refuses if anyone already owns it. */
export async function claimName(name: string): Promise<ClaimResult> {
  if (!leaderboardEnabled()) return 'offline';
  const key = name.toLowerCase();
  const secret = profile.get().secret;
  const r = await patch({[`owners/${key}`]: secret, [`stamp/${key}`]: {k: secret, t: TIMESTAMP}});
  if (!r) return 'offline';
  if (r.ok) return 'ok';
  if (r.status === 401 || r.status === 403) {
    // Already owned: by us (a claim whose reply got lost, or the casino on these glasses) or by someone else.
    return (await stampOnly(name)) ? 'ok' : 'taken';
  }
  return 'offline';
}

function entry() {
  const s = save.get();
  return {name: profile.get().name ?? '', best: s.best, games: s.games, skin: (s.look.color ?? 'sunny').slice(0, 16), look: encodeLook(s.look).slice(0, 24), updated: TIMESTAMP};
}

let lookSent = '';
/** Send the best score (and the bird's look) when the leaderboard hasn't seen it. */
async function pushBest(keepalive = false, force = false): Promise<boolean> {
  const p = profile.get();
  const s = save.get();
  const look = encodeLook(s.look);
  if (!p.name || !p.claimed || s.best <= 0 || (!force && s.best <= s.sent && look === lookSent)) return true;
  const key = p.name.toLowerCase();
  const e = entry();
  const r = await patch({[`stamp/${key}`]: {k: p.secret, t: TIMESTAMP}, [`arcade/${BOARD}/${key}`]: e}, keepalive);
  if (!r?.ok) return false;
  save.markSent(e.best);
  lookSent = look;
  return true;
}

/** Learn the server's time (for the daily shop) with a harmless ownership stamp. */
async function syncClock() {
  const p = profile.get();
  if (p.name && p.claimed) await stampOnly(p.name);
}

/** The board's rows, best first; 'closed' if the database doesn't allow arcade boards yet; null when offline. */
export async function fetchBoard(): Promise<ArcadeEntry[] | 'closed' | null> {
  if (!leaderboardEnabled()) return null;
  try {
    let r = await request(`arcade/${BOARD}.json?orderBy=${encodeURIComponent('"best"')}&limitToLast=200`, undefined, 10000);
    if (r.status === 400) r = await request(`arcade/${BOARD}.json`, undefined, 10000); // index not set up yet
    if (r.status === 401 || r.status === 403) return 'closed';
    if (!r.ok) return null;
    const data = (await r.json()) as Record<string, ArcadeEntry> | null;
    return Object.values(data ?? {})
      .filter(e => e && typeof e.name === 'string' && typeof e.best === 'number' && e.best > 0)
      .sort((a, b) => b.best - a.best || a.updated - b.updated);
  } catch {
    return null;
  }
}

// ---- Background sync ----------------------------------------------------------
let timer: ReturnType<typeof setTimeout> | null = null;
let busy = false;
let clocked = false;
const waiters: (() => void)[] = [];

async function sync() {
  timer = null;
  if (busy) return;
  const p = profile.get();
  if (!p.name || !leaderboardEnabled()) return;
  busy = true;
  try {
    if (!p.claimed) {
      // A name chosen while offline, or one from the casino that was never confirmed.
      const res = await claimName(p.name);
      if (res === 'ok') profile.markClaimed();
      else if (res === 'taken') {
        profile.nameTaken();
        return;
      } else return schedule(30000);
    }
    if (!clocked) {
      clocked = true;
      await syncClock();
    }
    if (!(await pushBest())) schedule(30000);
  } finally {
    busy = false;
    waiters.splice(0).forEach(w => w());
  }
}

function schedule(delay = 1200) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void sync(), delay);
}

/** Send a finished run's best now and wait (up to a few seconds) so the results can show a rank. */
export function syncNow(): Promise<void> {
  return new Promise(resolve => {
    waiters.push(resolve);
    schedule(0);
    setTimeout(resolve, 6000);
  });
}

let started = false;
export function startSync() {
  if (started || !leaderboardEnabled()) return;
  started = true;
  let name = profile.get().name;
  profile.subscribe(() => {
    const p = profile.get();
    if (p.name !== name) {
      name = p.name;
      save.resetSent(); // a new name: put this device's best on the board under it
    }
    if (p.name) schedule();
  });
  window.addEventListener('pagehide', () => void pushBest(true));
  // A new outfit shows up on the leaderboard too.
  let look = encodeLook(save.get().look);
  save.subscribe(() => {
    const l = encodeLook(save.get().look);
    if (l !== look) {
      look = l;
      if (save.get().best > 0) schedule(4000);
    }
  });
  window.addEventListener('online', () => schedule());
  if (profile.get().name) schedule(2000);
}
