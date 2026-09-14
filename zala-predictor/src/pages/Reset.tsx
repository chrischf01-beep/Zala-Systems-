import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthShell } from '../components/AuthShell';
import { Button, Card, Input } from '../components/ui';
import { MailIcon } from '../components/svg/icons';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Reset() {
  const { t } = useTranslation('auth');
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailRe.test(email)) {
      setError(t('errors.invalid_email'));
      return;
    }
    setError(undefined);
    await resetPassword(email);
    setSent(true);
    toast(t('reset_link_sent'), 'success');
  };

  return (
    <AuthShell>
      <Card strong className="p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <EnvelopeArt />
            <h1 className="mt-4 font-heading text-2xl font-bold">{t('reset_sent_title')}</h1>
            <p className="mt-2 text-sm text-muted">{t('reset_sent_body')}</p>
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="ghost" className="w-full">
                {t('back_to_signin')}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-bold">{t('reset_password')}</h1>
            <p className="mt-1 text-sm text-muted">{t('reset_subtitle')}</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <Input
                label={t('email')}
                type="email"
                icon={<MailIcon size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                autoComplete="email"
                placeholder="you@example.com"
              />
              <Button type="submit" size="lg" loading={loading} className="w-full">
                {t('send_reset')}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              <Link to="/login" className="text-primary hover:underline">
                {t('back_to_signin')}
              </Link>
            </p>
          </>
        )}
      </Card>
    </AuthShell>
  );
}

function EnvelopeArt() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" className="mx-auto" role="img" aria-label="Envelope">
      <defs>
        <linearGradient id="env" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E5C0" />
          <stop offset="1" stopColor="#FF3D7F" />
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="100" height="60" rx="8" fill="none" stroke="url(#env)" strokeWidth="3" />
      <path d="M12 26l48 32 48-32" fill="none" stroke="url(#env)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="94" cy="22" r="9" fill="#3DFF8F" opacity="0.9" />
      <path d="M90 22l3 3 5-6" fill="none" stroke="#05070F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default Reset;
