import { useMemo } from 'react';

interface Props {
  data: number[];
  window?: number;
  height?: number;
}

const W = 800;
const H = 300;
const PAD = { l: 40, r: 16, t: 16, b: 24 };

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export function Candlestick({ data, window: win = 5, height = 280 }: Props) {
  const candles = useMemo<Candle[]>(() => {
    const out: Candle[] = [];
    for (let i = 0; i + win <= data.length; i += win) {
      const slice = data.slice(i, i + win);
      out.push({
        open: slice[0],
        close: slice[slice.length - 1],
        high: Math.max(...slice),
        low: Math.min(...slice),
      });
    }
    return out;
  }, [data, win]);

  if (candles.length === 0) return <div className="text-muted text-sm">--</div>;

  const max = Math.max(...candles.map((c) => c.high)) * 1.08;
  const min = Math.min(...candles.map((c) => c.low), 1.5) * 0.92;
  const span = Math.max(max - min, 1e-6);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const cw = innerW / candles.length;
  const bodyW = Math.min(cw * 0.6, 26);

  const yOf = (v: number) => PAD.t + innerH - ((v - min) / span) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      {Array.from({ length: 5 }).map((_, i) => {
        const y = PAD.t + (innerH / 4) * i;
        const val = max - ((max - min) / 4) * i;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1E2A44" strokeWidth="1" />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#7A8AA8" className="font-mono">
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}
      {candles.map((c, i) => {
        const cx = PAD.l + cw * i + cw / 2;
        const up = c.close >= c.open;
        const color = up ? '#3DFF8F' : '#FF5470';
        const yHigh = yOf(c.high);
        const yLow = yOf(c.low);
        const yOpen = yOf(c.open);
        const yClose = yOf(c.close);
        const top = Math.min(yOpen, yClose);
        const hgt = Math.max(Math.abs(yClose - yOpen), 2);
        return (
          <g key={i}>
            <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth="1" />
            <rect x={cx - bodyW / 2} y={top} width={bodyW} height={hgt} fill={color} opacity="0.85" rx="2" />
          </g>
        );
      })}
    </svg>
  );
}

export default Candlestick;
