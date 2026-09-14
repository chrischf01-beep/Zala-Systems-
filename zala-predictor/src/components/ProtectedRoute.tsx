import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useSiteStore } from '../stores/siteStore';
import { AppShell } from './AppShell';
import { Card } from './ui';
import { AlertIcon } from './svg/icons';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const maintenance = useSiteStore((s) => s.maintenance_mode);
  const location = useLocation();

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card strong className="max-w-md p-8 text-center">
          <span className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-2xl bg-surface2" />
          <p className="text-sm text-muted">{t('loading', { defaultValue: 'Loading…' })}</p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (maintenance && !user.is_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card strong className="max-w-md p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-tertiary/40 bg-tertiary/10 text-tertiary">
            <AlertIcon size={26} />
          </span>
          <h1 className="font-heading text-xl font-bold">{t('maintenance_title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('maintenance_body')}</p>
        </Card>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

export default ProtectedRoute;
