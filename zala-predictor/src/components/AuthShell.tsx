import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeroBackground } from './svg/HeroBackground';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LogoMark } from './svg/Logo';

export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <HeroBackground />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(0,229,192,0.10),transparent_60%)]" />

      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-6">
        <LanguageSwitcher />
      </div>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-10 pb-24">
        <Link to="/" className="mb-6 flex flex-col items-center gap-3" aria-label={t('app_name')}>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-glow">
            <LogoMark size={38} />
          </span>
          <span className="text-center font-heading text-xl font-bold tracking-wide sm:text-2xl">
            <span className="text-gradient">Zala</span> <span className="text-text">Predictor</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            {t('tagline')}
          </span>
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

export default AuthShell;
