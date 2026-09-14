import i18n from './i18n';
import { clamp, mean, round2, round4, stdDev } from './math';

export interface Round {
  id: number;
  multiplier: number;
  timestamp: Date;
}

export interface Trigger {
  roundId: number;
  triggerMultiplier: number;
  nextN: number[];
  avgNext: number;
  maxNext: number;
  won: boolean;
  timestamp: Date;
}

export type TierName = 'Safe' | 'Medium' | 'High' | 'Moonshot';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Extreme';
export type SignalAction = 'Standby' | 'Bet Now' | 'Cash Out';

export interface Signal {
  id: string;
  targetMultiplier: number;
  tier: TierName;
  riskLevel: RiskLevel;
  entryTime: Date;
  entryTimeFormatted: string;
  cashOutAt: number;
  countdownSeconds: number;
  action: SignalAction;
  confidence: number;
  confidenceBreakdown: {
    winRate: number;
    sampleSize: number;
    volatility: number;
  };
  basedOnRounds: number;
  winRate: number;
  avgFollowingMultiplier: number;
  currentStreak: number;
  nextSignalInMinutes: number;
  expiresAt: Date;
}

export interface DistributionBucket {
  key: string;
  min: number;
  max: number;
  count: number;
  percent: number;
  color: string;
}

export type VolatilityLevel = 'Low' | 'Medium' | 'High' | 'Extreme';

export interface Volatility {
  value: number;
  mean: number;
  std: number;
  level: VolatilityLevel;
}

export interface TriggerStats {
  total: number;
  percentOfRounds: number;
  wins: number;
  losses: number;
  winRate: number;
  avgFollowing: number;
}

export interface Streaks {
  current: number;
  currentIsWin: boolean;
  best: number;
}

export const MULTI_TIER_TARGETS = [1.1, 2.0, 5.0, 10.0, 20.1] as const;

export const TRIGGER_THRESHOLD = 2.0;
export const LOOKAHEAD = 4;
export const SIGNAL_CYCLE_SECONDS = 45;
export const BET_WINDOW_SECONDS = 8;
const ROUND_INTERVAL_MS = 15_000;
const HOUSE_EDGE = 0.04;
const INSTANT_BUST_CHANCE = 0.03;
const MAX_CRASH = 150;

const BANDS: { key: string; min: number; max: number; color: string }[] = [
  { key: 'b1', min: 1, max: 1.49, color: '#FF5470' },
  { key: 'b2', min: 1.5, max: 1.99, color: '#FFB020' },
  { key: 'b3', min: 2, max: 4.99, color: '#00E5C0' },
  { key: 'b4', min: 5, max: 9.99, color: '#FF3D7F' },
  { key: 'b5', min: 10, max: Number.POSITIVE_INFINITY, color: '#3DFF8F' },
];

export function tierForTarget(target: number): TierName {
  if (target < 1.5) return 'Safe';
  if (target < 5) return 'Medium';
  if (target < 15) return 'High';
  return 'Moonshot';
}

export function riskForTarget(target: number): RiskLevel {
  if (target < 1.5) return 'Low';
  if (target < 5) return 'Medium';
  if (target < 15) return 'High';
  return 'Extreme';
}

export function confidenceBounds(target: number): [number, number] {
  if (target <= 1.5) return [60, 98];
  if (target <= 5) return [40, 90];
  if (target <= 15) return [20, 70];
  return [10, 50];
}

export function generateCrashPoint(): number {
  const r = Math.random();
  if (r < INSTANT_BUST_CHANCE) return 1.0;
  const crash = (1 - HOUSE_EDGE) / (1 - r);
  return round2(Math.min(crash, MAX_CRASH));
}

export function generateRounds(count: number, startId: number): Round[] {
  const now = Date.now();
  const rounds: Round[] = [];
  for (let i = 0; i < count; i++) {
    rounds.push({
      id: startId + i,
      multiplier: generateCrashPoint(),
      timestamp: new Date(now - (count - 1 - i) * ROUND_INTERVAL_MS),
    });
  }
  return rounds;
}

export function calculateDistribution(rounds: Round[]): DistributionBucket[] {
  const total = rounds.length;
  return BANDS.map((band) => {
    const count = rounds.filter((r) => r.multiplier >= band.min && r.multiplier <= band.max).length;
    return {
      key: band.key,
      min: band.min,
      max: band.max,
      count,
      percent: total ? round2((count / total) * 100) : 0,
      color: band.color,
    };
  });
}

export function calculateVolatility(rounds: Round[]): Volatility {
  const values = rounds.map((r) => r.multiplier);
  const m = values.length ? mean(values) : 0;
  const std = values.length ? stdDev(values) : 0;
  const value = m > 0 ? std / m : 0;
  let level: VolatilityLevel = 'Low';
  if (value >= 1.1) level = 'Extreme';
  else if (value >= 0.7) level = 'High';
  else if (value >= 0.35) level = 'Medium';
  return { value: round4(value), mean: round2(m), std: round2(std), level };
}

export function findTriggers(
  rounds: Round[],
  options?: { threshold?: number; lookahead?: number }
): Trigger[] {
  const threshold = options?.threshold ?? TRIGGER_THRESHOLD;
  const lookahead = options?.lookahead ?? LOOKAHEAD;
  const triggers: Trigger[] = [];
  for (let i = 0; i + lookahead < rounds.length; i++) {
    const round = rounds[i];
    if (round.multiplier >= threshold) continue;
    const nextN = rounds.slice(i + 1, i + 1 + lookahead).map((r) => r.multiplier);
    triggers.push({
      roundId: round.id,
      triggerMultiplier: round.multiplier,
      nextN,
      avgNext: round2(mean(nextN)),
      maxNext: round2(Math.max(...nextN)),
      won: nextN.some((m) => m >= threshold),
      timestamp: round.timestamp,
    });
  }
  return triggers;
}

