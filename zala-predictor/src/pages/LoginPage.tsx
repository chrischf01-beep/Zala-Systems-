import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthShell } from '../components/AuthShell';
import { Button, Card, Input } from '../components/ui';
import { MailIcon } from '../components/svg/icons';
import { useAuthStore, AuthError } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { usePredictStore } from '../stores/predictStore';
import { toast } from '../stores/toastStore';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const newSession = usePredictStore((s) => s.newSession);
  const loadRecords = usePredictStore((s) => s.loadRecords);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!emailRe.test(email)) next.email = t('errors.invalid_email');
    if (!password) next.password = t('errors.invalid_credentials');
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await signIn(email, password);
      const u = useAuthStore.getState().user;
      if (u) setLanguage(u.language);
      newSession();
      loadRecords();
      toast(t('signed_in'), 'success');
      navigate('/dashboard');
    } catch (err) {
      const code = err instanceof AuthError ? err.message : 'invalid_credentials';
      setErrors({ form: t(`errors.${code}`, { defaultValue: t('errors.invalid_credentials') }) });
    }
  };

  return (
    <AuthShell>
      <Card strong className="p-6 text-center sm:p-8">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#00E5C0,#FF3D7F)] text-[#04121a]">
          <MailIcon size={24} />
        </span>
        <h1 className="font-heading text-2xl font-bold">{t('welcome_back')}</h1>
        <p className="mt-1 text-sm text-muted">{t('sign_in_subtitle')}</p>

        {(location.state as { verificationSent?: boolean; authError?: boolean } | null)?.verificationSent && (
          <p role="status" className="mt-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            Check your inbox and verify your email before signing in.
          </p>
        )}
        {(location.state as { verificationSent?: boolean; authError?: boolean } | null)?.authError && (
          <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            That account link is invalid or expired. Request a new link and try again.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-left" noValidate>
          {errors.form && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {errors.form}
            </p>
          )}
          <Input
            label={t('email')}
            type="email"
            autoComplete="email"
            icon={<MailIcon size={18} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            placeholder="you@example.com"
          />
          <Input
            label={t('password')}
            type="password"
            revealPassword
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="••••••••"
          />
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-surface accent-[#00E5C0]"
              />
              {t('remember_me')}
            </label>
            <Link to="/reset" className="text-primary hover:underline">
              {t('forgot_password')}
            </Link>
          </div>
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {t('sign_in')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t('no_account')}{' '}
          <Link to="/register" className="text-primary hover:underline">
            {t('create_account')}
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}

export default LoginPage;
