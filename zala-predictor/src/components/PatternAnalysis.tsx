import { useTranslation } from 'react-i18next';
import type { Round, Trigger, TriggerStats } from '../lib/predictorEngine';
import type { WindowSize } from '../hooks/usePredictorEngine';
import { LineChart } from './svg/LineChart';
import { TriggerTable } from './TriggerTable';

interface Props {
  rounds: Round[];
  triggers: Trigger[];
  triggerStats: TriggerStats;
  selectedWindow: WindowSize;
  onSelectWindow: (w: WindowSize) => void;
}

const WINDOWS: { value: WindowSize; key: string }[] = [
  { value: 50, key: 'w50' },
  { value: 100, key: 'w100' },
  { value: 500, key: 'w500' },
  { value: 'all', key: 'wall' },
];

export function PatternAnalysis({ rounds, triggers, triggerStats, selectedWindow, onSelectWindow }: Props) {
  const { t } = useTranslation('engine');
  const kpis = [
    { label: t('kpi.triggers'), value: String(triggerStats.total), sub: `${triggerStats.percentOfRounds}%` },
    { label: t('kpi.win_rate'), value: `${triggerStats.winRate}%`, sub: `${triggerStats.wins} / ${triggerStats.losses}` },
    { label: t('kpi.avg_following'), value: `${triggerStats.avgFollowing.toFixed(2)}x`, sub: '' },
  ];
  return (
    <section className="space-y-4">
      <div className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-muted">
            {t('pattern_title')}
          </h2>
          <div className="flex gap-1.5" role="group" aria-label={t('window_label')}>
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => onSelectWindow(w.value)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
                  selectedWindow === w.value
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-surface/50 text-muted hover:border-primary/40 hover:text-text'
                }`}
              >
                {t(w.key)}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-border bg-surface/60 p-3 text-xs leading-relaxed text-muted">
          {t('info_note')}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-surface/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{k.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold text-text">{k.value}</p>
              {k.sub && <p className="font-mono text-[11px] text-muted">{k.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-5">
        <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-muted">
          {t('timeline')}
        </h3>
        <LineChart data={rounds.slice(-80).map((r) => r.multiplier)} height={240} />
      </div>

      <TriggerTable triggers={triggers} />
    </section>
  );
}

export default PatternAnalysis;
