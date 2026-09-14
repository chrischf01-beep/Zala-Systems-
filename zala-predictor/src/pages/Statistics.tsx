import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui';
import { LineChart } from '../components/svg/LineChart';
import { Candlestick } from '../components/svg/Candlestick';
import { Histogram } from '../components/svg/Histogram';
import { BarChart } from '../components/svg/BarChart';
import { usePredictStore } from '../stores/predictStore';
import { formatMultiplier } from '../lib/format';
import { FlamelessStreakIcon, PredictIcon, StatsIcon, HistoryIcon } from '../components/svg/icons';

type WindowKey = 'w50' | 'w100' | 'w500' | 'wall';
const WINDOWS: { key: WindowKey; n: number }[] = [
  { key: 'w50', n: 50 },
  { key: 'w100', n: 100 },
  { key: 'w500', n: 500 },
  { key: 'wall', n: Infinity },
];

interface Trigger {
  index: number;
  mult: number;
  next4: number[];
  avg: number;
  won: boolean;
}

function Donut({ wins, losses }: { wins: number; losses: number }) {
  const total = Math.max(wins + losses, 1);
  const r = 70;
  const c = 2 * Math.PI * r;
  const winFrac = wins / total;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="Win loss ratio">
      <circle cx="90" cy="90" r={r} fill="none" stroke="#FF5470" strokeWidth="20" opacity="0.85" />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke="#3DFF8F"
        strokeWidth="20"
        strokeDasharray={`${c * winFrac} ${c}`}
        transform="rotate(-90 90 90)"
      />
      <text x="90" y="84" textAnchor="middle" className="font-mono" fontSize="26" fontWeight="700" fill="#EAF2FF">
        {Math.round(winFrac * 100)}%
      </text>
      <text x="90" y="104" textAnchor="middle" fontSize="11" fill="#7A8AA8">
        {wins}/{total}
      </text>
    </svg>
  );
}

