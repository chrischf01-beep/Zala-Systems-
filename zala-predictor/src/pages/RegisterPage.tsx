import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthShell } from '../components/AuthShell';
import { Button, Card, Input } from '../components/ui';
import { MailIcon, CheckIcon, ChevronIcon, LockIcon } from '../components/svg/icons';
import { useAuthStore, AuthError } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSiteStore } from '../stores/siteStore';
import { usePredictStore } from '../stores/predictStore';
import { toast } from '../stores/toastStore';
import { PLANS, formatTsh } from '../lib/plans';
import type { PlanId, Profile } from '../lib/types';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Req {
  id: string;
  test: (pw: string) => boolean;
}

const REQS: Req[] = [
  { id: 'len', test: (pw) => pw.length >= 8 },
  { id: 'upper', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower', test: (pw) => /[a-z]/.test(pw) },
  { id: 'num', test: (pw) => /\d/.test(pw) },
];

const PROFILES: Profile[] = ['aggressive', 'balanced', 'conservative'];

export function RegisterPage() {
  const { t } = useTranslation(['auth', 'common', 'settings', 'member']);
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);
  const setSettings = useSettingsStore();
  const language = useSettingsStore((s) => s.language);
  const registrationEnabled = useSiteStore((s) => s.registration_enabled);
  const newSession = usePredictStore((s) => s.newSession);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [profile, setProfile] = useState<Profile>('balanced');
  const [phone, setPhone] = useState('');
  const [bettingCompany, setBettingCompany] = useState('');
  const [plan, setPlan] = useState<PlanId>('daily');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const met = useMemo(() => REQS.map((r) => r.test(password)), [password]);
  const allMet = met.every(Boolean);

  const goNext = () => {
    if (step === 1) {
      const next: Record<string, string | undefined> = {};
      if (!name.trim()) next.name = t('auth:errors.name_required');
      if (username.trim().length < 3) next.username = t('auth:errors.username_short');
      if (!emailRe.test(email)) next.email = t('auth:errors.invalid_email');
      if (!allMet || !/[^A-Za-z0-9]/.test(password)) next.password = t('auth:errors.weak_password');
      if (password !== confirm) next.confirm = t('auth:errors.password_mismatch');
      setErrors(next);
      if (Object.values(next).some(Boolean)) return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = async () => {
    try {
      await signUp({
        email,
        username: username.trim(),
        full_name: name,
        password,
        language,
        profile,
        phone,
        betting_company: bettingCompany,
      });
      setSettings.setProfile(profile);
      newSession();
      const createdUser = useAuthStore.getState().user;
      if (createdUser) {
        toast(t('auth:signed_up'), 'success');
        navigate('/membership', { state: { plan } });
      } else {
        toast('Account created. Check your email to verify it before signing in.', 'success');
        navigate('/login', { state: { verificationSent: true } });
      }
    } catch (err) {
      const code = err instanceof AuthError ? err.message : 'invalid_credentials';
      setErrors({ form: t(`auth:errors.${code}`, { defaultValue: t('auth:errors.invalid_credentials') }) });
      setStep(1);
    }
  };

  if (!registrationEnabled) {
    return (
      <AuthShell>
        <Card strong className="p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/15 text-danger">
            <LockIcon size={24} />
          </span>
          <h1 className="font-heading text-xl font-bold">{t('member:registration_closed')}</h1>
          <p className="mt-2 text-sm text-muted">{t('member:registration_closed_body')}</p>
          <Link to="/login" className="mt-6 inline-block">
            <Button>{t('auth:sign_in')}</Button>
          </Link>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card strong className="overflow-hidden">
        <div className="border-b border-border p-6 text-center sm:p-7">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#00E5C0,#FF3D7F)] text-[#04121a]">
            <MailIcon size={24} />
          </span>
          <h1 className="font-heading text-2xl font-bold">{t('auth:create_account')}</h1>
          <p className="mt-1 text-sm text-muted">{t('auth:sign_up_subtitle')}</p>
          <Stepper step={step} />
        </div>

        <div className="p-6 sm:p-7">
          {errors.form && (
            <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {errors.form}
            </p>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Input label={t('auth:full_name')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" placeholder="Amani Juma" />
              <Input label={t('auth:username')} value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} autoComplete="username" placeholder="amani_j" helper={t('auth:username_hint')} />
              <Input label={t('auth:email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" placeholder="you@example.com" />
              <div>
                <Input label={t('auth:password')} type="password" revealPassword value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" placeholder="••••••••" />
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {REQS.map((r, i) => (
                    <li key={r.id} className={`flex items-center gap-1.5 text-[11px] ${met[i] ? 'text-success' : 'text-muted'}`}>
                      {met[i] ? <CheckIcon size={12} /> : <span className="inline-block h-1 w-1 rounded-full bg-muted" />}
                      {t(`auth:req.${r.id}`, { defaultValue: r.id })}
                    </li>
                  ))}
                </ul>
              </div>
              <Input label={t('auth:confirm_password')} type="password" revealPassword value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} autoComplete="new-password" placeholder="••••••••" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted">{t('settings:profile_desc')}</p>
              <div className="grid gap-3">
                {PROFILES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProfile(p)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      profile === p ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className={`font-semibold ${profile === p ? 'text-primary' : 'text-text'}`}>
                      {t(`settings:profiles.${p}`)}
                    </p>
                    <p className="mt-1 text-xs text-muted">{t(`settings:profile_help.${p}`)}</p>
                  </button>
                ))}
              </div>
              <Input label={t('member:phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 7XX XXX XXX" autoComplete="tel" />
              <Input label={t('member:betting_company')} value={bettingCompany} onChange={(e) => setBettingCompany(e.target.value)} placeholder="BetPawa" />
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="mb-4 text-center text-sm text-muted">{t('member:choose_plan')}</p>
              <div className="grid gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      plan === p.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span>
                      <span className={`block font-heading text-base font-semibold ${plan === p.id ? 'text-primary' : 'text-text'}`}>
                        {t(p.labelKey)}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{t(p.descKey)}</span>
                    </span>
                    <span className="ml-3 text-right">
                      <span className="block font-mono text-lg font-bold text-text">{formatTsh(p.priceTsh)}</span>
                      <span className="block text-[10px] uppercase tracking-widest text-muted">/ {p.days}d</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-4 rounded-lg border border-border bg-surface2/50 px-3 py-2 text-xs text-muted">
                {t('member:pay_after_register')}
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <Button variant="ghost" className="flex-1" onClick={() => setStep((s) => s - 1)} icon={<ChevronIcon size={16} className="rotate-90" />}>
                {t('common:actions.back')}
              </Button>
            )}
            {step < 3 ? (
              <Button className="flex-1" onClick={goNext}>
                {t('common:actions.continue')}
              </Button>
            ) : (
              <Button className="flex-1" loading={loading} onClick={submit}>
                {t('auth:sign_up')}
              </Button>
            )}
          </div>
        </div>

        <p className="border-t border-border p-4 text-center text-sm text-muted">
          {t('auth:have_account')}{' '}
          <Link to="/login" className="text-primary hover:underline">
            {t('auth:sign_in')}
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
              step === n
                ? 'bg-primary text-[#04121a]'
                : step > n
                ? 'bg-primary/30 text-primary'
                : 'bg-surface2 text-muted'
            }`}
          >
            {step > n ? <CheckIcon size={13} /> : n}
          </span>
          {n < 3 && <span className={`h-px w-8 ${step > n ? 'bg-primary/50' : 'bg-border'}`} />}
        </span>
      ))}
    </div>
  );
}

export default RegisterPage;
