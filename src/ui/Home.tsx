import {useEffect, useRef, useState} from 'react';
import {backHandler, shopTab, type Go} from '../App';
import {sfx} from '../game/audio';
import {BirdGame, medalFor} from '../game/engine';
import {now, onClock} from '../lib/clock';
import {useProfile} from '../lib/profile';
import {chestStatus, currentTheme, eventItems, save, useSave} from '../lib/save';
import {focusDefault, focusEl} from '../lib/spatial';
import {Bag, Coin, LinkIcon, MedalIcon, Play, Shirt, SoundOff, SoundOn, Trophy} from './icons';
import {LinkEnter, LinkShow} from './Link';

export default function Home({go}: {go: Go}) {
  const s = useSave();
  const p = useProfile();
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<BirdGame | null>(null);
  const [, tick] = useState(0);
  const [menu, setMenu] = useState<null | 'menu' | 'show' | 'enter'>(null);
  const theme = currentTheme();
  const events = eventItems();
  const eventLeft = events.filter(i => !s.owned.includes(i.id)).length;
  const chest = chestStatus(s);
  const medal = medalFor(s.best);
  const daysLeft = (() => {
    const d = new Date(now());
    return Math.ceil((new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - d.getTime()) / 86400000);
  })();

  // The menu background: the bird flies itself through this month's world.
  useEffect(() => {
    const g = new BirdGame(canvas.current!, {look: save.get().look, theme, attract: true});
    game.current = g;
    g.start();
    const off = onClock(() => tick(x => x + 1));
    return () => {
      g.stop();
      off();
    };
  }, [theme.month]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => game.current?.setLook(s.look), [s.look]);

  const closeMenu = () => {
    setMenu(null);
    requestAnimationFrame(() => focusEl(document.querySelector<HTMLElement>('[data-nav="name"]')) || focusDefault());
  };
  useEffect(() => {
    backHandler.current = () => {
      if (!menu) return false;
      sfx.back();
      if (menu === 'menu') closeMenu();
      else {
        setMenu('menu');
        requestAnimationFrame(() => focusDefault());
      }
      return true;
    };
    return () => {
      backHandler.current = null;
    };
  });

  const openShop = (tab: typeof shopTab.current) => {
    shopTab.current = tab;
    sfx.select();
    go('shop');
  };

  return (
    <div className="home" style={{['--accent' as string]: theme.accent}}>
      <canvas ref={canvas} className="game-canvas attract" aria-hidden="true" />
      <div className="home-shade" />

      <header className="home-top">
        <div className="logo" aria-label="KMR Bird">
          <span className="logo-kmr">KMR</span>
          <span className="logo-bird">BIRD</span>
        </div>
        <div className="home-player">
          <button
            type="button"
            className="player-name"
            data-nav="name"
            aria-label={`${p.name}: link name`}
            onClick={() => {
              sfx.select();
              setMenu('menu');
              requestAnimationFrame(() => focusDefault());
            }}
          >
            {p.name}
            <LinkIcon size={14} />
          </button>
          <span className="coins">
            <Coin size={17} />
            {s.coins.toLocaleString()}
          </span>
        </div>
      </header>

      <div className="home-best">
        {medal && <MedalIcon color={medal.color} size={30} />}
        <span>
          BEST <b>{s.best}</b>
        </span>
      </div>

      <button type="button" className="play-btn" data-nav="play" data-autofocus onClick={() => (sfx.select(), go('play'))}>
        <Play size={26} /> Play
      </button>

      <button type="button" className="event-chip" data-nav="event" onClick={() => openShop('event')}>
        <span className="event-tag">{theme.short}</span>
        <span className="event-text">
          {eventLeft > 0 ? `${eventLeft} limited items` : 'All event items collected!'}
          {daysLeft > 0 && <small> · {daysLeft}d left</small>}
        </span>
      </button>

      <nav className="home-nav">
        <button type="button" className="btn" data-nav="wardrobe" onClick={() => (sfx.select(), go('wardrobe'))}>
          <Shirt /> Wardrobe
          {s.fresh.length > 0 && <i className="dot" aria-label="New items" />}
        </button>
        <button type="button" className="btn" data-nav="shop" onClick={() => openShop(chest.ready ? 'chest' : 'daily')}>
          <Bag /> Shop
          {chest.ready && <i className="dot" aria-label="Daily chest ready" />}
        </button>
        <button type="button" className="btn is-icon" data-nav="board" aria-label="Leaderboard" onClick={() => (sfx.select(), go('board'))}>
          <Trophy />
        </button>
        <button
          type="button"
          className="btn is-icon"
          data-nav="sound"
          aria-label={s.sound ? 'Sound on' : 'Sound off'}
          aria-pressed={s.sound}
          onClick={() => {
            save.setSound(!s.sound);
            if (!s.sound) setTimeout(() => sfx.select(), 60);
          }}
        >
          {s.sound ? <SoundOn /> : <SoundOff />}
        </button>
      </nav>

      {menu === 'menu' && (
        <div className="overlay" data-focus-scope="modal">
          <div className="card name-card" role="dialog" aria-label="Your name">
            <span className="name-label">Playing as</span>
            <h2>{p.name}</h2>
            <p className="link-note">Use the same name in every KMR app. Get a code here and type it into the other app, or the other way round.</p>
            <button type="button" className="btn is-primary" data-autofocus onClick={() => (sfx.select(), setMenu('show'))}>
              <LinkIcon /> Get a code
            </button>
            <button type="button" className="btn" onClick={() => (sfx.select(), setMenu('enter'))}>
              Enter a code
            </button>
            <button type="button" className="btn" onClick={() => (sfx.back(), closeMenu())}>
              Close
            </button>
          </div>
        </div>
      )}
      {menu === 'show' && (
        <div className="overlay" data-focus-scope="modal">
          <LinkShow onClose={closeMenu} />
        </div>
      )}
      {menu === 'enter' && (
        <div className="overlay is-solid" data-focus-scope="modal">
          <LinkEnter
            onDone={closeMenu}
            onCancel={() => {
              setMenu('menu');
              requestAnimationFrame(() => focusDefault());
            }}
          />
        </div>
      )}
    </div>
  );
}
