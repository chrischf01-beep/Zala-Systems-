import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Modal, Tabs } from '../components/ui';
import { BarChart } from '../components/svg/BarChart';
import { LineChart } from '../components/svg/LineChart';
import { ExportIcon, ShieldIcon, TrashIcon } from '../components/svg/icons';
import { useAuthStore } from '../stores/authStore';
import { useSiteStore } from '../stores/siteStore';
import { toast } from '../stores/toastStore';
import * as db from '../lib/db';
import { toCsv, downloadCsv } from '../lib/csv';
import { PLANS, formatTsh } from '../lib/plans';
import type { Broadcast, MembershipStatus, NotificationType, Payment, PlanId, User } from '../lib/types';
import { useAsyncList } from '../hooks/useAsyncList';

type TabId = 'users' | 'payments' | 'analytics' | 'reports' | 'notifications' | 'logs' | 'settings' | 'backup';

const DAY = 86400000;

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function monthBuckets(n: number): { label: string; start: number; end: number }[] {
  const out: { label: string; start: number; end: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    out.push({ label: d.toLocaleString('en', { month: 'short' }), start, end });
  }
  return out;
}

const STATUS_STYLE: Record<MembershipStatus, string> = {
  active: 'border-success/40 bg-success/10 text-success',
  pending: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
  expired: 'border-danger/40 bg-danger/10 text-danger',
  inactive: 'border-border bg-surface2 text-muted',
  suspended: 'border-danger/40 bg-danger/10 text-danger',
};

