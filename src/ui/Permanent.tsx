import {useEffect, useMemo, useState} from 'react';
import {backHandler} from '../App';
import {sfx} from '../game/audio';
import {ALL_ITEMS, RARITIES, RARITY_COLOR, SLOTS, SLOT_NAME, type Item, type Slot} from '../game/items';
import {availability, save, useSave} from '../lib/save';
import {dirOf, focusDefault, focusEl, setEdgeHandler, setKeyCapture} from '../lib/spatial';
import {now} from '../lib/clock';
import {LiveBird, StillBird} from './BirdView';
import {Check, Coin, Lock} from './icons';

// The Permanent shop: every item in the game, shown inside the Shop's "Permanent" tab.
const PER_PAGE = 9; // 3 columns × 3 rows
const COLS = 3;
const SOURCE_ORDER = {starter: 0, shop: 1, egg: 2, achieve: 3, daily: 4, event: 5} as const;

function sorted(slot: Slot): Item[] {
  const m = new Date(now()).getMonth();
  const group = (i: Item) => (i.source === 'event' ? (i.month === m ? 0 : 2) : 1);
  return ALL_ITEMS.filter(i => i.slot === slot).sort(
    (a, b) => group(a) - group(b) || RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source] || (a.month ?? 0) - (b.month ?? 0),
  );
}

