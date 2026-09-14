import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateDistribution,
  calculateStreaks,
  calculateTriggerStats,
  calculateVolatility,
  findTriggers,
  generateAllTiers,
  generateInsights,
  generateRounds,
  tierForTarget,
  type DistributionBucket,
  type Round,
  type Signal,
  type SignalAction,
  type Streaks,
  type TierName,
  type Trigger,
  type TriggerStats,
  type Volatility,
  BET_WINDOW_SECONDS,
} from '../lib/predictorEngine';
import { useSettingsStore } from '../stores/settingsStore';

export type WindowSize = 50 | 100 | 500 | 'all';

export interface PredictorEngine {
  rounds: Round[];
  allRounds: Round[];
  signal: Signal;
  action: SignalAction;
  countdown: number;
  selectedWindow: WindowSize;
  selectedTier: TierName;
  distribution: DistributionBucket[];
  volatility: Volatility;
  triggers: Trigger[];
  triggerStats: TriggerStats;
  streaks: Streaks;
  insights: string[];
  allTiers: { target: number; signal: Signal }[];
  setSelectedWindow: (w: WindowSize) => void;
  setSelectedTier: (t: TierName) => void;
  regenerateSignal: () => void;
}

export function usePredictorEngine(initialCount = 100): PredictorEngine {
  const language = useSettingsStore((s) => s.language);
  const [allRounds, setAllRounds] = useState<Round[]>(() => generateRounds(initialCount, 1));
  const [selectedWindow, setSelectedWindow] = useState<WindowSize>(100);
  const [selectedTier, setSelectedTier] = useState<TierName>('Medium');
  const [nonce, setNonce] = useState(0);

  const rounds = useMemo(
    () => (selectedWindow === 'all' ? allRounds : allRounds.slice(-selectedWindow)),
    [allRounds, selectedWindow]
  );

  const distribution = useMemo(() => calculateDistribution(rounds), [rounds]);
  const volatility = useMemo(() => calculateVolatility(rounds), [rounds]);
  const triggers = useMemo(() => findTriggers(rounds), [rounds]);
  const triggerStats = useMemo(() => calculateTriggerStats(triggers, rounds.length), [triggers, rounds]);
  const streaks = useMemo(() => calculateStreaks(rounds), [rounds]);
  const allTiers = useMemo(() => generateAllTiers(rounds), [rounds, nonce]);
  const insights = useMemo(() => generateInsights(rounds), [rounds, language, nonce]);

  const signal = useMemo(() => {
    const match = allTiers.find((entry) => tierForTarget(entry.target) === selectedTier);
    return (match ?? allTiers[0]).signal;
  }, [allTiers, selectedTier]);

  const [countdown, setCountdown] = useState(signal.countdownSeconds);

  useEffect(() => {
    setCountdown(signal.countdownSeconds);
  }, [signal.id, signal.countdownSeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) return;
    setAllRounds((prev) => {
      const nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
      return [...prev, ...generateRounds(1, nextId)];
    });
  }, [countdown]);

  const regenerateSignal = useCallback(() => setNonce((n) => n + 1), []);

  const action: SignalAction =
    countdown <= 0 ? 'Cash Out' : countdown <= BET_WINDOW_SECONDS ? 'Bet Now' : 'Standby';

  return {
    rounds,
    allRounds,
    signal,
    action,
    countdown: Math.max(0, countdown),
    selectedWindow,
    selectedTier,
    distribution,
    volatility,
    triggers,
    triggerStats,
    streaks,
    insights,
    allTiers,
    setSelectedWindow,
    setSelectedTier,
    regenerateSignal,
  };
}

export default usePredictorEngine;
