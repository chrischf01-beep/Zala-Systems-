import { useTranslation } from 'react-i18next';
import type { Round } from '../lib/predictorEngine';
import { BarChart } from './svg/BarChart';

interface Props {
  rounds: Round[];
  limit?: number;
}

export function RecentRoundsChart({ rounds, limit = 40 }: Props) {
  const { t } = useTranslation('engine');
  const data = rounds.slice(-limit).map((r) => r.multiplier);
  return (
    <div className="glass p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-muted">
          {t('recent_title')}
        </h2>
        <span className="font-mono text-[11px] text-muted">{data.length}</span>
      </div>
      <BarChart
        data={data}
        height={200}
        colorFor={(v) => (v >= 2 ? '#00E5C0' : v >= 1.5 ? '#FFB020' : '#FF5470')}
      />
    </div>
  );
}

export default RecentRoundsChart;
