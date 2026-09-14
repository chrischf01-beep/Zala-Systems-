import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Skeleton } from '../components/ui';
import { ConfidenceGauge } from '../components/svg/ConfidenceGauge';
import { Histogram } from '../components/svg/Histogram';
import { Sparkline } from '../components/svg/Sparkline';
import { usePredictStore } from '../stores/predictStore';
import { useSettingsStore } from '../stores/settingsStore';
import { toast } from '../stores/toastStore';
import { formatMultiplier } from '../lib/format';
import { PredictIcon, CheckIcon, PlusIcon } from '../components/svg/icons';

function useCountUp(target: number, run: boolean) {
  const [val, setVal] = useState(target);
  const raf = useRef(0);
  useEffect(() => {
    if (!run) {
      setVal(target);
      return;
    }
    const from = 1.5;
    const start = performance.now();
    const dur = 900;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setVal(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run]);
  return val;
}

export function Predict() {
  const { t } = useTranslation(['predict', 'common']);
  const profile = useSettingsStore((s) => s.profile);
  const {
    generating,
    currentPrediction,
    history,
    sessionId,
    showMath,
    generate,
    save,
    reset,
    setShowMath,
    newSession,
  } = usePredictStore();

  const [animKey, setAnimKey] = useState(0);
  const shown = useCountUp(currentPrediction?.prediction ?? 1.5, !!currentPrediction && animKey > 0);

  const onGenerate = async () => {
    await generate(profile);
    setAnimKey((k) => k + 1);
    toast(t('predict:generated'), 'success');
  };

  const onSave = async () => {
    const rec = await save();
    if (rec) toast(t('predict:saved'), 'success');
  };

  const spark = history.slice(-16);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t('predict:title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('predict:subtitle')}</p>
        </div>
        <p className="font-mono text-xs text-muted">
          {t('predict:profile')}: <span className="text-primary">{profile}</span> · {sessionId}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main result */}
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {t('predict:result')}
            </h2>
            {spark.length > 1 && <Sparkline data={spark} width={100} height={26} />}
          </div>

          <div className="mt-6 flex flex-col items-center justify-center py-4" aria-live="polite">
            {generating ? (
              <div className="flex w-full flex-col items-center gap-3">
                <Skeleton className="h-20 w-56" />
                <p className="font-mono text-sm text-primary">{t('predict:generating')}</p>
              </div>
            ) : currentPrediction ? (
              <span className="font-mono text-7xl font-bold leading-none text-gradient sm:text-8xl">
                {shown.toFixed(2)}x
              </span>
            ) : (
              <p className="py-8 text-center text-sm text-muted">{t('predict:awaiting')}</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1"
              loading={generating}
              icon={<PredictIcon size={18} />}
              onClick={onGenerate}
            >
              {generating ? t('predict:generating') : t('predict:generate')}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              disabled={!currentPrediction || generating}
              icon={<CheckIcon size={18} />}
              onClick={onSave}
            >
              {t('predict:save_prediction')}
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="ghost"
              className="flex-1"
              disabled={generating}
              icon={<PlusIcon size={18} />}
              onClick={() => {
                reset();
                setAnimKey(0);
              }}
            >
              {t('predict:new_prediction')}
            </Button>
            <Button variant="ghost" className="flex-1" disabled={generating} onClick={newSession}>
              {t('predict:session_history')}
            </Button>
          </div>
        </Card>

        {/* Gauge + range */}
        <Card className="flex flex-col items-center p-6 lg:col-span-2">
          <h2 className="self-start text-sm font-semibold uppercase tracking-wide text-muted">
            {t('predict:confidence')}
          </h2>
          <div className="my-4">
            {currentPrediction ? (
              <ConfidenceGauge value={currentPrediction.confidence} size={190} label={t('predict:confidence')} />
            ) : (
              <ConfidenceGauge value={0} size={190} label={t('predict:confidence')} />
            )}
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center">
            <RangeCell label={t('predict:min')} value={currentPrediction ? formatMultiplier(currentPrediction.min) : '--'} />
            <RangeCell label={t('predict:expected')} value={currentPrediction ? formatMultiplier(currentPrediction.expected) : '--'} accent />
            <RangeCell label={t('predict:max')} value={currentPrediction ? formatMultiplier(currentPrediction.max) : '--'} />
          </div>
        </Card>
      </div>

      {/* Model metadata */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">{t('predict:model')}</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowMath(!showMath)}>
            {showMath ? t('predict:hide_math') : t('predict:show_math')}
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetaPill label={t('predict:monte_carlo_runs')} value={currentPrediction ? String(currentPrediction.runs) : '--'} />
          <MetaPill label={t('predict:volatility')} value={currentPrediction ? currentPrediction.volatility.toFixed(4) : '--'} />
          <MetaPill label={t('predict:momentum')} value={currentPrediction ? currentPrediction.momentum.toFixed(4) : '--'} />
          <MetaPill label={t('predict:fibonacci_weight')} value={currentPrediction ? currentPrediction.fibWeight.toFixed(4) : '--'} />
          <MetaPill label={t('predict:bayesian_prior')} value={currentPrediction ? currentPrediction.bayesMean.toFixed(4) : '--'} />
        </dl>

        {showMath && currentPrediction && (
          <div className="mt-5 rounded-xl border border-border bg-bg/60 p-4 font-mono text-xs leading-relaxed text-muted animate-fadeUp">
            <p className="mb-2 text-text">{t('predict:math_title')}</p>
            <pre className="whitespace-pre-wrap">{`FLOOR = 1.50   CEILING = 50.00   RUNS = ${currentPrediction.runs}
volatility = sigma / mu            = ${currentPrediction.volatility}
momentum   = EMA14 / EMA50         = ${currentPrediction.momentum}
fibWeight  = F(n) / F(n-1)         = ${currentPrediction.fibWeight}
bayesMean  = a / (a + b)           = ${currentPrediction.bayesMean}

draw = FLOOR * exp(GROWTH * fibWeight) * momentum
       * volFactor * (1 + z * volatility * 0.35)
       * (0.7 + bayesMean * 0.6) * profileBias

P05 = ${currentPrediction.min}   P50 = ${currentPrediction.prediction}   P95 = ${currentPrediction.max}
E   = ${currentPrediction.expected}
confidence = 100 * (1 - (P95 - P05) / E) = ${currentPrediction.confidence}%`}</pre>
          </div>
        )}
      </Card>

      {/* Distribution */}
      <Card className="p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">{t('predict:distribution')}</h2>
        {currentPrediction ? (
          <Histogram
            bins={currentPrediction.histogram}
            min={currentPrediction.histMin}
            max={currentPrediction.histMax}
            height={220}
          />
        ) : (
          <Skeleton className="h-[220px] w-full" />
        )}
      </Card>
    </div>
  );
}

function RangeCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold ${accent ? 'text-primary' : 'text-text'}`}>{value}</p>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-text">{value}</dd>
    </div>
  );
}

export default Predict;
