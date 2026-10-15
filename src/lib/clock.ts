// Server-corrected time. The daily shop, daily chest and monthly events go by this clock, so
// moving the device clock forward doesn't open tomorrow's shop. Whenever the leaderboard answers
// a write we learn the server's time and remember the difference.
const KEY = 'kmr.bird.clock';
let offset = 0;
try {
  offset = Number(localStorage.getItem(KEY)) || 0;
} catch {
  /* ignore */
}
let synced = false;
const listeners = new Set<() => void>();

export const now = () => Date.now() + offset;
export const isSynced = () => synced;

export function learnServerTime(serverMs: number) {
  if (!Number.isFinite(serverMs) || serverMs < 1.6e12) return;
  const next = serverMs - Date.now();
  synced = true;
  if (Math.abs(next - offset) < 2000) return;
  offset = next;
  try {
    localStorage.setItem(KEY, String(offset));
  } catch {
    /* ignore */
  }
  listeners.forEach(l => l());
}

export function onClock(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** The day key everyone shares (UTC), e.g. "2026-10-14". */
export const dayKey = (t = now()) => new Date(t).toISOString().slice(0, 10);
/** Milliseconds until the next UTC midnight (when the daily shop changes). */
export const msToNextDay = (t = now()) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - t;
};
export const fmtWait = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)}m`;
};
