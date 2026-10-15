import {useEffect, useState} from 'react';
import {sfx} from '../game/audio';
import {medalFor} from '../game/engine';
import {decodeLook} from '../game/items';
import {fetchBoard, leaderboardEnabled, type ArcadeEntry} from '../lib/board';
import {useProfile} from '../lib/profile';
import {useSave} from '../lib/save';
import {focusEl} from '../lib/spatial';
import {StillBird} from './BirdView';
import {MedalIcon, Restart} from './icons';

const PER_PAGE = 7;
type Load = {state: 'loading'} | {state: 'error'} | {state: 'closed'} | {state: 'ok'; rows: ArcadeEntry[]};

export default function Board() {
  const s = useSave();
  const p = useProfile();
  const [data, setData] = useState<Load>({state: 'loading'});
  const [page, setPage] = useState(0);
  const me = p.name?.toLowerCase();

  const load = () => {
    setData({state: 'loading'});
    void fetchBoard().then(rows => setData(rows === 'closed' ? {state: 'closed'} : rows ? {state: 'ok', rows} : {state: 'error'}));
  };
  useEffect(() => {
    if (leaderboardEnabled()) load();
  }, []);

  const rows = data.state === 'ok' ? data.rows : [];
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const myIndex = rows.findIndex(e => e.name.toLowerCase() === me);
  useEffect(() => {
    setPage(myIndex >= 0 ? Math.floor(myIndex / PER_PAGE) : 0);
  }, [data.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (d: number) => {
    const next = Math.min(pages - 1, Math.max(0, page + d));
    if (next === page) return sfx.deny();
    sfx.select();
    setPage(next);
    requestAnimationFrame(() => {
      const a = document.activeElement as HTMLElement | null;
      if (a?.hasAttribute('disabled')) focusEl(document.querySelector<HTMLElement>(d > 0 ? '[data-page="prev"]' : '[data-page="next"]'));
    });
  };
  const shown = rows.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const myMedal = medalFor(s.best);

  return (
    <div className="board">
      <header className="screen-head">
        <h1>Leaderboard</h1>
        <span className="head-sub">Best score · everyone's outfit</span>
        <button type="button" className="btn is-small" data-autofocus onClick={() => (sfx.select(), load())} aria-label="Refresh">
          <Restart size={15} /> Refresh
        </button>
      </header>

      <div className="rows" aria-live="polite">
        {!leaderboardEnabled() ? (
          <Empty title="Leaderboard is off" text="Scores are saved on these glasses." />
        ) : data.state === 'loading' ? (
          <Empty title="Loading…" />
        ) : data.state === 'closed' ? (
          <Empty title="Leaderboard opening soon" text="Your best score is saved and will show up here as soon as it opens." />
        ) : data.state === 'error' ? (
          <Empty title="Can't reach the leaderboard" text="Check that the glasses are online, then refresh." />
        ) : rows.length === 0 ? (
          <Empty title="No scores yet" text="Be the first on the board." />
        ) : (
          shown.map((e, i) => <Row key={e.name} e={e} rank={page * PER_PAGE + i + 1} mine={e.name.toLowerCase() === me} />)
        )}
      </div>

      <div className="board-foot">
        <div className={`me-row${myIndex >= 0 ? ' is-ranked' : ''}`}>
          <span className="me-label">You</span>
          <span className="me-name">{p.name}</span>
          {myMedal && <MedalIcon color={myMedal.color} size={24} />}
          <span className="me-rank">{myIndex >= 0 ? `#${myIndex + 1}` : s.best > 0 && data.state === 'ok' ? 'Sending…' : 'Unranked'}</span>
          <span className="me-best">{s.best.toLocaleString()}</span>
        </div>
        <div className="pager">
          <button type="button" className="btn is-small" data-page="prev" disabled={page === 0} onClick={() => flip(-1)}>
            ‹ Prev
          </button>
          <span className="pager-count">
            {page + 1} / {pages}
          </span>
          <button type="button" className="btn is-small" data-page="next" disabled={page >= pages - 1} onClick={() => flip(1)}>
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({e, rank, mine}: {e: ArcadeEntry; rank: number; mine: boolean}) {
  const look = e.look ? decodeLook(e.look) : {color: e.skin};
  const m = medalFor(e.best);
  return (
    <div className={`row${mine ? ' is-me' : ''}${rank <= 3 ? ` is-top is-${rank}` : ''}`}>
      <span className="row-rank">{rank}</span>
      <StillBird look={look} w={52} h={40} size={13} />
      <span className="row-name">{e.name}</span>
      <span className="row-medal">{m && <MedalIcon color={m.color} size={22} />}</span>
      <span className="row-best">{e.best.toLocaleString()}</span>
    </div>
  );
}

function Empty({title, text}: {title: string; text?: string}) {
  return (
    <div className="empty">
      <b>{title}</b>
      {text && <span>{text}</span>}
    </div>
  );
}
