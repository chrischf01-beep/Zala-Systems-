import {
  CEILING,
  FLOOR,
  clamp,
  ema,
  mulberry32,
  percentile,
  round2,
  round4,
  stdDev,
  mean as arithmeticMean,
} from './math';

export interface PredictionInput {
  history: number[];
  sessionSeed: number;
  timestamp: number;
  profile?: 'aggressive' | 'balanced' | 'conservative';
}

export interface PredictionOutput {
  prediction: number;
  expected: number;
  min: number;
  max: number;
  confidence: number;
  model: string;
  runs: number;
  volatility: number;
  momentum: number;
  fibWeight: number;
  bayesMean: number;
  /** 40-bin histogram of the Monte Carlo draws for the distribution chart. */
  histogram: number[];
  histMin: number;
  histMax: number;
}

const GROWTH = 0.0866;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
const RUNS = 5000;
const BINS = 40;
const BOOTSTRAP = [1.5, 1.72, 2.05, 1.63, 2.41, 3.1, 1.88, 2.66];

export function zalaPredict(input: PredictionInput): PredictionOutput {
  const rand = mulberry32((input.sessionSeed + input.timestamp) >>> 0);

  const history = input.history.length >= 5 ? input.history : BOOTSTRAP;
  const n = history.length;

  const mu = arithmeticMean(history);
  const sigma = stdDev(history);
  const volatility = mu === 0 ? 0 : sigma / mu;

  const emaShort = ema(history, 14);
  const emaLong = ema(history, 50);
  const momentum = clamp(emaShort / Math.max(emaLong, 1e-9), 0.65, 1.85);

  const fibIdx = Math.min(n, 11);
  const fibWeight = FIB[fibIdx] / FIB[fibIdx - 1];

  const wins = history.filter((x) => x > 2.0).length;
  const losses = history.length - wins;
  const bayesMean = clamp((1 + wins) / (2 + wins + losses), 0.35, 0.95);

  const volFactor = 1 + volatility * 0.5;

  const profileBias =
    input.profile === 'aggressive' ? 1.12 : input.profile === 'conservative' ? 0.94 : 1.0;

  const draws: number[] = new Array(RUNS);
  for (let i = 0; i < RUNS; i++) {
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    let draw =
      FLOOR *
      Math.exp(GROWTH * fibWeight) *
      momentum *
      volFactor *
      (1 + z * volatility * 0.35) *
      (0.7 + bayesMean * 0.6) *
      profileBias;

    draws[i] = clamp(draw, FLOOR, CEILING);
  }

  draws.sort((a, b) => a - b);
  const expected = draws.reduce((a, b) => a + b, 0) / RUNS;
  const p05 = percentile(draws, 0.05);
  const p50 = percentile(draws, 0.5);
  const p95 = percentile(draws, 0.95);

  let prediction = Math.max(p50, FLOOR);
  if (prediction < 1.1) prediction = FLOOR;

  const confidence = clamp(100 * (1 - (p95 - p05) / Math.max(expected, 1e-9)), 40, 99);

  const histMin = draws[0];
  const histMax = draws[RUNS - 1];
  const histogram = new Array(BINS).fill(0);
  const span = Math.max(histMax - histMin, 1e-9);
  for (let i = 0; i < RUNS; i++) {
    let b = Math.floor(((draws[i] - histMin) / span) * BINS);
    if (b >= BINS) b = BINS - 1;
    if (b < 0) b = 0;
    histogram[b]++;
  }

  return {
    prediction: round2(prediction),
    expected: round2(expected),
    min: round2(p05),
    max: round2(p95),
    confidence: Math.round(confidence),
    model: 'Zala-MC-Bayes-v1',
    runs: RUNS,
    volatility: round4(volatility),
    momentum: round4(momentum),
    fibWeight: round4(fibWeight),
    bayesMean: round4(bayesMean),
    histogram,
    histMin: round2(histMin),
    histMax: round2(histMax),
  };
}
