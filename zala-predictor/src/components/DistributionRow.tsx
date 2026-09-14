import { useTranslation } from 'react-i18next';
import type { DistributionBucket } from '../lib/predictorEngine';

interface Props {
  buckets: DistributionBucket[];
}

export function DistributionRow({ buckets }: Props) {
  const { t } = useTranslation('engine');
  return (
    <div className="glass p-5">
      <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-widest text-muted">
        {t('distribution_title')}
      </h2>
      <div className="space-y-3">
        {buckets.map((b) => (
          <div key={b.key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-mono text-muted">{t(`bands.${b.key}`)}</span>
              <span className="font-mono text-text">
                {b.percent}% <span className="text-muted">· {b.count}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, b.percent)}%`, background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DistributionRow;
