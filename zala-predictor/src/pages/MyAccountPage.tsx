import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Dropdown, Modal, Toggle } from '../components/ui';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import * as db from '../lib/db';
import { PLANS, formatTsh, planById } from '../lib/plans';
import { CardIcon, CheckIcon, CopyIcon, PredictIcon } from '../components/svg/icons';
import type { Language, Payment, PlanId, Profile, Theme } from '../lib/types';

export function MyAccountPage() {
  const { t, i18n } = useTranslation(['settings', 'common', 'predict', 'auth', 'member']);
  const navigate = useNavigate();
  const s = useSettingsStore();
  const user = useAuthStore((st) => st.user);
  const updateUser = useAuthStore((st) => st.updateUser);
  const deleteAccount = useAuthStore((st) => st.deleteAccount);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const apiKey = `zala_${user?.id.slice(0, 8) ?? 'guest'}_sk_live_readonly`;
  const initials = user?.full_name
    ? user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'Z';
  const status = user ? db.effectiveStatus(user) : 'pending';
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
  const expiryLabel = user?.member_expiry != null ? dateFmt.format(user.member_expiry) : '--';

  const payments = useMemo<Payment[]>(() => (user ? db.listPaymentsForUser(user.id) : []), [user]);

  const progress = (() => {
    const start = user?.member_start;
    const expiry = user?.member_expiry;
    if (start == null || expiry == null || expiry <= start) {
      return { used: 0, remaining: 0, pct: 0, total: 0 };
    }
    const total = Math.max(1, Math.round((expiry - start) / 86400000));
    const used = Math.min(total, Math.max(0, Math.round((Date.now() - start) / 86400000)));
    const remaining = Math.max(0, total - used);
    return { used, remaining, total, pct: Math.min(100, Math.round((used / total) * 100)) };
  })();

  const changePlan = (planId: PlanId) => {
    if (user) updateUser({ plan: planId });
    navigate('/membership', { state: { plan: planId } });
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast(t('common:actions.copied'), 'success');
    } catch {
      toast(t('common:status.error'), 'error');
    }
  };

  const onLanguage = (l: Language) => {
    s.setLanguage(l);
    if (user) updateUser({ language: l });
  };
  const onProfile = (p: Profile) => {
    s.setProfile(p);
    if (user) updateUser({ profile: p });
  };

  const confirmDelete = async () => {
    await deleteAccount();
    toast(t('account_deleted'), 'info');
    setConfirmOpen(false);
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <Card className="flex items-center gap-4 p-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#00E5C0,#FF3D7F)] font-mono text-lg font-bold text-[#04121a]">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-xl font-bold sm:text-2xl">
            {t('settings:title')}: {user?.full_name}
          </h1>
          <p className="truncate text-sm text-muted">{user?.email}</p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <CardIcon size={22} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted">{t('member:current_status')}</p>
              <p className="font-heading text-lg font-semibold text-text">
                {user?.plan ? t(`member:plans.${user.plan}.label`) : t('member:not_assigned')}
              </p>
              <p className="text-xs text-muted">
                {t(`member:status.${status}`)} · {t('member:expires')} {expiryLabel}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {t('member:user_id')}: {user?.user_code ?? t('member:not_assigned')}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/membership', { state: { plan: user?.plan ?? undefined } })}>
            {t('member:renew')}
          </Button>
        </div>

        {progress.total > 0 && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between font-mono text-[11px] text-muted">
              <span>{t('member:days_used', { days: progress.used })}</span>
              <span>{t('member:days_remaining', { days: progress.remaining })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#00E5C0,#FF3D7F)] transition-all duration-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted">{t('member:change_plan')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => {
              const current = user?.plan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => changePlan(p.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    current ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className={`block font-heading text-sm font-semibold ${current ? 'text-primary' : 'text-text'}`}>
                    {t(`member:plans.${p.id}.label`)}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-muted">{formatTsh(p.priceTsh)}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-widest text-muted">
                    {current ? t('member:current_plan') : t('member:switch_to')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">{t('member:payments_title')}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted">{t('member:empty_payments')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">{t('member:date')}</th>
                  <th className="py-2 pr-3">{t('member:plan')}</th>
                  <th className="py-2 pr-3">{t('member:amount')}</th>
                  <th className="py-2 pr-3">{t('member:reference')}</th>
                  <th className="py-2">{t('member:current_status')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 text-muted">{dateFmt.format(p.created_at)}</td>
                    <td className="py-2.5 pr-3">{t(`member:plans.${p.plan}.label`)}</td>
                    <td className="py-2.5 pr-3 font-mono">{formatTsh(p.amount)}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{p.reference}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                          p.status === 'approved'
                            ? 'border-success/40 bg-success/10 text-success'
                            : p.status === 'rejected'
                            ? 'border-danger/40 bg-danger/10 text-danger'
                            : 'border-tertiary/40 bg-tertiary/10 text-tertiary'
                        }`}
                      >
                        {p.status === 'approved' && <CheckIcon size={11} />}
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <PredictIcon size={22} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted">{t('predict:model')}</p>
            <p className="font-heading text-lg font-semibold text-text">Zala-MC-Bayes-v1</p>
            <p className="text-xs text-muted">5000 {t('predict:monte_carlo_runs').toLowerCase()}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-success/40 bg-success/10 px-3.5 py-1.5 text-sm text-success sm:self-auto">
          <CheckIcon size={14} />
          {t('common:status.online')}
        </span>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold">{t('settings:subtitle')}</h2>
          <dl className="divide-y divide-border text-sm">
            <DetailRow label={t('common:nav.account')} value={user?.full_name ?? '--'} />
            <DetailRow label={t('auth:username')} value={user?.username ? `@${user.username}` : '--'} />
            <DetailRow label={t('auth:email')} value={user?.email ?? '--'} />
            <DetailRow label={t('settings:language')} value={t(`common:lang.${s.language}`)} />
            <DetailRow label={t('settings:theme')} value={t(`common:theme.${s.theme}`)} />
            <DetailRow label={t('settings:profile')} value={t(`settings:profiles.${s.profile}`)} />
          </dl>
        </Card>

        <Card className="space-y-5 p-6">
          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold">{t('settings:language')}</h2>
            <div className="flex gap-2">
              {(['en', 'sw'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onLanguage(l)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition-all ${
                    s.language === l
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-border text-muted hover:border-primary hover:text-text'
                  }`}
                >
                  {t(`common:lang.${l}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold">{t('settings:theme')}</h2>
            <Dropdown
              ariaLabel={t('settings:theme')}
              items={[
                { value: 'dark', label: t('common:theme.dark') },
                { value: 'light', label: t('common:theme.light') },
              ]}
              value={s.theme}
              onChange={(v) => s.setTheme(v as Theme)}
            />
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold">{t('settings:notifications')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-text">{t('settings:notify_predict')}</span>
                <Toggle checked={s.notifyPredict} onChange={s.setNotifyPredict} label={t('settings:notify_predict')} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-text">{t('settings:notify_system')}</span>
                <Toggle checked={s.notifySystem} onChange={s.setNotifySystem} label={t('settings:notify_system')} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold">{t('settings:profile')}</h2>
        <p className="mt-1 text-sm text-muted">{t('settings:profile_desc')}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(['aggressive', 'balanced', 'conservative'] as Profile[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onProfile(p)}
              className={`rounded-xl border p-4 text-left transition-all ${
                s.profile === p ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              <p className={`font-semibold ${s.profile === p ? 'text-primary' : 'text-text'}`}>
                {t(`settings:profiles.${p}`)}
              </p>
              <p className="mt-1 text-xs text-muted">{t(`settings:profile_help.${p}`)}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-2 font-heading text-lg font-semibold">{t('settings:api_key')}</h2>
        <p className="mb-4 text-sm text-muted">{t('settings:api_key_hint')}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-border bg-bg/60 px-3 py-2.5 font-mono text-xs text-primary">
            {apiKey}
          </code>
          <Button variant="ghost" size="sm" onClick={copyKey} icon={copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}>
            {copied ? t('common:actions.copied') : t('common:actions.copy')}
          </Button>
        </div>
      </Card>

      <Card className="border-danger/40 p-6">
        <h2 className="font-heading text-lg font-semibold text-danger">{t('settings:danger_zone')}</h2>
        <p className="mt-1 text-sm text-muted">{t('settings:delete_warning')}</p>
        <Button variant="danger" className="mt-4" onClick={() => setConfirmOpen(true)}>
          {t('settings:delete_account')}
        </Button>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('settings:delete_account')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('common:actions.delete')}
            </Button>
          </>
        }
      >
        {t('settings:delete_warning')}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-medium text-text">{value}</dd>
    </div>
  );
}

export default MyAccountPage;
