import {useEffect, useState} from 'react';
import {backHandler, shopTab, type Go, type ShopTab} from '../App';
import {sfx} from '../game/audio';
import {RARITIES, RARITY_COLOR, SLOT_NAME, type Item} from '../game/items';
import {fmtWait, msToNextDay, now} from '../lib/clock';
import {availability, CHEST_REWARDS, chestStatus, currentTheme, DAILY_ODDS, dailyShop, EGGS, eventItems, save, useSave, type EggKind} from '../lib/save';
import {focusDefault, focusEl, setEdgeHandler} from '../lib/spatial';
import {LiveBird, StillBird} from './BirdView';
import {Check, Clock, Coin, EggIcon, Gift} from './icons';

const TABS: {id: ShopTab; name: string}[] = [
  {id: 'daily', name: 'Daily'},
  {id: 'event', name: 'Event'},
  {id: 'eggs', name: 'Eggs'},
  {id: 'chest', name: 'Chest'},
];
const EV_PER_PAGE = 8;

type Reveal = {kind: EggKind; item: Item; dupe: boolean; refund: number; free: boolean};

export default function Shop(_: {go: Go}) {
  const s = useSave();
  const theme = currentTheme();
  const [tab, setTab] = useState<ShopTab>(shopTab.current);
  const [confirm, setConfirm] = useState<{item: Item; price: number} | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [evPage, setEvPage] = useState(0);
  const [, tick] = useState(0);
  const offers = dailyShop();
  const events = eventItems();
  const evPages = Math.max(1, Math.ceil(events.length / EV_PER_PAGE));
  const chest = chestStatus(s);
  const daysLeft = (() => {
    const d = new Date(now());
    return Math.ceil((new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - d.getTime()) / 86400000);
  })();

  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const pick = (t: ShopTab) => {
    if (t === tab) return;
    shopTab.current = t;
    setTab(t);
  };

  // Event items page down/up past the edge.
  useEffect(() => {
    setEdgeHandler((dir, from) => {
      if (tab !== 'event') return false;
      const idx = Number(from?.dataset.idx ?? NaN);
      if (Number.isNaN(idx)) return false;
      if (dir === 'down' && evPage < evPages - 1) {
        setEvPage(evPage + 1);
        requestAnimationFrame(() => focusEl(document.querySelectorAll<HTMLElement>('.ev-grid [data-idx]')[Math.min(idx % 4, 99)]));
        sfx.move();
        return true;
      }
      if (dir === 'up' && evPage > 0) {
        setEvPage(evPage - 1);
        requestAnimationFrame(() => focusEl(document.querySelectorAll<HTMLElement>('.ev-grid [data-idx]')[4 + (idx % 4)]));
        sfx.move();
        return true;
      }
      return false;
    });
    return () => setEdgeHandler(null);
  });

  // Back closes a popup first.
  useEffect(() => {
    backHandler.current = () => {
      if (reveal) {
        closeReveal();
        return true;
      }
      if (confirm) {
        closeConfirm();
        return true;
      }
      return false;
    };
    return () => {
      backHandler.current = null;
    };
  });

  const refocus = (sel: string) => requestAnimationFrame(() => focusEl(document.querySelector<HTMLElement>(sel)) || focusDefault());
  const closeConfirm = (quiet = false) => {
    const id = confirm?.item.id;
    setConfirm(null);
    if (!quiet) sfx.back();
    refocus(`[data-item="${id}"]`);
  };
  const closeReveal = () => {
    const k = reveal?.kind.id;
    setReveal(null);
    sfx.back();
    refocus(reveal?.free ? '[data-tab="chest"]' : `[data-egg="${k}"]`);
  };

  const askBuy = (it: Item, price: number) => {
    if (s.owned.includes(it.id)) {
      save.equip(it);
      return sfx.select();
    }
    if (s.coins < price) return sfx.deny();
    sfx.select();
    setConfirm({item: it, price});
    requestAnimationFrame(() => focusDefault());
  };

  const openEgg = (kind: EggKind, free = false) => {
    if (!free && s.coins < kind.price) return sfx.deny();
    const r = save.openEgg(kind, free);
    if (!r) return sfx.deny();
    setReveal({kind, ...r, free});
    requestAnimationFrame(() => focusDefault());
  };

  const modal = !!(confirm || reveal);

  return (
    <div className="shop" style={{['--accent' as string]: theme.accent}}>
      <header className="screen-head">
        <h1>Shop</h1>
        <span className="head-sub" />
        <span className="coins">
          <Coin size={17} />
          {s.coins.toLocaleString()}
        </span>
      </header>

      <div className="tabs" role="tablist" aria-label="Shop" inert={modal ? true : undefined}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            className={`tab${t.id === tab ? ' is-on' : ''}`}
            data-tab={t.id}
            data-autofocus={t.id === tab ? '' : undefined}
            onFocus={() => pick(t.id)}
            onClick={() => pick(t.id)}
          >
            {t.id === 'event' ? theme.event : t.name}
            {t.id === 'chest' && chest.ready && <i className="dot" />}
          </button>
        ))}
      </div>

      <div className="shop-body" inert={modal ? true : undefined}>
        {tab === 'daily' && (
          <>
            <p className="shop-note">
              <Clock /> New items in <b>{fmtWait(msToNextDay())}</b> · a Secret item shows up about 1 day in {Math.round(1 / (1 - Math.pow(1 - (DAILY_ODDS.Secret ?? 0) / 100, 4)))}
            </p>
            <div className="offer-grid">
              {offers.map(o => {
                const owned = s.owned.includes(o.item.id);
                return (
                  <button
                    key={o.item.id}
                    type="button"
                    className={`offer${owned ? ' is-owned' : ''}${o.item.rarity === 'Secret' ? ' is-secret' : ''}`}
                    style={{['--tier' as string]: RARITY_COLOR[o.item.rarity]}}
                    data-item={o.item.id}
                    onClick={() => askBuy(o.item, o.price)}
                    aria-label={`${o.item.name}, ${o.item.rarity}, ${owned ? 'owned' : `${o.price} coins`}`}
                  >
                    <span className="offer-tag">{o.deal ? '30% OFF' : o.item.rarity === 'Secret' ? 'SECRET' : 'EXCLUSIVE'}</span>
                    <StillBird look={o.item.slot === 'color' ? {color: o.item.id} : {...s.look, [o.item.slot]: o.item.id}} w={120} h={84} size={24} />
                    <span className="offer-name">{o.item.name}</span>
                    <span className="offer-meta">
                      {o.item.rarity} {SLOT_NAME[o.item.slot].replace(/s$/, '').toLowerCase()}
                    </span>
                    <span className="offer-price">
                      {owned ? (
                        <>
                          <Check size={12} /> Owned
                        </>
                      ) : (
                        <>
                          <Coin size={13} />
                          {o.price.toLocaleString()}
                          {o.deal && <s>{o.item.price.toLocaleString()}</s>}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === 'event' && (
          <>
            <p className="shop-note">
              <b style={{color: theme.accent}}>{theme.event}</b> · {events.filter(i => s.owned.includes(i.id)).length}/{events.length} collected · gone in <b>{daysLeft} days</b>
              {evPages > 1 ? ` · page ${evPage + 1}/${evPages}` : ''}
            </p>
            <div className="ev-grid">
              {events.slice(evPage * EV_PER_PAGE, evPage * EV_PER_PAGE + EV_PER_PAGE).map((it, i) => {
                const owned = s.owned.includes(it.id);
                const av = availability(it, s);
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`ev${owned ? ' is-owned' : ''}`}
                    style={{['--tier' as string]: RARITY_COLOR[it.rarity]}}
                    data-item={it.id}
                    data-idx={i}
                    onClick={() => askBuy(it, av.price ?? it.price)}
                    aria-label={`${it.name}, ${it.rarity}, ${owned ? 'owned' : `${it.price} coins`}`}
                  >
                    <StillBird look={it.slot === 'color' ? {color: it.id} : {...s.look, [it.slot]: it.id}} w={96} h={70} size={20} />
                    <span className="offer-name">{it.name}</span>
                    <span className="offer-price">
                      {owned ? (
                        <>
                          <Check size={12} /> Owned
                        </>
                      ) : (
                        <>
                          <Coin size={12} />
                          {it.price.toLocaleString()}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === 'eggs' && (
          <div className="egg-row">
            {EGGS.map(k => (
              <button key={k.id} type="button" className={`egg-card is-${k.id}`} data-egg={k.id} onClick={() => openEgg(k)} aria-label={`${k.name}, ${k.price} coins`}>
                <EggArt kind={k.id} />
                <span className="egg-name">{k.name}</span>
                <span className="egg-odds">
                  {RARITIES.filter(r => k.odds[r]).map(r => (
                    <span key={r} style={{color: RARITY_COLOR[r]}}>
                      {r} {k.odds[r]}%
                    </span>
                  ))}
                </span>
                <span className={`offer-price${s.coins < k.price ? ' is-short' : ''}`}>
                  <Coin size={14} />
                  {k.price.toLocaleString()}
                </span>
              </button>
            ))}
            <p className="shop-note egg-note">Already have it? You get 40% of its price back in coins.</p>
          </div>
        )}

        {tab === 'chest' && (
          <div className="chest">
            <div className="chest-days">
              {CHEST_REWARDS.map((c, i) => {
                const day = i + 1;
                const done = chest.ready ? day < chest.day : day <= chest.day;
                const today = chest.ready && day === chest.day;
                return (
                  <div key={day} className={`chest-day${done ? ' is-done' : ''}${today ? ' is-today' : ''}`}>
                    <span>Day {day}</span>
                    {day === 7 ? <EggIcon size={22} /> : <Coin size={20} />}
                    <b>{day === 7 ? `${c}+egg` : c}</b>
                    {done && <Check size={14} />}
                  </div>
                );
              })}
            </div>
            <p className="chest-text">{chest.ready ? `Day ${chest.day} reward is ready!` : `Come back in ${fmtWait(msToNextDay())} for day ${(chest.day % 7) + 1}.`} Miss a day and the streak starts over.</p>
            <button
              type="button"
              className="btn is-primary chest-btn"
              disabled={!chest.ready}
              onClick={() => {
                const r = save.claimChest();
                if (!r) return sfx.deny();
                sfx.chest();
                if (r.egg) setTimeout(() => openEgg(EGGS[0], true), 500);
              }}
            >
              <Gift /> {chest.ready ? `Claim ${chest.coins}${chest.egg ? ' + free egg' : ''}` : 'Claimed today'}
            </button>
          </div>
        )}
      </div>

      {confirm && (
        <div className="overlay" data-focus-scope="modal">
          <div className="card confirm" role="dialog" aria-label={`Buy ${confirm.item.name}`}>
            <StillBird look={{...s.look, [confirm.item.slot]: confirm.item.id}} w={150} h={110} size={34} />
            <h2>Buy {confirm.item.name}?</h2>
            <p>
              <Coin size={18} /> {confirm.price.toLocaleString()} coins
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn is-primary"
                data-autofocus
                onClick={() => {
                  const ok = save.buy(confirm.item);
                  if (ok) sfx.buy();
                  else sfx.deny();
                  closeConfirm(ok);
                }}
              >
                Buy &amp; wear
              </button>
              <button type="button" className="btn" onClick={() => closeConfirm()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {reveal && <EggReveal r={reveal} onClose={closeReveal} onAgain={() => (setReveal(null), openEgg(reveal.kind))} />}
    </div>
  );
}

function EggArt({kind, crack = 0}: {kind: EggKind['id']; crack?: number}) {
  const gold = kind === 'golden';
  return (
    <svg width="86" height="104" viewBox="0 0 86 104" aria-hidden="true" className="egg-art">
      <defs>
        <radialGradient id={`eg-${kind}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={gold ? '#fff1b0' : '#ffffff'} />
          <stop offset="1" stopColor={gold ? '#e8a512' : '#b8c8e8'} />
        </radialGradient>
      </defs>
      <path d="M43 4C64 4 82 42 82 66a39 39 0 0 1-78 0C4 42 22 4 43 4z" fill={`url(#eg-${kind})`} />
      <path d="M8 58l12-8 12 8 11-8 11 8 12-8 12 8" fill="none" stroke={gold ? '#c8102e' : '#ff7ad1'} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="26" cy="36" r="5" fill={gold ? '#ffffff' : '#3fa9ff'} opacity=".8" />
      <circle cx="58" cy="30" r="4" fill={gold ? '#ffffff' : '#ffd23f'} opacity=".8" />
      <circle cx="46" cy="84" r="5" fill={gold ? '#ffffff' : '#39ff88'} opacity=".8" />
      {crack > 0 && <path d="M30 20l8 10-6 8 9 7-4 9" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />}
      {crack > 1 && <path d="M56 46l-6 8 7 6-5 10" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

function EggReveal({r, onClose, onAgain}: {r: Reveal; onClose: () => void; onAgain: () => void}) {
  const s = useSave();
  const [step, setStep] = useState(0); // 0..2 shaking/cracking, 3 revealed
  const tier = RARITIES.indexOf(r.item.rarity);
  useEffect(() => {
    const ts = [400, 900, 1400].map((ms, i) =>
      setTimeout(() => {
        if (i < 2) {
          sfx.crack();
          setStep(i + 1);
        } else {
          sfx.reveal(tier);
          setStep(3);
          requestAnimationFrame(() => focusDefault());
        }
      }, ms),
    );
    return () => ts.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const color = RARITY_COLOR[r.item.rarity];
  const wearing = s.look[r.item.slot] === r.item.id;
  return (
    <div className="overlay is-solid reveal" data-focus-scope="modal" style={{['--tier' as string]: color}}>
      {step < 3 ? (
        <div className={`reveal-egg step-${step}`}>
          <EggArt kind={r.kind.id} crack={step} />
          <button type="button" className="reveal-skip" data-autofocus aria-label="Opening…" onClick={() => undefined}>
            Opening…
          </button>
        </div>
      ) : (
        <div className="reveal-card">
          <div className="reveal-burst" />
          <span className="reveal-tier">{r.item.rarity}</span>
          <LiveBird look={{...s.look, [r.item.slot]: r.item.id}} w={240} h={170} size={52} />
          <h2>{r.item.name}</h2>
          <p className="reveal-sub">
            {SLOT_NAME[r.item.slot]}
            {r.dupe ? (
              <>
                {' · already yours: '}
                <b>
                  +{r.refund} <Coin size={13} />
                </b>
              </>
            ) : (
              ' · new!'
            )}
          </p>
          <div className="reveal-actions">
            {!r.dupe && (
              <button
                type="button"
                className="btn is-primary"
                data-autofocus
                onClick={() => {
                  save.equip(r.item);
                  sfx.select();
                }}
              >
                {wearing ? 'Wearing' : 'Wear it'}
              </button>
            )}
            <button type="button" className={`btn${r.dupe ? ' is-primary' : ''}`} data-autofocus={r.dupe ? '' : undefined} onClick={onAgain} disabled={s.coins < r.kind.price}>
              <EggIcon /> Again ({r.kind.price.toLocaleString()})
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

