import { useMemo, useState } from 'react';

interface Props {
  data: number[];
  height?: number;
  formatValue?: (v: number) => string;
}

const W = 800;
const H = 300;
const PAD = { l: 46, r: 16, t: 16, b: 30 };

export function LineChart({ data, height = 300, formatValue = (v) => v.toFixed(2) }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (data.length === 0) return null;
    const max = Math.max(...data) * 1.1;
    const min = Math.min(...data, 1.5) * 0.9;
    const span = Math.max(max - min, 1e-6);
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const pts = data.map((d, i) => {
      const x = PAD.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
      const y = PAD.t + innerH - ((d - min) / span) * innerH;
      return { x, y, v: d, i };
    });
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${PAD.l},${PAD.t + innerH} ${line} ${(pts[pts.length - 1]?.x ?? PAD.l).toFixed(1)},${PAD.t + innerH}`;
    return { pts, line, area, min, max, innerH };
  }, [data]);

  if (!geom) {
    return <div className="text-muted text-sm">--</div>;
  }

  const gridLines = 5;
  const hovered = hover != null ? geom.pts[hover] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="lcArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E5C0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00E5C0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lcLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00E5C0" />
          <stop offset="100%" stopColor="#FF3D7F" />
        </linearGradient>
      </defs>

      {Array.from({ length: gridLines }).map((_, i) => {
        const y = PAD.t + (geom.innerH / (gridLines - 1)) * i;
        const val = geom.max - ((geom.max - geom.min) / (gridLines - 1)) * i;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1E2A44" strokeWidth="1" />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#7A8AA8" className="font-mono">
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}

      <polygon points={geom.area} fill="url(#lcArea)" />
      <polyline
        points={geom.line}
        fill="none"
        stroke="url(#lcLine)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ strokeDasharray: 4000, strokeDashoffset: 4000, animation: 'draw 1.2s ease forwards' }}
      />
      <style>{'@keyframes draw { to { stroke-dashoffset: 0; } }'}</style>

      {geom.pts.map((p) => (
        <circle
          key={p.i}
          cx={p.x}
          cy={p.y}
          r={hover === p.i ? 5 : 3}
          fill="#05070F"
          stroke="#00E5C0"
          strokeWidth="2"
          onMouseEnter={() => setHover(p.i)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: 'pointer' }}
        />
      ))}

      {hovered && (
        <g pointerEvents="none">
          <rect
            x={Math.min(Math.max(hovered.x - 40, PAD.l), W - PAD.r - 80)}
            y={Math.max(hovered.y - 34, 4)}
            width="80"
            height="24"
            rx="6"
            fill="#131A2E"
            stroke="#1E2A44"
          />
          <text
            x={Math.min(Math.max(hovered.x, PAD.l + 40), W - PAD.r - 40)}
            y={Math.max(hovered.y - 34, 4) + 16}
            textAnchor="middle"
            fontSize="12"
            fill="#EAF2FF"
            className="font-mono"
          >
            {formatValue(hovered.v)}
          </text>
        </g>
      )}
    </svg>
  );
}

export default LineChart;
