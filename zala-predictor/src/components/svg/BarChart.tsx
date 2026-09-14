import { useMemo, useState } from 'react';

interface Props {
  data: number[];
  height?: number;
  colorFor?: (v: number) => string;
  formatValue?: (v: number) => string;
}

const W = 800;
const H = 220;
const PAD = { l: 40, r: 12, t: 14, b: 24 };

export function BarChart({
  data,
  height = 220,
  colorFor = () => '#00E5C0',
  formatValue = (v) => v.toFixed(2),
}: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (data.length === 0) return null;
    const max = Math.max(...data) * 1.1;
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const bw = innerW / data.length;
    const bars = data.map((v, i) => {
      const h = (v / max) * innerH;
      return { x: PAD.l + i * bw, y: PAD.t + innerH - h, w: Math.max(bw - 2, 1), h, v, i };
    });
    return { bars, max, innerH };
  }, [data]);

  if (!geom) return <div className="text-muted text-sm">--</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      {[0, 0.5, 1].map((f, i) => {
        const y = PAD.t + geom.innerH * f;
        const val = geom.max * (1 - f);
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1E2A44" strokeWidth="1" />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#7A8AA8" className="font-mono">
              {val.toFixed(0)}x
            </text>
          </g>
        );
      })}
      {geom.bars.map((b) => (
        <rect
          key={b.i}
          x={b.x + 1}
          y={b.y}
          width={b.w}
          height={b.h}
          rx="2"
          fill={colorFor(b.v)}
          opacity={hover === null || hover === b.i ? 0.9 : 0.4}
          onMouseEnter={() => setHover(b.i)}
          onMouseLeave={() => setHover(null)}
          style={{ transition: 'opacity 0.15s' }}
        />
      ))}
      {hover !== null && geom.bars[hover] && (
        <text
          x={Math.min(Math.max(geom.bars[hover].x + geom.bars[hover].w / 2, PAD.l + 20), W - PAD.r - 20)}
          y={Math.max(geom.bars[hover].y - 6, 12)}
          textAnchor="middle"
          fontSize="11"
          fill="#EAF2FF"
          className="font-mono"
        >
          {formatValue(geom.bars[hover].v)}x
        </text>
      )}
    </svg>
  );
}

export default BarChart;
