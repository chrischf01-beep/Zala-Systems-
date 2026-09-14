import { zalaPredict, type PredictionInput, type PredictionOutput } from '../lib/zalaPredict';

self.onmessage = (e: MessageEvent<PredictionInput>) => {
  const result: PredictionOutput = zalaPredict(e.data);
  (self as unknown as Worker).postMessage(result);
};