export function Statistics() {
  const { t } = useTranslation('stats');
  const records = usePredictStore((s) => s.records);
  const loadRecords = usePredictStore((s) => s.loadRecords);
  const [win, setWin] = useState<WindowKey>('w100');

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const chrono = useMemo(() => [...records].reverse(), [records]);

  const windowRows = useMemo(() => {
    const n = WINDOWS.find((w) => w.key === win)?.n ?? Infinity;
    return n === Infinity ? chrono : chrono.slice(-n);
  }, [chrono, win]);

  const mults = useMemo(() => windowRows.map((r) => r.prediction), [windowRows]);

  const triggers = useMemo<Trigger[]>(() => {
    const out: Trigger[] = [];
    for (let i = 0; i < mults.length; i++) {
      if (mults[i] < 2) {
        const next4 = mults.slice(i + 1, i + 5);
        if (next4.length === 0) continue;
        const avg = next4.reduce((a, b) => a + b, 0) / next4.length;
        out.push({ index: i + 1, mult: mults[i], next4, avg, won: next4.some((m) => m >= 2) });
      }
    }
    return out;
  }, [mults]);

  const kpi = useMemo(() => {
    const wins = triggers.filter((tr) => tr.won).length;
    const allNext = triggers.flatMap((tr) => tr.next4);
    const avgFollow = allNext.length ? allNext.reduce((a, b) => a + b, 0) / allNext.length : 0;
    const volAvg = windowRows.length ? windowRows.reduce((a, r) => a + r.volatility, 0) / windowRows.length : 0;
    return {
      triggerCount: triggers.length,
      triggerPct: mults.length ? Math.round((triggers.length / mults.length) * 100) : 0,
      winRate: triggers.length ? Math.round((wins / triggers.length) * 100) : 0,
      won: wins,
      lost: triggers.length - wins,
      avgFollow,
      volAvg,
    };
  }, [triggers, mults.length, windowRows]);

  const overall = useMemo(() => {
    const all = chrono.map((r) => r.prediction);
    const wins = all.filter((m) => m > 2).length;
    let streak = 0;
    let best = 0;
    for (const m of all) {
      if (m > 2) {
        streak++;
        best = Math.max(best, streak);
      } else streak = 0;
    }
    const conf = chrono.length ? Math.round(chrono.reduce((a, r) => a + r.confidence, 0) / chrono.length) : 0;
    return { wins, losses: all.length - wins, best, conf };
  }, [chrono]);

  const hist = useMemo(() => {
    if (mults.length === 0) return { bins: [] as number[], min: 0, max: 0 };
    const min = Math.min(...mults);
    const max = Math.max(...mults);
    const bins = 20;
    const arr = new Array(bins).fill(0);
    const span = Math.max(max - min, 1e-6);
    for (const m of mults) {
      let b = Math.floor(((m - min) / span) * bins);
      if (b >= bins) b = bins - 1;
      arr[b]++;
    }
    return { bins: arr, min, max };
  }, [mults]);

  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <Header t={t} />
        <Card className="py-20 text-center text-sm text-muted">{t('no_data')}</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header t={t} />

      {/* Overall KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<HistoryIcon size={18} />} label={t('total')} value={String(records.length)} tint="#00E5C0" />
        <Kpi icon={<StatsIcon size={18} />} label={t('wins')} value={String(overall.wins)} tint="#3DFF8F" />
        <Kpi icon={<PredictIcon size={18} />} label={t('losses')} value={String(overall.losses)} tint="#FF5470" />
        <Kpi icon={<FlamelessStreakIcon size={18} />} label={t('best_streak')} value={String(overall.best)} tint="#FFB020" />
      </div>

      {/* Historical pattern analysis */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-lg font-semibold">{t('table_title')}</h2>
          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => setWin(w.key)}
                className={`rounded-xl border px-3 py-1.5 text-xs transition-all ${
                  win === w.key
                    ? 'border-primary bg-primary/12 text-primary'
                    : 'border-border text-muted hover:border-primary/40 hover:text-text'
                }`}
              >
                {t(w.key)}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface/50 p-3.5 text-xs leading-relaxed text-muted">
          <PredictIcon size={16} className="mt-0.5 shrink-0 text-primary" />
          {t('info_note')}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={<HistoryIcon size={18} />} label={t('triggers')} value={String(kpi.triggerCount)} sub={`${kpi.triggerPct}% ${t('total').toLowerCase()}`} tint="#FF3D7F" />
          <Kpi icon={<StatsIcon size={18} />} label={t('win_rate2')} value={`${kpi.winRate}%`} sub={`${kpi.won} ${t('won').toLowerCase()} · ${kpi.lost} ${t('lost').toLowerCase()}`} tint="#3DFF8F" />
          <Kpi icon={<PredictIcon size={18} />} label={t('avg_following')} value={formatMultiplier(kpi.avgFollow)} tint="#00E5C0" />
          <Kpi icon={<FlamelessStreakIcon size={18} />} label={t('avg_confidence')} value={`${overall.conf}%`} tint="#FFB020" />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{t('timeline')}</h3>
          <LineChart data={mults} formatValue={(v) => formatMultiplier(v)} height={240} />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{t('per_trigger')}</h3>
          {triggers.length ? (
            <BarChart data={triggers.map((tr) => tr.avg)} height={200} colorFor={() => '#00E5C0'} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">{t('no_data')}</p>
          )}
        </div>

        {triggers.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-surface2/70">
                <tr className="text-[11px] uppercase tracking-widest text-muted">
                  <th className="px-4 py-3 font-medium">{t('trigger_round')}</th>
                  <th className="px-4 py-3 font-medium">{t('trigger_mult')}</th>
                  <th className="px-4 py-3 font-medium">{t('next4')}</th>
                  <th className="px-4 py-3 font-medium">{t('avg')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('signal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {triggers.slice(-12).reverse().map((tr, i) => (
                  <tr key={tr.index} className={i % 2 ? 'bg-surface/30' : ''}>
                    <td className="px-4 py-3 font-mono text-muted">#{tr.index}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-tertiary">{formatMultiplier(tr.mult)}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {tr.next4.map((m, j) => (
                          <span
                            key={j}
                            className={`rounded-md px-2 py-0.5 font-mono text-xs ${
                              m >= 2 ? 'bg-primary/12 text-primary' : 'bg-danger/12 text-danger'
                            }`}
                          >
                            {formatMultiplier(m)}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-text">{formatMultiplier(tr.avg)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                          tr.won ? 'bg-primary/12 text-primary' : 'bg-danger/12 text-danger'
                        }`}
                      >
                        {tr.won ? t('won') : t('lost')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Distribution charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold">{t('candle_title')}</h2>
          <Candlestick data={mults} height={240} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold">{t('hist_title')}</h2>
          <Histogram bins={hist.bins} min={hist.min} max={hist.max} height={240} />
        </Card>
      </div>

      <Card className="flex flex-col items-center p-6">
        <h2 className="mb-4 self-start font-heading text-lg font-semibold">{t('donut_title')}</h2>
        <Donut wins={overall.wins} losses={overall.losses} />
        <div className="mt-4 flex gap-6 text-sm">
          <Legend color="#3DFF8F" label={`${t('above2')} (${overall.wins})`} />
          <Legend color="#FF5470" label={`${t('below2')} (${overall.losses})`} />
        </div>
      </Card>
    </div>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t('title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <span className="absolute right-4 top-4 rounded-lg p-2" style={{ background: `${tint}1a`, color: tint }}>
        {icon}
      </span>
      <p className="pr-10 text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-text sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-muted">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

export default Statistics;
