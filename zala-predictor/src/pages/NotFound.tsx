import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeroBackground } from '../components/svg/HeroBackground';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/svg/Logo';
import { Button } from '../components/ui';
import { useAuthStore } from '../stores/authStore';

export function NotFound() {
  const { t } = useTranslation(['errors', 'common']);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <HeroBackground />
      </div>
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link to="/" aria-label={t('common:app_name')}>
          <Logo size={32} />
        </Link>
        <LanguageSwitcher />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="font-mono text-[6rem] font-bold leading-none text-gradient sm:text-[9rem]">404</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold">{t('errors:not_found_title')}</h1>
        <p className="mt-2 max-w-md text-sm text-muted">{t('errors:not_found_body')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => navigate(user ? '/dashboard' : '/')}>
            {user ? t('errors:back_dashboard') : t('errors:back_home')}
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t('common:actions.back')}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default NotFound;
