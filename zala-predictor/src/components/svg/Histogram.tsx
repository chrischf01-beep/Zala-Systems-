import { useEffect, useState } from 'react';

interface Props {
  bins: number[];
  min: number;
  max: number;
  height?: number;
}

const W = 800;
const H = 240;
const PAD = { l: 40, r: 16, t: 16, b: 28 };

export function Histogram({ bins, min, max, height = 240 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [bins]);

  if (!bins.length) return <div className="text-muted text-sm">--</div>;

  const peak = Math.max(...bins, 1);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const bw = innerW / bins.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="hgBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E5C0" />
          <stop offset="100%" stopColor="#FF3D7F" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f, i) => {
        const y = PAD.t + innerH * f;
        return <line key={i} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1E2A44" strokeWidth="1" />;
      })}
      {bins.map((b, i) => {
        const h = (b / peak) * innerH;
        const x = PAD.l + i * bw;
        const y = PAD.t + innerH - (mounted ? h : 0);
        return (
          <rect
            key={i}
            x={x + 1}
            y={y}
            width={Math.max(bw - 2, 1)}
            height={mounted ? h : 0}
            fill="url(#hgBar)"
            rx="2"
            style={{ transition: 'height 0.7s cubic-bezier(.22,1,.36,1), y 0.7s cubic-bezier(.22,1,.36,1)' }}
          />
        );
      })}
      <text x={PAD.l} y={H - 8} fontSize="11" fill="#7A8AA8" className="font-mono">
        {min.toFixed(2)}x
      </text>
      <text x={W - PAD.r} y={H - 8} fontSize="11" fill="#7A8AA8" textAnchor="end" className="font-mono">
        {max.toFixed(2)}x
      </text>
    </svg>
  );
}

export default Histogram;
