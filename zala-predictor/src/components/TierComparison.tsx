import { useTranslation } from 'react-i18next';
import type { Signal, TierName } from '../lib/predictorEngine';
import { LayersIcon } from './svg/icons';

interface Props {
  tiers: { target: number; signal: Signal }[];
  selectedTier: TierName;
  onSelectTier: (t: TierName) => void;
}

const TIER_ACCENT: Record<TierName, string> = {
  Safe: '#3DFF8F',
  Medium: '#00E5C0',
  High: '#FFB020',
  Moonshot: '#FF3D7F',
};

export function TierComparison({ tiers, selectedTier, onSelectTier }: Props) {
  const { t } = useTranslation('engine');
  return (
    <section className="glass p-5">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-widest text-muted">
        <LayersIcon size={15} className="text-primary" />
        {t('tier_compare_title')}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiers.map(({ target, signal }) => {
          const active = selectedTier === signal.tier;
          return (
            <button
              key={target}
              type="button"
              onClick={() => onSelectTier(signal.tier)}
              className={`rounded-xl border p-4 text-left transition-all ${
                active ? 'border-primary/60 bg-primary/10' : 'border-border bg-surface/50 hover:border-primary/40'
              }`}
            >
              <p className="font-heading text-xl font-bold" style={{ color: TIER_ACCENT[signal.tier] }}>
                {target.toFixed(2)}x
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t(`tiers.${signal.tier}`)} · {t(`risks.${signal.riskLevel}`)}
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">{t('compare.conf')}</span>
                  <span className="font-mono text-text">{signal.confidence}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{t('compare.win')}</span>
                  <span className="font-mono text-text">{signal.confidenceBreakdown.winRate.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{t('compare.sample')}</span>
                  <span className="font-mono text-text">{signal.confidenceBreakdown.sampleSize}</span>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${signal.confidence}%`, background: TIER_ACCENT[signal.tier] }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default TierComparison;
