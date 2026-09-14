import { useTranslation } from 'react-i18next';
import { Dropdown } from './ui';
import { GlobeIcon } from './svg/icons';
import { useSettingsStore } from '../stores/settingsStore';
import type { Language } from '../lib/types';

export function LanguageSwitcher() {
  const { t } = useTranslation('common');
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return (
    <Dropdown
      ariaLabel={t('lang.label')}
      align="right"
      items={[
        { value: 'en', label: t('lang.en') },
        { value: 'sw', label: t('lang.sw') },
      ]}
      value={language}
      onChange={(v) => setLanguage(v as Language)}
      trigger={
        <span className="inline-flex items-center gap-2">
          <GlobeIcon size={18} />
          <span className="font-mono text-xs uppercase">{language}</span>
        </span>
      }
    />
  );
}

export default LanguageSwitcher;