export function calculateTriggerStats(triggers: Trigger[], totalRounds: number): TriggerStats {
  const total = triggers.length;
  const wins = triggers.filter((t) => t.won).length;
  const losses = total - wins;
  return {
    total,
    percentOfRounds: totalRounds ? round2((total / totalRounds) * 100) : 0,
    wins,
    losses,
    winRate: total ? round2((wins / total) * 100) : 0,
    avgFollowing: total ? round2(mean(triggers.map((t) => t.avgNext))) : 0,
  };
}

export function calculateStreaks(rounds: Round[]): Streaks {
  if (!rounds.length) return { current: 0, currentIsWin: true, best: 0 };
  const isWin = (m: number) => m >= TRIGGER_THRESHOLD;
  let best = 1;
  let run = 1;
  for (let i = 1; i < rounds.length; i++) {
    if (isWin(rounds[i].multiplier) === isWin(rounds[i - 1].multiplier)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  const lastIsWin = isWin(rounds[rounds.length - 1].multiplier);
  let current = 0;
  for (let i = rounds.length - 1; i >= 0; i--) {
    if (isWin(rounds[i].multiplier) === lastIsWin) current++;
    else break;
  }
  return { current, currentIsWin: lastIsWin, best };
}

function reachRate(rounds: Round[], target: number, triggers: Trigger[]): { rate: number; sample: number } {
  const hits = triggers.filter((t) => t.nextN.some((m) => m >= target)).length;
  if (triggers.length >= 5) return { rate: hits / triggers.length, sample: triggers.length };
  const base = rounds.filter((r) => r.multiplier >= target).length;
  const sample = rounds.length || 1;
  return { rate: base / sample, sample };
}

export function generateSignal(rounds: Round[], options?: { targetMultiplier?: number }): Signal {
  const target = options?.targetMultiplier ?? 2.0;
  const triggers = findTriggers(rounds);
  const stats = calculateTriggerStats(triggers, rounds.length);
  const vol = calculateVolatility(rounds);
  const streaks = calculateStreaks(rounds);
  const { rate, sample } = reachRate(rounds, target, triggers);

  const sampleFactor = Math.min(1, sample / 40);
  const raw = rate * 100 * 0.7 + 55 * 0.3 * sampleFactor - vol.value * 8;
  const [lo, hi] = confidenceBounds(target);
  const confidence = Math.round(clamp(raw, lo, hi));

  const entryTime = new Date();
  const countdownSeconds = SIGNAL_CYCLE_SECONDS - (entryTime.getSeconds() % SIGNAL_CYCLE_SECONDS);
  const action: SignalAction = countdownSeconds <= BET_WINDOW_SECONDS ? 'Bet Now' : 'Standby';
  const lang = i18n.language?.startsWith('sw') ? 'sw' : 'en';
  const entryTimeFormatted = new Intl.DateTimeFormat(lang, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(entryTime);

  return {
    id: `sig-${target}-${entryTime.getTime()}`,
    targetMultiplier: target,
    tier: tierForTarget(target),
    riskLevel: riskForTarget(target),
    entryTime,
    entryTimeFormatted,
    cashOutAt: target,
    countdownSeconds,
    action,
    confidence,
    confidenceBreakdown: {
      winRate: round2(rate * 100),
      sampleSize: sample,
      volatility: vol.value,
    },
    basedOnRounds: rounds.length,
    winRate: stats.winRate,
    avgFollowingMultiplier: stats.avgFollowing,
    currentStreak: streaks.current,
    nextSignalInMinutes: 1,
    expiresAt: new Date(entryTime.getTime() + countdownSeconds * 1000),
  };
}

export function generateAllTiers(rounds: Round[]): { target: number; signal: Signal }[] {
  return MULTI_TIER_TARGETS.map((target) => ({
    target,
    signal: generateSignal(rounds, { targetMultiplier: target }),
  }));
}

export function generateInsights(rounds: Round[]): string[] {
  const t = (key: string, opts: Record<string, unknown>) => i18n.t(key, opts);
  if (rounds.length < 5) return [t('engine:insights.not_enough', {})];

  const vol = calculateVolatility(rounds);
  const streaks = calculateStreaks(rounds);
  const triggers = findTriggers(rounds);
  const stats = calculateTriggerStats(triggers, rounds.length);
  const dist = calculateDistribution(rounds);
  const top = dist.reduce((a, b) => (b.percent > a.percent ? b : a), dist[0]);
  const winPercent = round2((rounds.filter((r) => r.multiplier >= TRIGGER_THRESHOLD).length / rounds.length) * 100);
  const values = rounds.map((r) => r.multiplier).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];

  const bandLabel = (b: DistributionBucket) =>
    b.max === Number.POSITIVE_INFINITY
      ? t('engine:bands.b5', {})
      : t(`engine:bands.${b.key}`, {});

  return [
    t('engine:insights.vol', { value: vol.value, level: t(`engine:vol_levels.${vol.level.toLowerCase()}`, {}) }),
    t('engine:insights.winrate', { percent: winPercent, count: rounds.length }),
    t('engine:insights.streak', {
      streak: streaks.current,
      kind: streaks.currentIsWin ? t('engine:insights.win_word', {}) : t('engine:insights.loss_word', {}),
      best: streaks.best,
    }),
    t('engine:insights.trigger', { percent: stats.winRate, count: stats.total }),
    t('engine:insights.band', { band: bandLabel(top), percent: top.percent }),
    t('engine:insights.avg', { value: vol.mean, median: round2(median) }),
  ];
}
