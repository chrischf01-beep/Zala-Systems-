import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogoMark } from './svg/Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LogoutIcon } from './svg/icons';
import { useAuthStore } from '../stores/authStore';
import { usePredictStore } from '../stores/predictStore';
import { toast } from '../stores/toastStore';

const tabs = [
  { to: '/dashboard', key: 'dashboard' },
  { to: '/predict', key: 'predict' },
  { to: '/history', key: 'history' },
  { to: '/statistics', key: 'statistics' },
  { to: '/membership', key: 'membership' },
  { to: '/account', key: 'account' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const newSession = usePredictStore((s) => s.newSession);

  const visibleTabs = user?.is_admin ? [...tabs, { to: '/admin', key: 'admin' }] : tabs;

  const handleLogout = async () => {
    await signOut();
    newSession();
    toast(t('nav.logout'), 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <NavLink to="/dashboard" className="flex items-center gap-3" aria-label={t('app_name')}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <LogoMark size={26} animate={false} />
            </span>
            <span className="leading-tight">
              <span className="block font-heading text-base font-bold sm:text-lg">
                <span className="text-gradient">Zala</span> <span className="text-text">Predictor</span>
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">
                {t('nav.dashboard')} · {user?.full_name ?? ''}
              </span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-text transition-colors hover:border-danger hover:text-danger"
            >
              <LogoutIcon size={16} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6" aria-label="Sections">
          <div className="flex min-w-max gap-2">
            {visibleTabs.map(({ to, key }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-xl border px-3.5 py-2 text-sm transition-all ${
                    isActive
                      ? 'border-primary/50 bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(0,229,192,0.2)]'
                      : 'border-border bg-surface/50 text-muted hover:border-primary/40 hover:text-text'
                  }`
                }
              >
                {t(`nav.${key}`)}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 pb-20 sm:px-6 sm:py-8 sm:pb-20">
        {children}
      </main>
    </div>
  );
}

export default AppShell;
