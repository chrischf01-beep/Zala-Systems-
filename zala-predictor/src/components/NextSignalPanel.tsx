import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Signal, SignalAction, TierName } from '../lib/predictorEngine';
import { RefreshIcon, TargetIcon, TimerIcon } from './svg/icons';

interface Props {
  signal: Signal;
  allTiers: { target: number; signal: Signal }[];
  selectedTier: TierName;
  onSelectTier: (t: TierName) => void;
  countdown: number;
  action: SignalAction;
  onRegenerate: () => void;
}

const TIER_COLOR: Record<TierName, string> = {
  Safe: 'text-success border-success/40 bg-success/10',
  Medium: 'text-primary border-primary/40 bg-primary/10',
  High: 'text-tertiary border-tertiary/40 bg-tertiary/10',
  Moonshot: 'text-secondary border-secondary/40 bg-secondary/10',
};

const ACTION_COLOR: Record<SignalAction, string> = {
  Standby: 'text-muted border-border bg-surface/60',
  'Bet Now': 'text-primary border-primary/50 bg-primary/15',
  'Cash Out': 'text-secondary border-secondary/50 bg-secondary/15',
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const GET_READY_SECONDS = 15;
const ENTER_NOW_SECONDS = 8;

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function NextSignalPanel({ signal, allTiers, selectedTier, onSelectTier, countdown, action, onRegenerate }: Props) {
  const { t } = useTranslation('engine');
  const now = useNow();
  const realTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const prompt: 'enter_now' | 'get_ready' | null =
    countdown <= ENTER_NOW_SECONDS ? 'enter_now' : countdown <= GET_READY_SECONDS ? 'get_ready' : null;
  return (
    <section className="glass-strong overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-widest text-muted">
          <TargetIcon size={16} className="text-primary" />
          {t('signal_title')}
        </h2>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 font-mono text-[11px] text-text"
            title={t('fields.real_time')}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {realTime}
          </span>
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <RefreshIcon size={13} />
            {t('regenerate')}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-border p-3">
        {allTiers.map(({ target, signal: s }) => (
          <button
            key={target}
            type="button"
            onClick={() => onSelectTier(s.tier)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-left transition-colors ${
              selectedTier === s.tier
                ? TIER_COLOR[s.tier]
                : 'border-border bg-surface/50 text-muted hover:border-primary/40 hover:text-text'
            }`}
          >
            <span className="block font-mono text-xs font-bold">{target.toFixed(2)}x</span>
            <span className="block font-mono text-[10px] uppercase tracking-widest">{t(`tiers.${s.tier}`)}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex items-end gap-3">
            <span className="font-heading text-5xl font-bold text-gradient">
              {signal.targetMultiplier.toFixed(2)}x
            </span>
            <span className={`mb-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${TIER_COLOR[signal.tier]}`}>
              {t(`tiers.${signal.tier}`)}
            </span>
            <span className="mb-1 rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted">
              {t(`risks.${signal.riskLevel}`)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-lg font-bold ${ACTION_COLOR[action]}`}>
              <TimerIcon size={18} />
              {pad(mins)}:{pad(secs)}
            </span>
            <span className={`rounded-xl border px-3 py-2 font-mono text-sm font-semibold ${ACTION_COLOR[action]}`}>
              {t(`actions.${action.replace(' ', '_')}`)}
            </span>
            {prompt && (
              <span
                role="status"
                aria-live="assertive"
                className={`rounded-xl border px-4 py-2 font-heading text-sm font-bold uppercase tracking-widest ${
                  prompt === 'enter_now'
                    ? 'animate-pulse border-secondary bg-secondary/20 text-secondary'
                    : 'border-tertiary bg-tertiary/15 text-tertiary'
                }`}
              >
                {prompt === 'enter_now' ? t('prompts.enter_now') : t('prompts.get_ready')}
              </span>
            )}
          </div>

          <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary">
            <TargetIcon size={13} />
            {t('prompts.cash_out_at', { target: signal.cashOutAt.toFixed(2) })}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('fields.cash_out')}</dt>
              <dd className="font-mono text-text">{signal.cashOutAt.toFixed(2)}x</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('fields.entry')}</dt>
              <dd className="font-mono text-text">{signal.entryTimeFormatted}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('fields.next_in')}</dt>
              <dd className="font-mono text-text">{signal.nextSignalInMinutes}m</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('fields.streak')}</dt>
              <dd className="font-mono text-text">{signal.currentStreak}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('fields.based_on')}</dt>
              <dd className="font-mono text-text">{signal.basedOnRounds}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('fields.avg_following')}</dt>
              <dd className="font-mono text-text">{signal.avgFollowingMultiplier.toFixed(2)}x</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{t('fields.confidence')}</span>
            <span className="font-heading text-2xl font-bold text-primary">{signal.confidence}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#00E5C0,#FF3D7F)] transition-all duration-500"
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
          <ul className="mt-4 space-y-2 text-xs">
            <li className="flex justify-between">
              <span className="text-muted">{t('breakdown.win_rate')}</span>
              <span className="font-mono text-text">{signal.confidenceBreakdown.winRate.toFixed(1)}%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{t('breakdown.sample')}</span>
              <span className="font-mono text-text">{signal.confidenceBreakdown.sampleSize}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{t('breakdown.volatility')}</span>
              <span className="font-mono text-text">{signal.confidenceBreakdown.volatility.toFixed(3)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted">{t('breakdown.trigger_win')}</span>
              <span className="font-mono text-text">{signal.winRate.toFixed(1)}%</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default NextSignalPanel;
