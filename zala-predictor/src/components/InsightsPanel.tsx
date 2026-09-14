import { useTranslation } from 'react-i18next';
import { BoltIcon } from './svg/icons';

interface Props {
  insights: string[];
}

export function InsightsPanel({ insights }: Props) {
  const { t } = useTranslation('engine');
  return (
    <div className="glass p-5">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-widest text-muted">
        <BoltIcon size={15} className="text-primary" />
        {t('insights_title')}
      </h2>
      <ul className="space-y-2.5">
        {insights.map((line, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-text">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default InsightsPanel;
