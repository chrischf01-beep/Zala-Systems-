import { useTranslation } from 'react-i18next';
import { AlertIcon } from './svg/icons';

export function Disclaimer() {
  const { t } = useTranslation('common');
  return (
    <div
      role="note"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 px-4 py-2"
    >
      <p className="mx-auto flex max-w-6xl items-center gap-2 text-[11px] leading-snug text-muted">
        <AlertIcon size={13} className="shrink-0 text-tertiary" />
        <span>{t('disclaimer')}</span>
      </p>
    </div>
  );
}

export default Disclaimer;
