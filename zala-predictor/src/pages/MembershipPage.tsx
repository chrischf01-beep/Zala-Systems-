import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input } from '../components/ui';
import { CardIcon, CheckIcon, ShieldIcon } from '../components/svg/icons';
import { useAuthStore } from '../stores/authStore';
import { useSiteStore } from '../stores/siteStore';
import { toast } from '../stores/toastStore';
import * as db from '../lib/db';
import { PLANS, formatTsh, planById } from '../lib/plans';
import type { Payment, PaymentMethod, PlanId } from '../lib/types';
import { useAsyncList } from '../hooks/useAsyncList';

const METHODS: PaymentMethod[] = ['mpesa', 'airtel', 'halopesa'];
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;

const STATUS_STYLE: Record<string, string> = {
  active: 'border-success/40 bg-success/10 text-success',
  pending: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
  expired: 'border-danger/40 bg-danger/10 text-danger',
  inactive: 'border-border bg-surface2 text-muted',
  suspended: 'border-danger/40 bg-danger/10 text-danger',
};

export function MembershipPage() {
  const { t, i18n } = useTranslation(['member', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const paymentsEnabled = useSiteStore((s) => s.payments_enabled);

  const statePlan = (location.state as { plan?: PlanId } | null)?.plan;
  const [plan, setPlan] = useState<PlanId>(statePlan ?? user?.plan ?? 'daily');
  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [senderName, setSenderName] = useState(user?.full_name ?? '');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState<string>(() => String(planById(statePlan ?? user?.plan ?? 'daily')?.priceTsh ?? 0));
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [nonce, setNonce] = useState(0);

  const payments = useAsyncList<Payment>(() => (user ? db.listPaymentsForUser(user.id) : Promise.resolve([])), [user, nonce]);
  const status = user ? db.effectiveStatus(user) : 'pending';
  const active = status === 'active';

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }),
    [i18n.language]
  );
  const daysLeft =
    user?.member_expiry != null ? Math.max(0, Math.ceil((user.member_expiry - Date.now()) / 86400000)) : 0;

  const submit = async () => {
    if (!user) return;
    const next: Record<string, string | undefined> = {};
    const parsedAmount = Number(amount);
    if (!senderName.trim()) next.sender_name = t('member:errors.sender_name_required');
    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      next.amount = t('member:errors.amount_invalid');
    }
    if (!phone.trim()) next.phone = t('member:errors.phone_required');
    if (!reference.trim()) next.reference = t('member:errors.reference_required');
    if (!screenshot) next.screenshot = t('member:errors.screenshot_required');
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    try {
      await db.addPayment({
        user_id: user.id,
        plan,
        amount: parsedAmount,
        method,
        phone: phone.trim(),
        sender_name: senderName.trim(),
        reference: reference.trim(),
      }, screenshot);
      setReference('');
      setScreenshot(null);
      setAmount(String(planById(plan)?.priceTsh ?? 0));
      setNonce((n) => n + 1);
      await refreshUser();
      toast(t('member:submitted'), 'success');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fadeUp">
      <header>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t('member:title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('member:subtitle')}</p>
      </header>

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <ShieldIcon size={22} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted">{t('member:current_status')}</p>
            <p className="font-heading text-lg font-semibold">
              {user.plan ? t(`member:plans.${user.plan}.label`) : t('member:not_assigned')}
            </p>
            <p className="text-xs text-muted">
              {t('member:user_id')}: {user.user_code ?? t('member:not_assigned')}
              {user.member_expiry != null && active && ` · ${t('member:days_left', { days: daysLeft })}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className={`rounded-full border px-3 py-1 font-mono text-xs ${STATUS_STYLE[status]}`}>
            {t(`member:status.${status}`)}
          </span>
          {user.member_expiry != null && (
            <span className="text-xs text-muted">
              {t('member:expires')}: {dateFmt.format(user.member_expiry)}
            </span>
          )}
          {active && (
            <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')}>
              {t('member:go_dashboard')}
            </Button>
          )}
        </div>
      </Card>

      {!paymentsEnabled ? (
        <Card className="border-tertiary/40 p-6 text-center text-sm text-tertiary">{t('member:payments_disabled')}</Card>
      ) : (
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold">
            <CardIcon size={18} className="text-primary" />
            {active ? t('member:renew') : t('member:submit_payment')}
          </h2>

          <p className="mb-3 text-sm text-muted">{t('member:choose_plan')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlan(p.id);
                  setAmount(String(p.priceTsh));
                }}
                className={`rounded-xl border p-4 text-left transition-all ${
                  plan === p.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                }`}
              >
                <span className={`block font-heading text-base font-semibold ${plan === p.id ? 'text-primary' : 'text-text'}`}>
                  {t(`member:plans.${p.id}.label`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{t(`member:plans.${p.id}.desc`)}</span>
                <span className="mt-2 block font-mono text-lg font-bold text-text">{formatTsh(p.priceTsh)}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium">{t('member:payment_method')}</p>
              <div className="flex gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      method === m ? 'border-primary bg-primary/12 text-primary' : 'border-border text-muted hover:border-primary/50'
                    }`}
                  >
                    {t(`member:methods.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            <Input label={t('member:phone_number')} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="+255 7XX XXX XXX" />
            <Input label={t('member:sender_name')} value={senderName} onChange={(e) => setSenderName(e.target.value)} error={errors.sender_name} placeholder={t('member:sender_name_placeholder')} />
            <Input
              label={t('member:amount')}
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errors.amount}
              placeholder="0"
            />
            <Input label={t('member:reference')} value={reference} onChange={(e) => setReference(e.target.value)} error={errors.reference} placeholder="MPESA-XXXXXXX" />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">{t('member:screenshot')}</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setScreenshot(null);
                    return;
                  }
                  if (!ACCEPTED_TYPES.includes(file.type)) {
                    setScreenshot(null);
                    setErrors((prev) => ({ ...prev, screenshot: t('member:errors.screenshot_type') }));
                    e.target.value = '';
                    return;
                  }
                  if (file.size > MAX_SIZE) {
                    setScreenshot(null);
                    setErrors((prev) => ({ ...prev, screenshot: t('member:errors.screenshot_size') }));
                    e.target.value = '';
                    return;
                  }
                  setErrors((prev) => ({ ...prev, screenshot: undefined }));
                  setScreenshot(file);
                }}
                className="w-full rounded-xl border border-border bg-surface/70 px-3.5 py-2 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-primary"
              />
              {errors.screenshot && <p className="mt-1.5 text-xs text-danger">{errors.screenshot}</p>}
              {!errors.screenshot && <p className="mt-1.5 text-xs text-muted">{t('member:screenshot_hint')}</p>}
            </div>
          </div>

          <Button className="mt-5" loading={submitting} onClick={submit}>
            {t('member:submit')}
          </Button>
        </Card>
      )}

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
                      {p.status === 'rejected' && p.reject_reason && (
                        <span className="ml-2 text-xs text-muted">
                          {t('member:rejected_reason')}: {p.reject_reason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default MembershipPage;
