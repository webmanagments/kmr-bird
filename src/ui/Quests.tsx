// Quests: hourly and daily goals that pay coins, plus the daily login reward and gifts.
import {useEffect, useState} from 'react';
import {sfx} from '../game/audio';
import {dayKey, fmtWait, msToNextDay} from '../lib/clock';
import {DAILY_ALL_BONUS, dailyQuests, hourlyQuests, msToNextHour, type Quest} from '../lib/quests';
import {chestStatus, EGGS, questProgress, save, UPDATE_GIFT, useSave} from '../lib/save';
import {focusDefault} from '../lib/spatial';
import {Check, Clock, Coin, Gift} from './icons';

export default function Quests() {
  const s = useSave();
  const [, tick] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const hourly = hourlyQuests();
  const daily = dailyQuests();
  const chest = chestStatus(s);
  const giftReady = !s.gifts.includes(UPDATE_GIFT.id);
  const allDaily = daily.every(q => s.quest[q.id]?.c);
  const bonusDone = s.bonusDays.includes(dayKey());

  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 20000);
    return () => clearInterval(t);
  }, []);

  const paid = (key: string, coins: number) => {
    setFlash(`${key}:+${coins}`);
    setTimeout(() => setFlash(f => (f?.startsWith(key) ? null : f)), 1400);
  };

  const claim = (q: Quest) => {
    if (save.claimQuest(q)) {
      sfx.buy();
      paid(q.id, q.reward);
    } else sfx.deny();
  };

  return (
    <div className="quests">
      <header className="screen-head">
        <h1>Quests</h1>
        <span className="head-sub">Earn coins every hour and every day</span>
        <span className="coins">
          <Coin size={17} />
          {s.coins.toLocaleString()}
        </span>
      </header>

      <div className="q-top">
        {giftReady && (
          <button
            type="button"
            className="q-card is-ready is-gift"
            data-autofocus
            onClick={() => {
              if (save.claimGift()) {
                sfx.buy();
                paid('gift', UPDATE_GIFT.coins);
                requestAnimationFrame(() => focusDefault());
              }
            }}
          >
            <Gift size={22} />
            <span className="q-text">
              <b>Update gift</b>
              <small>{UPDATE_GIFT.text}</small>
            </span>
            <span className="q-reward">
              <Coin size={15} />+{UPDATE_GIFT.coins.toLocaleString()}
            </span>
          </button>
        )}
        <button
          type="button"
          className={`q-card${chest.ready ? ' is-ready' : ' is-done'}`}
          data-autofocus={!giftReady ? '' : undefined}
          onClick={() => {
            const r = save.claimChest();
            if (!r) return sfx.deny();
            sfx.chest();
            paid('chest', r.coins);
            if (r.egg) {
              const e = save.openEgg(EGGS[0], true);
              if (e) setFlash(`chest:+${r.coins} and a free egg: ${e.item.name}!`);
            }
          }}
        >
          <Gift size={22} />
          <span className="q-text">
            <b>Daily login · day {chest.day}</b>
            <small>{chest.ready ? `Streak day ${chest.day} of 7${chest.egg ? ' + free egg' : ''}` : `Next in ${fmtWait(msToNextDay())}`}</small>
          </span>
          <span className="q-reward">{chest.ready ? <><Coin size={15} />+{chest.coins.toLocaleString()}</> : <><Check size={14} /> Done</>}</span>
        </button>
      </div>

      <div className="q-head">
        <span>Hourly</span>
        <small>
          <Clock /> new in {fmtWait(msToNextHour())} · claim before then
        </small>
      </div>
      <div className="q-row is-2">
        {hourly.map(q => (
          <QuestCard key={q.id} q={q} flash={flash} onClaim={claim} />
        ))}
      </div>

      <div className="q-head">
        <span>Daily</span>
        <small>
          <Clock /> new in {fmtWait(msToNextDay())}
        </small>
      </div>
      <div className="q-row is-3">
        {daily.map(q => (
          <QuestCard key={q.id} q={q} flash={flash} onClaim={claim} />
        ))}
      </div>
      <button
        type="button"
        className={`q-bonus${allDaily && !bonusDone ? ' is-ready' : ''}${bonusDone ? ' is-done' : ''}`}
        onClick={() => {
          if (save.claimDailyBonus()) {
            sfx.chest();
            paid('bonus', DAILY_ALL_BONUS);
          } else sfx.deny();
        }}
      >
        {bonusDone ? (
          <>
            <Check size={15} /> Daily bonus collected
          </>
        ) : (
          <>
            Finish all 3 daily quests: <Coin size={15} /> <b>+{DAILY_ALL_BONUS.toLocaleString()}</b>
          </>
        )}
      </button>
      {flash && <div className="q-flash">+{flash.split(':+')[1]}</div>}
    </div>
  );
}

function QuestCard({q, flash, onClaim}: {q: Quest; flash: string | null; onClaim: (q: Quest) => void}) {
  const st = questProgress(q);
  const done = !!st.c;
  const ready = !done && st.p >= q.target;
  const shown = q.kind === 'medal' ? (st.p >= q.target ? 1 : 0) : Math.min(st.p, q.target);
  const of = q.kind === 'medal' ? 1 : q.target;
  return (
    <button type="button" data-quest={q.id} className={`q-card is-quest${ready ? ' is-ready' : ''}${done ? ' is-done' : ''}${flash?.startsWith(q.id) ? ' is-paid' : ''}`} onClick={() => onClaim(q)}>
      <span className="q-text">
        <b>{q.text}</b>
      </span>
      <span className="q-bar">
        <i style={{width: `${(shown / of) * 100}%`}} />
      </span>
      <span className="q-meta">
        <span>
          {shown.toLocaleString()}/{of.toLocaleString()}
        </span>
        <span className="q-reward">
          {done ? (
            <>
              <Check size={13} /> Claimed
            </>
          ) : (
            <>
              <Coin size={13} />
              {ready ? `Claim +${q.reward}` : `+${q.reward}`}
            </>
          )}
        </span>
      </span>
    </button>
  );
}
