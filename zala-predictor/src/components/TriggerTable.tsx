import { useTranslation } from 'react-i18next';
import type { Trigger } from '../lib/predictorEngine';

interface Props {
  triggers: Trigger[];
  limit?: number;
}

export function TriggerTable({ triggers, limit = 12 }: Props) {
  const { t } = useTranslation('engine');
  const rows = triggers.slice(-limit).reverse();
  return (
    <div className="glass overflow-hidden">
      <h2 className="border-b border-border p-4 font-heading text-sm font-semibold uppercase tracking-widest text-muted">
        {t('table_title')}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted">
              <th className="px-4 py-2.5 font-medium">{t('table.round')}</th>
              <th className="px-4 py-2.5 font-medium">{t('table.mult')}</th>
              <th className="px-4 py-2.5 font-medium">{t('table.next4')}</th>
              <th className="px-4 py-2.5 font-medium">{t('table.avg')}</th>
              <th className="px-4 py-2.5 font-medium">{t('table.max')}</th>
              <th className="px-4 py-2.5 font-medium">{t('table.signal')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  {t('table.empty')}
                </td>
              </tr>
            )}
            {rows.map((tr) => (
              <tr key={tr.roundId} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-mono text-muted">#{tr.roundId}</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-danger">
                  {tr.triggerMultiplier.toFixed(2)}x
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex gap-1">
                    {tr.nextN.map((m, i) => (
                      <span
                        key={i}
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${
                          m >= 2 ? 'bg-primary/15 text-primary' : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {m.toFixed(2)}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-text">{tr.avgNext.toFixed(2)}x</td>
                <td className="px-4 py-2.5 font-mono text-text">{tr.maxNext.toFixed(2)}x</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                      tr.won ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                    }`}
                  >
                    {tr.won ? t('table.won') : t('table.lost')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TriggerTable;