export function AdminPage() {
  const { t } = useTranslation(['admin', 'member', 'common']);
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabId>('users');

  if (!user?.is_admin) {
    return (
      <Card strong className="mx-auto mt-10 max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/40 bg-danger/10 text-danger">
          <ShieldIcon size={26} />
        </span>
        <h1 className="font-heading text-xl font-bold">{t('admin:title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('admin:not_allowed')}</p>
      </Card>
    );
  }

  const tabs: { id: string; label: string }[] = [
    { id: 'users', label: t('admin:tabs.users') },
    { id: 'payments', label: t('admin:tabs.payments') },
    { id: 'analytics', label: t('admin:tabs.analytics') },
    { id: 'reports', label: t('admin:tabs.reports') },
    { id: 'notifications', label: t('admin:tabs.notifications') },
    { id: 'logs', label: t('admin:tabs.logs') },
    { id: 'settings', label: t('admin:tabs.settings') },
    { id: 'backup', label: t('admin:tabs.backup') },
  ];

  return (
    <div className="space-y-5 animate-fadeUp">
      <header>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t('admin:title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('admin:subtitle')}</p>
      </header>

      <div className="overflow-x-auto">
        <Tabs tabs={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />
      </div>

      {tab === 'users' && <UsersSection />}
      {tab === 'payments' && <PaymentsSection />}
      {tab === 'analytics' && <AnalyticsSection />}
      {tab === 'reports' && <ReportsSection />}
      {tab === 'notifications' && <NotificationsSection />}
      {tab === 'logs' && <LogsSection />}
      {tab === 'settings' && <SettingsSection />}
      {tab === 'backup' && <BackupSection />}
    </div>
  );
}

/* ------------------------------- Users ------------------------------- */

function UsersSection() {
  const { t } = useTranslation(['admin', 'member', 'common']);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<User | null>(null);
  const reload = () => setVersion((v) => v + 1);

  const users = useAsyncList(() => db.listUsers(), [version]);
  const payments = useAsyncList(() => db.listPayments(), [version]);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      (u.username ?? '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      (u.user_code ?? '').toLowerCase().includes(q);
    const matchPlan = planFilter === 'all' || u.plan === planFilter;
    const matchStatus = statusFilter === 'all' || db.effectiveStatus(u) === statusFilter;
    return matchQ && matchPlan && matchStatus;
  });

  const pendingFor = (userId: string) => payments.filter((p) => p.user_id === userId && p.status === 'pending');

  const dateFmt = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin:users.search_placeholder')}
          className="min-w-[220px] flex-1 rounded-xl border border-border bg-surface/70 px-3.5 py-2.5 text-sm text-text placeholder:text-muted/70 focus:border-primary focus:outline-none"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
        >
          <option value="all">{t('admin:users.filter_plan')}: {t('admin:users.all')}</option>
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>{t(`member:plans.${p.id}.label`)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
        >
          <option value="all">{t('admin:users.filter_status')}: {t('admin:users.all')}</option>
          {(['active', 'pending', 'expired', 'inactive', 'suspended'] as MembershipStatus[]).map((s) => (
            <option key={s} value={s}>{t(`member:status.${s}`)}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('admin:users.no_results')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">{t('admin:users.name')}</th>
                <th className="py-2 pr-3">{t('admin:users.user_id')}</th>
                <th className="py-2 pr-3">{t('admin:users.plan')}</th>
                <th className="py-2 pr-3">{t('admin:users.status')}</th>
                <th className="py-2 pr-3">{t('admin:users.expiry')}</th>
                <th className="py-2">{t('admin:users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const st = db.effectiveStatus(u);
                const pending = pendingFor(u.id).length;
                return (
                  <tr key={u.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">
                      <span className="block font-medium text-text">{u.full_name}</span>
                      <span className="block font-mono text-xs text-muted">@{u.username || '--'}</span>
                      <span className="block text-xs text-muted">{u.email}</span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{u.user_code ?? '--'}</td>
                    <td className="py-2.5 pr-3">{u.plan ? t(`member:plans.${u.plan}.label`) : '--'}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${STATUS_STYLE[st]}`}>{t(`member:status.${st}`)}</span>
                      {pending > 0 && (
                        <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                          {pending} {t('admin:users.pending_payments')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted">{u.member_expiry != null ? dateFmt.format(u.member_expiry) : '--'}</td>
                    <td className="py-2.5">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(u)}>
                        {t('admin:users.manage')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && <ManageUserModal user={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    </Card>
  );
}

function ManageUserModal({ user, onClose, onChanged }: { user: User; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation(['admin', 'member', 'common']);
  const [version, setVersion] = useState(0);
  const [extendDays, setExtendDays] = useState('7');
  const [expiryDate, setExpiryDate] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const allPayments = useAsyncList(() => db.listPaymentsForUser(user.id), [version, user.id]);
  const payments = allPayments.filter((p) => p.status === 'pending');
  const refresh = () => {
    setVersion((v) => v + 1);
    onChanged();
  };

  const approve = (id: string) => {
    db.approvePayment(id);
    toast(t('admin:users.approved'), 'success');
    refresh();
  };
  const doReject = () => {
    if (!reason.trim()) {
      setReasonError(t('admin:users.reject_reason_required'));
      return;
    }
    if (rejectId) db.rejectPayment(rejectId, reason);
    setRejectId(null);
    setReason('');
    setReasonError('');
    toast(t('admin:users.rejected'), 'info');
    refresh();
  };
  const extend = () => {
    const d = Number(extendDays);
    if (!Number.isFinite(d) || d <= 0) return;
    db.extendMembership(user.id, d);
    toast(t('admin:users.extended'), 'success');
    refresh();
  };
  const changeExpiry = () => {
    if (!expiryDate) return;
    db.setExpiry(user.id, new Date(expiryDate).getTime());
    toast(t('admin:users.expiry_set'), 'success');
    refresh();
  };
  const setStatus = (s: MembershipStatus) => {
    db.setUserStatus(user.id, s);
    toast(t('admin:users.status_changed'), 'success');
    refresh();
  };
  const changePlan = (planId: PlanId) => {
    db.updateUser(user.id, { plan: planId });
    toast(t('admin:users.plan_changed'), 'success');
    refresh();
  };
  const remove = () => {
    db.deleteUser(user.id);
    toast(t('admin:users.deleted'), 'info');
    onClose();
    onChanged();
  };

  return (
    <>
      <Modal open onClose={onClose} title={`${user.full_name} · ${user.email}`}>
        <div className="space-y-5 text-text">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">{t('admin:users.user_id')}</p>
              <p className="font-mono">{user.user_code ?? '--'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t('admin:users.status')}</p>
              <p>{t(`member:status.${db.effectiveStatus(user)}`)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted">{t('admin:users.pending_payments')}</p>
            {payments.length === 0 ? (
              <p className="text-sm text-muted">--</p>
            ) : (
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/60 p-2.5">
                    <span className="text-sm">
                      {formatTsh(p.amount)} · {t(`member:plans.${p.plan}.label`)}
                      <span className="block font-mono text-xs text-muted">{p.reference}</span>
                    </span>
                    <span className="flex gap-2">
                      <Button size="sm" onClick={() => approve(p.id)}>{t('admin:users.approve')}</Button>
                      <Button size="sm" variant="danger" onClick={() => { setRejectId(p.id); setReason(''); setReasonError(''); }}>
                        {t('admin:users.reject')}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-28">
              <label className="mb-1 block text-xs text-muted">{t('admin:users.extend_days')}</label>
              <input value={extendDays} onChange={(e) => setExtendDays(e.target.value)} type="number" min={1}
                className="w-full rounded-lg border border-border bg-surface/70 px-2.5 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <Button size="sm" variant="ghost" onClick={extend}>{t('admin:users.extend')}</Button>
            <div>
              <label className="mb-1 block text-xs text-muted">{t('admin:users.new_expiry')}</label>
              <input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} type="date"
                className="rounded-lg border border-border bg-surface/70 px-2.5 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <Button size="sm" variant="ghost" onClick={changeExpiry}>{t('admin:users.change_expiry')}</Button>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted">{t('admin:users.change_plan')}</p>
            <div className="flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => changePlan(p.id)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    user.plan === p.id
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-border text-muted hover:border-primary/50 hover:text-text'
                  }`}
                >
                  {t(`member:plans.${p.id}.label`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setStatus('active')}>{t('admin:users.activate')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus('inactive')}>{t('admin:users.deactivate')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus('suspended')}>{t('admin:users.suspend')}</Button>
            <Button size="sm" variant="danger" onClick={remove} icon={<TrashIcon size={14} />}>{t('admin:users.delete')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={rejectId !== null} onClose={() => setRejectId(null)} title={t('admin:users.reject')}>
        <Input label={t('admin:users.reject_reason')} value={reason} onChange={(e) => setReason(e.target.value)} error={reasonError} />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRejectId(null)}>{t('common:actions.cancel')}</Button>
          <Button variant="danger" onClick={doReject}>{t('admin:users.reject')}</Button>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------ Payments ------------------------------ */

function PaymentsSection() {
  const { t } = useTranslation(['admin', 'member', 'common']);
  const [version, setVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const reload = () => setVersion((v) => v + 1);

  const payments = useAsyncList(() => db.listPayments(), [version]);
  const users = useAsyncList(() => db.listUsers(), [version]);
  const nameOf = (id: string) => users.find((u) => u.id === id)?.full_name ?? id;

  const approved = payments.filter((p) => p.status === 'approved');
  const now = Date.now();
  const startToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const startWeek = now - 7 * DAY;
  const startMonth = now - 30 * DAY;
  const sum = (list: Payment[]) => list.reduce((a, p) => a + p.amount, 0);
  const revenueTotal = sum(approved);
  const revenueToday = sum(approved.filter((p) => (p.decided_at ?? 0) >= startToday));
  const revenueWeek = sum(approved.filter((p) => (p.decided_at ?? 0) >= startWeek));
  const revenueMonth = sum(approved.filter((p) => (p.decided_at ?? 0) >= startMonth));

  const months = useMemo(() => monthBuckets(6), []);
  const monthlyRevenue = months.map((m) => sum(approved.filter((p) => (p.decided_at ?? 0) >= m.start && (p.decided_at ?? 0) < m.end)));

  const filtered = payments.filter((p) => statusFilter === 'all' || p.status === statusFilter).sort((a, b) => b.created_at - a.created_at);

  const approve = (id: string) => {
    db.approvePayment(id);
    toast(t('admin:users.approved'), 'success');
    reload();
  };
  const doReject = () => {
    if (!reason.trim()) {
      setReasonError(t('admin:users.reject_reason_required'));
      return;
    }
    if (rejectId) db.rejectPayment(rejectId, reason);
    setRejectId(null);
    setReason('');
    setReasonError('');
    toast(t('admin:users.rejected'), 'info');
    reload();
  };
  const exportCsv = () => {
    const rows = filtered.map((p) => ({
      user: nameOf(p.user_id),
      plan: p.plan,
      amount: p.amount,
      method: p.method,
      sender_name: p.sender_name,
      reference: p.reference,
      status: p.status,
      date: new Date(p.created_at).toISOString(),
    }));
    downloadCsv('zala-payments.csv', toCsv(rows));
    toast(t('common:actions.export'), 'success');
  };

  const dateFmt = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('admin:payments.revenue_total')} value={formatTsh(revenueTotal)} />
        <Kpi label={t('admin:payments.revenue_today')} value={formatTsh(revenueToday)} />
        <Kpi label={t('admin:payments.revenue_week')} value={formatTsh(revenueWeek)} />
        <Kpi label={t('admin:payments.revenue_month')} value={formatTsh(revenueMonth)} />
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-muted">{t('admin:payments.last_6_months')}</h2>
        <BarChart data={monthlyRevenue} height={200} formatValue={(v) => `${Math.round(v)}`} />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
          {months.map((m) => <span key={m.label}>{m.label}</span>)}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none">
            <option value="all">{t('admin:payments.filter_status')}: {t('admin:users.all')}</option>
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
          <Button size="sm" variant="ghost" icon={<ExportIcon size={15} />} onClick={exportCsv}>{t('admin:payments.export_csv')}</Button>
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t('admin:payments.no_payments')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">{t('admin:payments.user')}</th>
                  <th className="py-2 pr-3">{t('admin:payments.amount')}</th>
                  <th className="py-2 pr-3">{t('admin:payments.method')}</th>
                  <th className="py-2 pr-3">{t('admin:payments.date')}</th>
                  <th className="py-2 pr-3">{t('admin:payments.status')}</th>
                  <th className="py-2">{t('admin:payments.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">{nameOf(p.user_id)}</td>
                    <td className="py-2.5 pr-3 font-mono">{formatTsh(p.amount)}</td>
                    <td className="py-2.5 pr-3">{t(`member:methods.${p.method}`)}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted">{dateFmt.format(p.created_at)}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                        p.status === 'approved' ? 'border-success/40 bg-success/10 text-success'
                          : p.status === 'rejected' ? 'border-danger/40 bg-danger/10 text-danger'
                          : 'border-tertiary/40 bg-tertiary/10 text-tertiary'}`}>{p.status}</span>
                    </td>
                    <td className="py-2.5">
                      {p.status === 'pending' ? (
                        <span className="flex gap-2">
                          <Button size="sm" onClick={() => approve(p.id)}>{t('admin:users.approve')}</Button>
                          <Button size="sm" variant="danger" onClick={() => { setRejectId(p.id); setReason(''); setReasonError(''); }}>{t('admin:users.reject')}</Button>
                        </span>
                      ) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={rejectId !== null} onClose={() => setRejectId(null)} title={t('admin:users.reject')}>
        <Input label={t('admin:users.reject_reason')} value={reason} onChange={(e) => setReason(e.target.value)} error={reasonError} />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRejectId(null)}>{t('common:actions.cancel')}</Button>
          <Button variant="danger" onClick={doReject}>{t('admin:users.reject')}</Button>
        </div>
      </Modal>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 font-heading text-xl font-bold" style={accent ? { color: accent } : undefined}>{value}</p>
    </Card>
  );
}

/* ------------------------------ Analytics ------------------------------ */

function AnalyticsSection() {
  const { t } = useTranslation(['admin', 'member', 'common']);
  const allUsers = useAsyncList(() => db.listUsers(), []);
  const users = allUsers.filter((u) => !u.is_admin);
  const payments = useAsyncList(() => db.listPayments(), []);

  const now = Date.now();
  const startToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const startMonth = now - 30 * DAY;

  const todays = users.filter((u) => u.created_at >= startToday).length;
  const thisMonth = users.filter((u) => u.created_at >= startMonth).length;
  const counts = {
    active: users.filter((u) => db.effectiveStatus(u) === 'active').length,
    inactive: users.filter((u) => db.effectiveStatus(u) === 'inactive').length,
    expired: users.filter((u) => db.effectiveStatus(u) === 'expired').length,
    pending: users.filter((u) => db.effectiveStatus(u) === 'pending').length,
  };

  const months = useMemo(() => monthBuckets(12), []);
  const monthly = months.map((m) => users.filter((u) => u.created_at >= m.start && u.created_at < m.end).length);
  let running = users.filter((u) => u.created_at < months[0].start).length;
  const cumulative = monthly.map((c) => (running += c));

  const approved = payments.filter((p) => p.status === 'approved');
  const revenueMonthly = months.map((m) =>
    approved.filter((p) => (p.decided_at ?? 0) >= m.start && (p.decided_at ?? 0) < m.end).reduce((a, p) => a + p.amount, 0)
  );

  const companies = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) {
      const key = u.betting_company || 'Other';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [users]);

  const planDist = PLANS.map((p) => ({ label: p.id, count: users.filter((u) => u.plan === p.id).length }));
  const maxCompany = Math.max(1, ...companies.map(([, c]) => c));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('admin:analytics.total_users')} value={String(users.length)} />
        <Kpi label={t('admin:analytics.todays_registrations')} value={String(todays)} accent="#00E5C0" />
        <Kpi label={t('admin:analytics.registrations_month')} value={String(thisMonth)} accent="#FF3D7F" />
        <Kpi label={t('admin:analytics.active')} value={String(counts.active)} accent="#3DFF8F" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('admin:analytics.active')} value={String(counts.active)} />
        <Kpi label={t('admin:analytics.inactive')} value={String(counts.inactive)} />
        <Kpi label={t('admin:analytics.expired')} value={String(counts.expired)} />
        <Kpi label={t('admin:analytics.pending')} value={String(counts.pending)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-muted">{t('admin:analytics.cumulative_growth')}</h2>
          <LineChart data={cumulative} height={200} formatValue={(v) => String(Math.round(v))} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-muted">{t('admin:analytics.monthly_registrations')}</h2>
          <BarChart data={monthly} height={200} formatValue={(v) => String(Math.round(v))} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-muted">{t('admin:analytics.revenue_growth')}</h2>
          <BarChart data={revenueMonthly} height={200} colorFor={() => '#FFB020'} formatValue={(v) => String(Math.round(v))} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-muted">{t('admin:analytics.betting_distribution')}</h2>
          <ul className="space-y-2">
            {companies.map(([name, count]) => (
              <li key={name}>
                <div className="flex justify-between text-xs"><span className="text-text">{name}</span><span className="font-mono text-muted">{count}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#00E5C0,#FF3D7F)]" style={{ width: `${(count / maxCompany) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-muted">{t('admin:analytics.membership_distribution')}</h2>
        <div className="grid grid-cols-3 gap-3">
          {planDist.map((p) => (
            <div key={p.label} className="rounded-xl border border-border bg-surface/60 p-4 text-center">
              <p className="text-xs text-muted">{t(`member:plans.${p.label}.label`)}</p>
              <p className="mt-1 font-heading text-2xl font-bold text-primary">{p.count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------- Reports ------------------------------- */

type ReportType = 'users' | 'payments' | 'revenue';

function ReportsSection() {
  const { t } = useTranslation(['admin', 'member', 'common']);
  const [type, setType] = useState<ReportType>('users');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    const start = from ? new Date(from).getTime() : 0;
    const end = to ? new Date(to).getTime() + DAY : Date.now() + DAY;
    if (type === 'users') {
      setRows(
        (await db.listUsers())
          .filter((u) => u.created_at >= start && u.created_at < end)
          .map((u) => ({
            name: u.full_name, email: u.email, phone: u.phone, user_id: u.user_code ?? '',
            plan: u.plan ?? '', status: db.effectiveStatus(u),
            registered: new Date(u.created_at).toISOString().slice(0, 10),
          }))
      );
    } else if (type === 'payments') {
      setRows(
        (await db.listPayments())
          .filter((p) => p.created_at >= start && p.created_at < end)
          .map((p) => ({
            plan: p.plan, amount: p.amount, method: p.method, reference: p.reference,
            status: p.status, date: new Date(p.created_at).toISOString().slice(0, 10),
          }))
      );
    } else {
      setRows(
        (await db.listPayments())
          .filter((p) => p.status === 'approved' && (p.decided_at ?? 0) >= start && (p.decided_at ?? 0) < end)
          .map((p) => ({
            plan: p.plan, amount: p.amount, method: p.method,
            date: new Date(p.decided_at ?? p.created_at).toISOString().slice(0, 10),
          }))
      );
    }
    setGenerated(true);
  };

  const exportCsv = () => {
    downloadCsv(`zala-${type}-report.csv`, toCsv(rows));
    toast(t('common:actions.export'), 'success');
  };

  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted">{t('admin:reports.type')}</label>
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)}
            className="rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none">
            <option value="users">{t('admin:reports.types.users')}</option>
            <option value="payments">{t('admin:reports.types.payments')}</option>
            <option value="revenue">{t('admin:reports.types.revenue')}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t('admin:reports.date_from')}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">{t('admin:reports.date_to')}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none" />
        </div>
        <Button onClick={generate}>{t('admin:reports.generate')}</Button>
        <Button variant="ghost" icon={<ExportIcon size={15} />} onClick={exportCsv} disabled={rows.length === 0}>
          {t('admin:reports.export_csv')}
        </Button>
      </div>

      {!generated ? (
        <p className="py-6 text-center text-sm text-muted">{t('admin:reports.no_data')}</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('admin:reports.no_data')}</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">{t('admin:reports.rows', { count: rows.length })}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <tr className="border-b border-border">
                  {columns.map((c) => <th key={c} className="py-2 pr-3">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {columns.map((c) => <td key={c} className="py-2 pr-3 font-mono text-xs">{String(r[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------------------------- Notifications ---------------------------- */

function NotificationsSection() {
  const { t } = useTranslation(['admin', 'member', 'common']);
  const [version, setVersion] = useState(0);
  const [audience, setAudience] = useState<'all' | 'user'>('all');
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<NotificationType>('system');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});

  const allUsers = useAsyncList(() => db.listUsers(), [version]);
  const users = allUsers.filter((u) => !u.is_admin);
  const notes = useAsyncList(() => db.listNotifications(), [version]);

  const send = () => {
    const next: { subject?: string; body?: string } = {};
    if (!subject.trim()) next.subject = t('admin:notifications.subject_required');
    if (!body.trim()) next.body = t('admin:notifications.message_required');
    setErrors(next);
    if (next.subject || next.body) return;
    db.addNotification({
      audience: audience === 'all' ? 'all' : userId || 'all',
      type,
      title: subject.trim(),
      body: body.trim(),
    });
    setSubject('');
    setBody('');
    setVersion((v) => v + 1);
    toast(t('admin:notifications.sent'), 'success');
  };

  const dateFmt = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-heading text-lg font-semibold">{t('admin:notifications.title')}</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setAudience('all')}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm ${audience === 'all' ? 'border-primary bg-primary/12 text-primary' : 'border-border text-muted'}`}>
              {t('admin:notifications.to_all')}
            </button>
            <button type="button" onClick={() => setAudience('user')}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm ${audience === 'user' ? 'border-primary bg-primary/12 text-primary' : 'border-border text-muted'}`}>
              {t('admin:notifications.to_user')}
            </button>
          </div>
          {audience === 'user' && (
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none">
              <option value="">{t('admin:notifications.select_user')}</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}
            </select>
          )}
          <select value={type} onChange={(e) => setType(e.target.value as NotificationType)}
            className="w-full rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none">
            {(['system', 'payment', 'membership', 'expiry'] as NotificationType[]).map((n) => (
              <option key={n} value={n}>{t(`admin:notifications.types.${n}`)}</option>
            ))}
          </select>
          <Input label={t('admin:notifications.subject')} value={subject} onChange={(e) => setSubject(e.target.value)} error={errors.subject} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t('admin:notifications.message')}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              className="w-full rounded-xl border border-border bg-surface/70 px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none" />
            {errors.body && <p className="mt-1.5 text-xs text-danger">{errors.body}</p>}
          </div>
          <Button onClick={send}>{t('admin:notifications.send')}</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-heading text-lg font-semibold">{t('admin:notifications.recent')}</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted">{t('admin:notifications.no_notifications')}</p>
        ) : (
          <ul className="space-y-2">
            {notes.slice(0, 30).map((n: Broadcast) => (
              <li key={n.id} className="rounded-lg border border-border bg-surface/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text">{n.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{n.type}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{n.body}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {n.audience === 'all' ? t('admin:notifications.to_all') : n.audience} · {dateFmt.format(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------- Logs -------------------------------- */

function LogsSection() {
  const { t } = useTranslation(['admin', 'common']);
  const [version, setVersion] = useState(0);
  const logs = useAsyncList(() => db.listLogs(), [version]);
  const dateFmt = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">{t('admin:logs.title')}</h2>
        <Button size="sm" variant="danger" icon={<TrashIcon size={14} />}
          onClick={() => { db.clearLogs(); setVersion((v) => v + 1); toast(t('admin:logs.cleared'), 'info'); }}>
          {t('admin:logs.clear_all')}
        </Button>
      </div>
      {logs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('admin:logs.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">{t('admin:logs.action')}</th>
                <th className="py-2 pr-3">{t('admin:logs.details')}</th>
                <th className="py-2 pr-3">{t('admin:logs.target')}</th>
                <th className="py-2 pr-3">{t('admin:logs.timestamp')}</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-mono text-xs text-primary">{l.action}</td>
                  <td className="py-2.5 pr-3 text-xs">{l.details}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-muted">{l.target}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted">{dateFmt.format(l.created_at)}</td>
                  <td className="py-2.5">
                    <button type="button" onClick={() => { db.deleteLog(l.id); setVersion((v) => v + 1); toast(t('admin:logs.deleted'), 'info'); }}
                      className="text-muted transition-colors hover:text-danger" aria-label={t('admin:logs.delete')}>
                      <TrashIcon size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------ Settings ------------------------------ */

function SettingsSection() {
  const { t } = useTranslation(['admin', 'common']);
  const site = useSiteStore();
  const [form, setForm] = useState({
    site_name: site.site_name,
    welcome_message: site.welcome_message,
    support_email: site.support_email,
    support_phone: site.support_phone,
    whatsapp: site.whatsapp,
  });

  const save = () => {
    site.set(form);
    toast(t('admin:settings.saved'), 'success');
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-heading text-lg font-semibold">{t('admin:settings.feature_toggles')}</h2>
        <div className="space-y-3">
          <ToggleRow label={t('admin:settings.registration_enabled')} checked={site.registration_enabled} onChange={(v) => site.set({ registration_enabled: v })} />
          <ToggleRow label={t('admin:settings.payments_enabled')} checked={site.payments_enabled} onChange={(v) => site.set({ payments_enabled: v })} />
          <ToggleRow label={t('admin:settings.membership_enabled')} checked={site.membership_enabled} onChange={(v) => site.set({ membership_enabled: v })} />
          <ToggleRow label={t('admin:settings.maintenance_mode')} hint={t('admin:settings.maintenance_hint')} checked={site.maintenance_mode} onChange={(v) => site.set({ maintenance_mode: v })} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-heading text-lg font-semibold">{t('admin:settings.website_config')}</h2>
        <div className="space-y-3">
          <Input label={t('admin:settings.site_name')} value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
          <Input label={t('admin:settings.welcome_message')} value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} />
          <Input label={t('admin:settings.support_email')} value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} />
          <Input label={t('admin:settings.support_phone')} value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} />
          <Input label={t('admin:settings.whatsapp')} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <Button onClick={save}>{t('common:actions.save')}</Button>
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-text">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${checked ? 'border-primary bg-primary/30' : 'border-border bg-surface2'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${checked ? 'translate-x-6 bg-primary' : 'translate-x-1 bg-muted'}`} />
      </button>
    </div>
  );
}

/* -------------------------------- Backup -------------------------------- */

function BackupSection() {
  const { t } = useTranslation(['admin', 'common']);
  const download = async () => {
    const snapshot = await db.exportDatabase();
    downloadJson(`zala-backup-${new Date().toISOString().slice(0, 10)}.json`, snapshot);
    toast(t('admin:backup.downloaded'), 'success');
  };
  return (
    <Card className="p-6 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
        <ExportIcon size={24} />
      </span>
      <h2 className="font-heading text-lg font-semibold">{t('admin:backup.title')}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('admin:backup.body')}</p>
      <Button className="mt-5" onClick={download}>{t('admin:backup.download')}</Button>
    </Card>
  );
}

export default AdminPage;
