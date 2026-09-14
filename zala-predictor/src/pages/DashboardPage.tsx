import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePredictorEngine } from '../hooks/usePredictorEngine';
import { NextSignalPanel } from '../components/NextSignalPanel';
import { StatsRow, type StatItem } from '../components/StatsRow';
import { DistributionRow } from '../components/DistributionRow';
import { RecentRoundsChart } from '../components/RecentRoundsChart';
import { InsightsPanel } from '../components/InsightsPanel';
import { TierComparison } from '../components/TierComparison';
import { PatternAnalysis } from '../components/PatternAnalysis';
import { Button, Card } from '../components/ui';
import {
  AlertIcon,
  FlamelessStreakIcon,
  LockIcon,
  PredictIcon,
  StatsIcon,
  TargetIcon,
  TimerIcon,
  TrendUpIcon,
} from '../components/svg/icons';
import { useAuthStore } from '../stores/authStore';
import { useSiteStore } from '../stores/siteStore';
import * as db from '../lib/db';

export function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'engine', 'locked', 'member']);
  const user = useAuthStore((s) => s.user);
  const gating = useSiteStore((s) => s.membership_enabled);
  const engine = usePredictorEngine(100);

  const status = user ? db.effectiveStatus(user) : 'pending';
  const access = !gating || (user ? db.hasAccess(user) : false);

  const expiringSoon =
    access &&
    user?.member_expiry != null &&
    !user.is_admin &&
    user.member_expiry - Date.now() < 3 * 86400000 &&
    user.member_expiry > Date.now();

  if (!access) {
    const isPending = status === 'pending';
    const isExpired = status === 'expired';
    const title = isPending ? t('locked:pending_title') : isExpired ? t('locked:expired_title') : t('locked:title');
    const body = isPending ? t('locked:pending_body') : isExpired ? t('locked:expired_body') : t('locked:body');
    return (
      <div className="flex min-h-[60vh] items-center justify-center animate-fadeUp">
        <Card strong className="max-w-md p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <LockIcon size={26} />
          </span>
          <h1 className="font-heading text-xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{body}</p>
          <Link to="/membership" className="mt-6 inline-block">
            <Button>{isPending ? t('member:title') : t('locked:cta')}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const wins = engine.rounds.filter((r) => r.multiplier >= 2).length;
  const losses = engine.rounds.length - wins;

  const stats: StatItem[] = [
    { label: t('engine:stats.rounds'), value: String(engine.rounds.length), icon: <StatsIcon size={16} /> },
    { label: t('engine:stats.wins'), value: String(wins), accent: '#00E5C0', icon: <TrendUpIcon size={16} /> },
    { label: t('engine:stats.losses'), value: String(losses), accent: '#FF5470', icon: <TargetIcon size={16} /> },
    {
      label: t('engine:stats.streak'),
      value: String(engine.streaks.current),
      accent: engine.streaks.currentIsWin ? '#3DFF8F' : '#FFB020',
      icon: <FlamelessStreakIcon size={16} />,
    },
    {
      label: t('engine:stats.volatility'),
      value: engine.volatility.value.toFixed(2),
      sub: t(`engine:vol_levels.${engine.volatility.level.toLowerCase()}`),
      icon: <PredictIcon size={16} />,
    },
    {
      label: t('engine:stats.avg'),
      value: `${engine.volatility.mean.toFixed(2)}x`,
      icon: <TimerIcon size={16} />,
    },
  ];

  return (
    <div className="space-y-5 animate-fadeUp">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            {t('dashboard:greeting', { name: user?.full_name.split(' ')[0] ?? '' })}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('engine:console_subtitle')}</p>
        </div>
      </header>

      {expiringSoon && (
        <div className="flex items-center gap-3 rounded-xl border border-tertiary/40 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">
          <AlertIcon size={18} />
          <span className="flex-1">{t('member:expired_body')}</span>
          <Link to="/membership" className="font-semibold underline">
            {t('member:renew')}
          </Link>
        </div>
      )}

      <NextSignalPanel
        signal={engine.signal}
        allTiers={engine.allTiers}
        selectedTier={engine.selectedTier}
        onSelectTier={engine.setSelectedTier}
        countdown={engine.countdown}
        action={engine.action}
        onRegenerate={engine.regenerateSignal}
      />

      <StatsRow items={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionRow buckets={engine.distribution} />
        <RecentRoundsChart rounds={engine.rounds} />
      </div>

      <TierComparison
        tiers={engine.allTiers}
        selectedTier={engine.selectedTier}
        onSelectTier={engine.setSelectedTier}
      />

      <PatternAnalysis
        rounds={engine.rounds}
        triggers={engine.triggers}
        triggerStats={engine.triggerStats}
        selectedWindow={engine.selectedWindow}
        onSelectWindow={engine.setSelectedWindow}
      />

      <InsightsPanel insights={engine.insights} />
    </div>
  );
}

export default DashboardPage;
