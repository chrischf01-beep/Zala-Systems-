import { useEffect, useRef, useState } from 'react';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Full-viewport animated SVG: drifting point grid, oscillating sine wave, and a
 * radial glow that follows the cursor. Drift disabled under reduced motion.
 */
export function HeroBackground() {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  const [cursor, setCursor] = useState({ x: 50, y: 40 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    let start = performance.now();
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      void start;
    };
  }, [reduced]);

  const W = 1200;
  const H = 800;
  const cols = 24;
  const rows = 16;

  const points: string[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = (i / (cols - 1)) * W;
      const y = (j / (rows - 1)) * H;
      const dx = reduced ? 0 : Math.sin(t * 0.6 + i * 0.5) * 4;
      const dy = reduced ? 0 : Math.cos(t * 0.5 + j * 0.5) * 4;
      points.push(`${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`);
    }
  }

  const wave: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = (i / 120) * W;
    const y = H / 2 + Math.sin(i * 0.12 + (reduced ? 0 : t)) * 60 + Math.sin(i * 0.05) * 30;
    wave.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setCursor({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
      }}
    >
      <defs>
        <radialGradient id="hbGlow">
          <stop offset="0%" stopColor="#00E5C0" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#00E5C0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hbWave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00E5C0" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#00E5C0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF3D7F" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <g fill="#1E2A44">
        {points.map((p, i) => (
          <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r="1.4" opacity="0.6" />
        ))}
      </g>
      <polyline points={wave.join(' ')} fill="none" stroke="url(#hbWave)" strokeWidth="2" />
      <circle cx={`${cursor.x}%`} cy={`${cursor.y}%`} r="260" fill="url(#hbGlow)" />
    </svg>
  );
}

export default HeroBackground;
