import { useEffect, useState } from 'react';

interface Props {
  value: number; // 0..100
  size?: number;
  label?: string;
}

export function ConfidenceGauge({ value, size = 200, label }: Props) {
  const [display, setDisplay] = useState(0);
  const r = (size - 24) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));

  useEffect(() => {
    let raf = 0;
    const from = display;
    const start = performance.now();
    const dur = 700;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setDisplay(from + (clamped - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  const offset = c * (1 - display / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={label ? `${label} ${Math.round(clamped)}%` : `${Math.round(clamped)}%`}>
      <defs>
        <linearGradient id="cgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5C0" />
          <stop offset="100%" stopColor="#FF3D7F" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E2A44" strokeWidth="12" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#cgGrad)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: 'drop-shadow(0 0 6px rgba(0,229,192,0.45))' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono"
        fontSize={size * 0.2}
        fontWeight="700"
        fill="#EAF2FF"
      >
        {Math.round(display)}%
      </text>
    </svg>
  );
}

export default ConfidenceGauge;
