import { create } from 'zustand';
import * as db from '../lib/db';
import { zalaPredict, type PredictionOutput } from '../lib/zalaPredict';
import type { PredictionRecord, Profile } from '../lib/types';
import { shortId } from '../lib/format';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';

interface PredictState {
  sessionId: string;
  sessionSeed: number;
  history: number[];
  records: PredictionRecord[];
  currentPrediction: PredictionOutput | null;
  generating: boolean;
  showMath: boolean;
  newSession: () => void;
  loadRecords: () => Promise<void>;
  generate: (profile?: Profile) => Promise<PredictionOutput>;
  save: () => Promise<PredictionRecord | null>;
  reset: () => void;
  remove: (id: string) => Promise<void>;
  setShowMath: (v: boolean) => void;
}

let worker: Worker | null = null;
function getWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/predict.worker.ts', import.meta.url), {
      type: 'module',
    });
    return worker;
  } catch {
    return null;
  }
}

function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeSession() {
  const id = `ZALA-${shortId(4)}-${shortId(4)}`;
  return { sessionId: id, sessionSeed: seedFromId(id) };
}

function runOnWorker(input: Parameters<typeof zalaPredict>[0]): Promise<PredictionOutput> {
  return new Promise((resolve) => {
    const w = getWorker();
    if (!w) {
      resolve(zalaPredict(input));
      return;
    }
    const onMessage = (e: MessageEvent<PredictionOutput>) => {
      w.removeEventListener('message', onMessage as EventListener);
      resolve(e.data);
    };
    w.addEventListener('message', onMessage as EventListener);
    w.postMessage(input);
  });
}

export const usePredictStore = create<PredictState>()((set, get) => ({
  ...makeSession(),
  history: [],
  records: [],
  currentPrediction: null,
  generating: false,
  showMath: false,

  newSession: () => set({ ...makeSession(), history: [], currentPrediction: null }),

  loadRecords: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ records: [] });
      return;
    }
    const records = await db.listPredictionsForUser(user.id);
    set({ records });
  },

  generate: async (profile) => {
    set({ generating: true });
    try {
      const { sessionId, sessionSeed, history } = get();
      const activeProfile = profile ?? useSettingsStore.getState().profile;
      const out = await runOnWorker({
        history,
        sessionSeed,
        timestamp: Date.now(),
        profile: activeProfile,
      });

      // Anti-degeneration recovery pulse (spec 3.11): if the last three saved
      // predictions were all below 1.60x, nudge the result upward.
      const recent = get()
        .records.slice(0, 3)
        .map((r) => r.prediction);
      if (recent.length >= 3 && recent.every((p) => p < 1.6)) {
        out.prediction = Math.round(out.prediction * 1.15 * 100) / 100;
        out.max = Math.round(out.max * 1.2 * 100) / 100;
      }

      set({ currentPrediction: out, history: [...history, out.prediction] });
      return out;
    } finally {
      set({ generating: false });
    }
  },

  save: async () => {
    const user = useAuthStore.getState().user;
    const out = get().currentPrediction;
    if (!user || !out) return null;
    const record = await db.addPrediction({
      user_id: user.id,
      session_id: get().sessionId,
      prediction: out.prediction,
      expected: out.expected,
      min_value: out.min,
      max_value: out.max,
      confidence: out.confidence,
      volatility: out.volatility,
      momentum: out.momentum,
      fib_weight: out.fibWeight,
      bayes_mean: out.bayesMean,
      model: out.model,
      runs: out.runs,
    });
    set({ records: [record, ...get().records] });
    return record;
  },

  reset: () => set({ currentPrediction: null }),

  remove: async (id) => {
    await db.removePrediction(id);
    set({ records: get().records.filter((r) => r.id !== id) });
  },

  setShowMath: (v) => set({ showMath: v }),
}));
