import {useEffect, useRef, useState} from 'react';
import {backHandler, type Go} from '../App';
import {sfx} from '../game/audio';
import {BirdGame, MEDALS, type RunResult} from '../game/engine';
import {RARITY_COLOR} from '../game/items';
import {fetchBoard, leaderboardEnabled, syncNow} from '../lib/board';
import {profile} from '../lib/profile';
import {currentTheme, save, type Reward} from '../lib/save';
import {dirOf, focusDefault, focusEl, isEnter, setKeyCapture} from '../lib/spatial';
import {StillBird} from './BirdView';
import {Coin, HomeIcon, MedalIcon, Play as PlayIcon, Restart, Shirt} from './icons';

type Phase = 'tutorial' | 'run' | 'paused' | 'results';

export default function Play({go, restart}: {go: Go; restart: () => void}) {
  const st = save.get();
  const theme = currentTheme();
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLButtonElement>(null);
  const game = useRef<BirdGame | null>(null);
  const lastFlap = useRef(0);
  const [phase, setPhase] = useState<Phase>(() => (st.seenTutorial ? 'run' : 'tutorial'));
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [reward, setReward] = useState<Reward | null>(null);
  const leaving = useRef(false);

  useEffect(() => {
    const g = new BirdGame(canvas.current!, {
      look: st.look,
      theme,
      best: st.best,
      onEnd: (r: RunResult) => {
        const rw = save.finishRun(r);
        setReward(rw);
        setPhase('results');
        sfx.swoosh();
      },
    });
    game.current = g;
    if (/[?&]dev\b/.test(location.search)) (window as unknown as {__game: BirdGame}).__game = g;
    g.start();
    return () => {
      g.stop();
      game.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = () => {
    const g = game.current;
    if (!g || g.state !== 'play') return false;
    g.paused = true;
    sfx.back();
    setPhase('paused');
    return true;
  };
  const resume = () => {
    sfx.select();
    if (game.current) game.current.paused = false;
    setPhase('run');
  };

  // Back pauses a run and resumes from the pause menu; elsewhere it leaves.
  useEffect(() => {
    backHandler.current = () => {
      if (leaving.current) return false;
      if (phaseRef.current === 'run') return pause();
      if (phaseRef.current === 'paused') {
        resume();
        return true;
      }
      return false;
    };
    return () => {
      backHandler.current = null;
    };
  });

  // A pinch can arrive as Enter and as a click: flap once.
  const flap = () => {
    const t = performance.now();
    if (t - lastFlap.current < 110) return;
    lastFlap.current = t;
    game.current?.flap();
  };

  // While playing every pinch (and swipe up) flaps; the other swipes do nothing.
  useEffect(() => {
    if (phase !== 'run') return;
    setKeyCapture(e => {
      const d = dirOf(e);
      if (d === 'up' || isEnter(e) || e.key === ' ') {
        flap();
        return true;
      }
      return !!d;
    });
    requestAnimationFrame(() => focusEl(surface.current));
    return () => setKeyCapture(null);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'run') requestAnimationFrame(() => focusDefault());
  }, [phase]);

  const leave = (to: 'home' | 'locker') => {
    leaving.current = true;
    sfx.select();
    go(to);
  };

  return (
    <div className="play">
      <canvas ref={canvas} className="game-canvas" aria-label="KMR Bird" />
      {phase === 'run' && <button ref={surface} type="button" className="play-surface" aria-label="Playing: pinch to flap" onClick={flap} />}

      {phase === 'tutorial' && (
        <div className="overlay">
          <div className="card tut">
            <h2>How to play</h2>
            <ul className="tut-list">
              <li>
                <kbd>Pinch</kbd>
                <span>Flap! Each pinch lifts your bird a little.</span>
              </li>
              <li>
                <kbd>Back</kbd>
                <span>Pause the game</span>
              </li>
              <li>
                <i className="tut-pipe" />
                <span>
                  Fly through the gaps. Every gap is <b>1 point</b>.
                </span>
              </li>
              <li>
                <i className="tut-coin" />
                <span>
                  Grab coins in the gaps. Spend them on <b>outfits</b>.
                </span>
              </li>
            </ul>
            <div className="tut-medals">
              {MEDALS.slice(0, 4).map(m => (
                <span key={m.id}>
                  <MedalIcon color={m.color} size={30} />
                  {m.at}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="btn is-primary"
              data-autofocus
              onClick={() => {
                save.seenTutorial();
                sfx.select();
                setPhase('run');
              }}
            >
              <PlayIcon size={18} /> Got it
            </button>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="overlay">
          <div className="card pause">
            <h2>Paused</h2>
            <button type="button" className="btn is-primary" data-autofocus onClick={resume}>
              <PlayIcon size={18} /> Resume
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                game.current?.stop();
                sfx.select();
                restart();
              }}
            >
              <Restart /> Restart
            </button>
            <button type="button" className="btn" onClick={() => leave('home')}>
              <HomeIcon /> Quit to menu
            </button>
          </div>
        </div>
      )}

      {phase === 'results' && reward && (
        <Results
          r={reward}
          onAgain={() => {
            sfx.select();
            restart();
          }}
          onWardrobe={() => leave('locker')}
          onHome={() => leave('home')}
        />
      )}
    </div>
  );
}

function useCountUp(target: number, ms = 900, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

type Rank = {state: 'loading'} | {state: 'ok'; rank: number; of: number} | {state: 'none'};

function Results({r, onAgain, onWardrobe, onHome}: {r: Reward; onAgain: () => void; onWardrobe: () => void; onHome: () => void}) {
  const res = r.result;
  const score = useCountUp(res.score, 800);
  const coins = useCountUp(r.coins + r.achievements.reduce((a, x) => a + x.coins, 0), 800, 300);
  const best = Math.max(r.prevBest, res.score);
  const m = res.medal;
  const next = MEDALS.find(x => x.at > res.score);
  const [rank, setRank] = useState<Rank>(() => (leaderboardEnabled() && profile.get().name && res.score > 0 ? {state: 'loading'} : {state: 'none'}));

  useEffect(() => {
    if (m) setTimeout(() => sfx.medal(), 300);
    else if (r.newBest && r.prevBest > 0) setTimeout(() => sfx.best(), 300);
    if (rank.state !== 'loading') return;
    let live = true;
    void (async () => {
      if (r.newBest) await syncNow();
      const rows = await fetchBoard();
      if (!live) return;
      const list = Array.isArray(rows) ? rows : [];
      const me = profile.get().name?.toLowerCase();
      const i = list.findIndex(e => e.name.toLowerCase() === me);
      setRank(i >= 0 ? {state: 'ok', rank: i + 1, of: list.length} : {state: 'none'});
    })();
    return () => {
      live = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unlocked = r.unlocked;
  return (
    <div className="overlay is-results">
      <div className="card results">
        <div className="res-top">
          <div className={`res-medal${m ? ' has-medal' : ''}`} style={{['--medal' as string]: m?.color ?? '#3a4656'}}>
            {m ? <MedalIcon color={m.color} size={78} /> : <span className="res-nomedal">No medal</span>}
            <span className="res-medal-name">{m ? m.name : next ? `${next.at} for ${next.name}` : ''}</span>
          </div>
          <div className="res-scores">
            <div className={`res-title${r.newBest ? ' is-best' : ''}`}>{r.newBest && r.prevBest > 0 ? 'New best!' : 'Score'}</div>
            <div className="res-score">{score}</div>
            <div className="res-sub">
              Best <b>{best}</b>
              {rank.state === 'ok' && (
                <>
                  {' · '}
                  <b className="res-rank">#{rank.rank}</b> of {rank.of}
                </>
              )}
              {rank.state === 'loading' && <span className="res-wait"> · Ranking…</span>}
            </div>
          </div>
        </div>
        <div className="res-coins">
          <Coin size={20} />
          <b>+{coins.toLocaleString()}</b>
          <span className="res-break">
            {r.scoreCoins} score{r.grabCoins ? ` · ${r.grabCoins} grabbed` : ''}
            {r.medalCoins ? ` · ${r.medalCoins} medal` : ''}
            {r.achievements.length ? ` · ${r.achievements.reduce((a, x) => a + x.coins, 0)} bonus` : ''}
          </span>
        </div>
        {r.questsDone.length > 0 && (
          <div className="res-ach is-quest">
            <span>Quest complete · claim it in Quests</span>
            <b>{r.questsDone.map(q => `${q.text} (+${q.reward})`).join(' · ')}</b>
          </div>
        )}
        {r.achievements.length > 0 && (
          <div className="res-ach">
            <span>Achievement{r.achievements.length > 1 ? 's' : ''}</span>
            <b>{r.achievements.map(a => a.text).join(' · ')}</b>
          </div>
        )}
        {unlocked.length > 0 && (
          <div className="res-unlock" style={{['--tier' as string]: RARITY_COLOR[unlocked[0].rarity]}}>
            <StillBird look={{...save.get().look, [unlocked[0].slot]: unlocked[0].id}} w={70} h={56} size={18} />
            <div>
              <span>Unlocked</span>
              <b>{unlocked.map(u => u.name).join(', ')}</b>
            </div>
          </div>
        )}
        <div className="res-actions">
          <button type="button" className="btn is-primary" data-autofocus onClick={onAgain}>
            <Restart /> Play again
          </button>
          <button type="button" className="btn is-icon" onClick={onWardrobe} aria-label="Locker">
            <Shirt />
          </button>
          <button type="button" className="btn is-icon" onClick={onHome} aria-label="Menu">
            <HomeIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