export default function Permanent() {
  const s = useSave();
  const [slot, setSlot] = useState<Slot>('color');
  const [page, setPage] = useState(0);
  const [focus, setFocus] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [nudge, setNudge] = useState(0);
  const [fresh] = useState(() => save.get().fresh);
  const items = useMemo(() => sorted(slot), [slot]);
  const pages = Math.ceil(items.length / PER_PAGE);
  const shown = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const ownedIn = items.filter(i => s.owned.includes(i.id)).length;

  useEffect(() => save.seenFresh(), []);

  // Swiping down past the last row (or up past the first) turns the page.
  useEffect(() => {
    setEdgeHandler((dir, from) => {
      const idx = Number(from?.dataset.idx ?? NaN);
      if (Number.isNaN(idx)) return false;
      const col = idx % COLS;
      if (dir === 'down' && page < pages - 1) {
        flip(page + 1, col);
        return true;
      }
      if (dir === 'up' && page > 0) {
        flip(page - 1, col + PER_PAGE - COLS);
        return true;
      }
      return false;
    });
    return () => setEdgeHandler(null);
  });

  // Left from the first column always goes back to the slot you're in (not whichever is nearest).
  // Up from the top row turns back a page, or goes to this tab (never a different shop tab).
  useEffect(() => {
    setKeyCapture(e => {
      const d = dirOf(e);
      const a = document.activeElement as HTMLElement | null;
      if (!a || a.closest('[data-focus-scope="modal"]')) return false;
      const idx = a.dataset.idx ? Number(a.dataset.idx) : NaN;
      if (d === 'left' && !Number.isNaN(idx) && idx % COLS === 0) return focusEl(document.querySelector<HTMLElement>(`[data-slot="${slot}"]`));
      if (d === 'up' && !Number.isNaN(idx) && idx < COLS) {
        if (page > 0) flip(page - 1, idx + PER_PAGE - COLS);
        else focusEl(document.querySelector<HTMLElement>('[data-tab="permanent"]'));
        return true;
      }
      if (d === 'up' && a.dataset.slot === SLOTS[0]) return focusEl(document.querySelector<HTMLElement>('[data-tab="permanent"]'));
      return false;
    });
    return () => setKeyCapture(null);
  });

  const flip = (p: number, idx: number) => {
    sfx.move();
    setPage(p);
    requestAnimationFrame(() => {
      const tiles = document.querySelectorAll<HTMLElement>('.ward-grid [data-idx]');
      focusEl(tiles[Math.min(idx, tiles.length - 1)]);
    });
  };

  const pickSlot = (sl: Slot) => {
    if (sl === slot) return;
    setSlot(sl);
    setPage(0);
    setFocus(null);
  };

  // Back closes the buy popup first.
  useEffect(() => {
    backHandler.current = () => {
      if (!confirm) return false;
      close();
      return true;
    };
    return () => {
      backHandler.current = null;
    };
  });

  const close = (quiet = false) => {
    const id = confirm?.id;
    setConfirm(null);
    if (!quiet) sfx.back();
    requestAnimationFrame(() => focusEl(document.querySelector<HTMLElement>(`[data-item="${id}"]`)) || focusDefault());
  };

  const press = (it: Item) => {
    const a = availability(it, s);
    if (a.how === 'owned') {
      if (it.slot === 'color' && s.look.color === it.id) return sfx.deny();
      save.equip(it);
      return sfx.select();
    }
    if (a.price !== undefined && (a.how === 'buy' || a.how === 'daily' || a.how === 'event')) {
      if (s.coins < a.price) {
        setNudge(n => n + 1);
        return sfx.deny();
      }
      sfx.select();
      setConfirm(it);
      requestAnimationFrame(() => focusDefault());
      return;
    }
    setNudge(n => n + 1);
    sfx.deny();
  };

  const sel = focus && focus.slot === slot ? focus : null;
  const preview = sel ? {...s.look, [sel.slot]: sel.id} : s.look;
  const a = sel ? availability(sel, s) : null;
  const equipped = sel ? s.look[sel.slot] === sel.id : false;

  return (
    <div className="ward" data-modal={confirm ? '' : undefined}>

      <div className="ward-rail" role="tablist" aria-label="Slots" inert={confirm ? true : undefined}>
        {SLOTS.map(sl => (
          <button
            key={sl}
            type="button"
            role="tab"
            aria-selected={sl === slot}
            className={`rail-btn${sl === slot ? ' is-on' : ''}`}
            data-slot={sl}
            onFocus={() => pickSlot(sl)}
            onClick={() => pickSlot(sl)}
          >
            {SLOT_NAME[sl]}
            {s.look[sl] && sl !== 'color' && <i className="rail-dot" />}
          </button>
        ))}
      </div>

      <div className="ward-grid" role="group" aria-label={SLOT_NAME[slot]} inert={confirm ? true : undefined}>
        {shown.map((it, i) => {
          const av = availability(it, s);
          const on = s.look[it.slot] === it.id;
          return (
            <button
              key={it.id}
              type="button"
              className={`tile is-${av.how}${on ? ' is-on' : ''}`}
              style={{['--tier' as string]: RARITY_COLOR[it.rarity]}}
              data-item={it.id}
              data-idx={i}
              onFocus={() => setFocus(it)}
              onClick={() => press(it)}
              aria-label={`${it.name}, ${it.rarity}, ${on ? 'equipped' : av.text}`}
            >
              <StillBird look={it.slot === 'color' ? {color: it.id} : {color: s.look.color, [it.slot]: it.id}} w={80} h={58} size={it.slot === 'hat' || it.slot === 'wings' ? 15 : 17} />
              <span className="tile-name">{it.name}</span>
              <span className="tile-status">
                {on ? (
                  <>
                    <Check size={11} /> On
                  </>
                ) : av.how === 'owned' ? (
                  'Owned'
                ) : av.price !== undefined ? (
                  <>
                    <Coin size={11} />
                    {av.price.toLocaleString()}
                  </>
                ) : (
                  <>
                    <Lock size={10} />
                    {av.how === 'egg' ? 'Egg' : av.how === 'achieve' ? 'Earn' : it.source === 'daily' ? 'Daily' : 'Event'}
                  </>
                )}
              </span>
              {fresh.includes(it.id) && <i className="tile-new">NEW</i>}
              {it.source === 'event' && av.how === 'event' && <i className="tile-event">EVENT</i>}
            </button>
          );
        })}
      </div>
      <div className="ward-pager">
        {pages > 1 ? `Page ${page + 1} of ${pages} · swipe past the edge` : `${shown.length} items`} · {ownedIn}/{items.length} owned
      </div>

      <aside className="ward-detail" style={{['--tier' as string]: sel ? RARITY_COLOR[sel.rarity] : '#3a4656'}} aria-live="polite">
        <LiveBird look={preview} w={180} h={150} size={40} />
        {sel ? (
          <>
            <span className="detail-tier">{sel.rarity}</span>
            <h2>{sel.name}</h2>
            {a!.how === 'owned' ? (
              <p className={`detail-msg${equipped ? ' is-on' : ''}`}>{equipped ? (sel.slot === 'color' ? 'Wearing it' : 'Wearing it · pinch to take off') : 'Pinch to wear'}</p>
            ) : a!.price !== undefined ? (
              <>
                <p className="detail-price">
                  <Coin size={18} />
                  {a!.price.toLocaleString()}
                </p>
                <p className={`detail-msg${s.coins < a!.price ? ' is-short' : ''}`} key={nudge} data-nudge={nudge > 0}>
                  {s.coins < a!.price ? `${(a!.price - s.coins).toLocaleString()} more coins` : a!.how === 'buy' ? 'Pinch to buy' : `${a!.text} · pinch to buy`}
                </p>
              </>
            ) : (
              <p className="detail-msg" key={nudge} data-nudge={nudge > 0}>
                <Lock size={12} /> {a!.how === 'egg' ? 'Found in Mystery Eggs' : a!.text}
              </p>
            )}
          </>
        ) : (
          <>
            <span className="detail-tier">Your bird</span>
            <h2>{SLOT_NAME[slot]}</h2>
            <p className="detail-msg">Swipe right to browse. Your bird tries on whatever you look at.</p>
          </>
        )}
      </aside>

      {confirm && (
        <div className="overlay" data-focus-scope="modal">
          <div className="card confirm" role="dialog" aria-label={`Buy ${confirm.name}`}>
            <StillBird look={{...s.look, [confirm.slot]: confirm.id}} w={150} h={110} size={34} />
            <h2>Buy {confirm.name}?</h2>
            <p>
              <Coin size={18} /> {(availability(confirm, s).price ?? 0).toLocaleString()} coins
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn is-primary"
                data-autofocus
                onClick={() => {
                  const ok = save.buy(confirm);
                  if (ok) sfx.buy();
                  close(ok);
                }}
              >
                Buy &amp; wear
              </button>
              <button type="button" className="btn" onClick={() => close()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
