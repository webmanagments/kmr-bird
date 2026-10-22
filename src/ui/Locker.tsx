// The Locker: only the items you own, with your bird big on the screen.
import {useEffect, useMemo, useState} from 'react';
import {shopTab, type Go} from '../App';
import {sfx} from '../game/audio';
import {ALL_ITEMS, RARITIES, RARITY_COLOR, SLOTS, SLOT_NAME, type Item, type Look, type Slot} from '../game/items';
import {save, useSave} from '../lib/save';
import {dirOf, focusEl, setEdgeHandler, setKeyCapture} from '../lib/spatial';
import {LiveBird, StillBird} from './BirdView';
import {Bag, Check, Coin, Dice} from './icons';

const PER_PAGE = 9;
const COLS = 3;
const SHORT: Record<Slot, string> = {color: 'Colors', hat: 'Hats', eyes: 'Eyes', mask: 'Face', neck: 'Neck', belt: 'Belts', pants: 'Pants', shoes: 'Shoes', wings: 'Wings', trail: 'Trails'};

export default function Locker({go}: {go: Go}) {
  const s = useSave();
  const [slot, setSlot] = useState<Slot>('color');
  const [page, setPage] = useState(0);
  const [focus, setFocus] = useState<Item | null>(null);
  const owned = useMemo(() => ALL_ITEMS.filter(i => s.owned.includes(i.id)), [s.owned]);
  const items = useMemo(() => owned.filter(i => i.slot === slot).sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)), [owned, slot]);
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const shown = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const [fresh] = useState(() => save.get().fresh); // highlight what's new during this visit

  useEffect(() => save.seenFresh(), []);

  const flip = (p: number, idx: number) => {
    sfx.move();
    setPage(p);
    requestAnimationFrame(() => {
      const tiles = document.querySelectorAll<HTMLElement>('.lk-grid [data-idx]');
      focusEl(tiles[Math.min(idx, tiles.length - 1)]);
    });
  };

  // Down past the last row turns the page; up from the top row turns back (or goes to the slot).
  useEffect(() => {
    setEdgeHandler((dir, from) => {
      const idx = Number(from?.dataset.idx ?? NaN);
      if (Number.isNaN(idx) || dir !== 'down' || page >= pages - 1) return false;
      flip(page + 1, idx % COLS);
      return true;
    });
    setKeyCapture(e => {
      const d = dirOf(e);
      const a = document.activeElement as HTMLElement | null;
      // The slot chips read as one list over two rows: right from the end of the first row goes on
      // to the second, and down from any chip goes straight to that slot's items.
      const si = a?.dataset.slot ? SLOTS.indexOf(a.dataset.slot as Slot) : -1;
      if (si >= 0) {
        const chip = (i: number) => focusEl(document.querySelector<HTMLElement>(`[data-slot="${SLOTS[i]}"]`));
        if (d === 'right' && si === 4) return chip(5);
        if (d === 'left' && si === 5) return chip(4);
        if (d === 'down') {
          const first = document.querySelector<HTMLElement>('.lk-grid [data-idx="0"]');
          if (first) return focusEl(first);
          return si < 5 ? chip(si + 5) : false;
        }
        return false;
      }
      const idx = a?.dataset.idx ? Number(a.dataset.idx) : NaN;
      if (Number.isNaN(idx)) return false;
      if (d === 'up' && idx < COLS) {
        if (page > 0) flip(page - 1, idx + PER_PAGE - COLS);
        else focusEl(document.querySelector<HTMLElement>(`[data-slot="${slot}"]`));
        return true;
      }
      return false;
    });
    return () => {
      setEdgeHandler(null);
      setKeyCapture(null);
    };
  });

  const pickSlot = (sl: Slot) => {
    if (sl === slot) return;
    setSlot(sl);
    setPage(0);
    setFocus(null);
  };

  const press = (it: Item) => {
    if (it.slot === 'color' && s.look.color === it.id) return sfx.deny();
    save.equip(it);
    sfx.select();
  };

  const shuffle = () => {
    const look: Look = {};
    for (const sl of SLOTS) {
      const mine = owned.filter(i => i.slot === sl);
      if (!mine.length) continue;
      if (sl !== 'color' && Math.random() < 0.35) continue;
      look[sl] = mine[Math.floor(Math.random() * mine.length)].id;
    }
    look.color ??= 'sunny';
    save.setLook(look);
    sfx.buy();
  };

  const sel = focus && focus.slot === slot ? focus : null;
  const preview = sel ? {...s.look, [sel.slot]: sel.id} : s.look;
  const wearing = sel ? s.look[sel.slot] === sel.id : false;

  return (
    <div className="locker">
      <header className="screen-head">
        <h1>Locker</h1>
        <span className="head-sub">
          {owned.length} item{owned.length === 1 ? '' : 's'} owned
        </span>
        <span className="coins">
          <Coin size={17} />
          {s.coins.toLocaleString()}
        </span>
      </header>

      <section className="lk-stage">
        <div className="lk-bird">
          <LiveBird look={preview} w={270} h={300} size={78} />
        </div>
        <div className="lk-actions">
          <button type="button" className="btn is-small" onClick={shuffle}>
            <Dice size={16} /> Shuffle
          </button>
          <button
            type="button"
            className="btn is-small"
            onClick={() => {
              save.setLook({color: s.look.color ?? 'sunny'});
              sfx.back();
            }}
          >
            Take all off
          </button>
        </div>
        <button
          type="button"
          className="btn is-small lk-shop"
          onClick={() => {
            shopTab.current = 'permanent';
            sfx.select();
            go('shop');
          }}
        >
          <Bag size={16} /> Get more in the Shop
        </button>
      </section>

      <div className="lk-slots" role="tablist" aria-label="Slots">
        {SLOTS.map(sl => {
          const n = owned.filter(i => i.slot === sl).length;
          return (
            <button
              key={sl}
              type="button"
              role="tab"
              aria-selected={sl === slot}
              aria-label={`${SLOT_NAME[sl]}, ${n} owned`}
              className={`lk-slot${sl === slot ? ' is-on' : ''}${n ? '' : ' is-empty'}`}
              data-slot={sl}
              data-autofocus={sl === 'color' ? '' : undefined}
              onFocus={() => pickSlot(sl)}
              onClick={() => pickSlot(sl)}
            >
              {SHORT[sl]}
              <small>{n}</small>
            </button>
          );
        })}
      </div>

      <div className="lk-grid" role="group" aria-label={`Your ${SLOT_NAME[slot].toLowerCase()}`}>
        {shown.length === 0 && (
          <p className="lk-empty">
            No {SLOT_NAME[slot].toLowerCase()} yet. Buy them in the Shop, open eggs, or earn them in runs.
          </p>
        )}
        {shown.map((it, i) => {
          const on = s.look[it.slot] === it.id;
          return (
            <button
              key={it.id}
              type="button"
              className={`tile is-owned${on ? ' is-on' : ''}`}
              style={{['--tier' as string]: RARITY_COLOR[it.rarity]}}
              data-item={it.id}
              data-idx={i}
              onFocus={() => setFocus(it)}
              onClick={() => press(it)}
              aria-label={`${it.name}, ${it.rarity}${on ? ', wearing' : ''}`}
            >
              <StillBird look={it.slot === 'color' ? {color: it.id} : {color: s.look.color, [it.slot]: it.id}} w={84} h={60} size={it.slot === 'hat' || it.slot === 'wings' ? 15 : 17} />
              <span className="tile-name">{it.name}</span>
              <span className="tile-status">{on ? <><Check size={11} /> On</> : it.rarity}</span>
              {fresh.includes(it.id) && <i className="tile-new">NEW</i>}
            </button>
          );
        })}
      </div>

      <div className="lk-foot" aria-live="polite">
        {sel ? (
          <>
            <b style={{color: RARITY_COLOR[sel.rarity]}}>{sel.name}</b>
            <span>{wearing ? (sel.slot === 'color' ? 'Wearing it' : 'Wearing · pinch to take off') : 'Pinch to wear'}</span>
          </>
        ) : (
          <span>{pages > 1 ? `Page ${page + 1} of ${pages} · swipe past the bottom for more` : 'Look at an item to try it on'}</span>
        )}
      </div>
    </div>
  );
}
