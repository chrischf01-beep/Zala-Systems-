import { useMemo } from 'react';

interface Branch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
}

const MAX_DEPTH = 8;
const ANGLE = 32 * (Math.PI / 180);

export function FractalTree({ height = 320 }: { height?: number }) {
  const branches = useMemo<Branch[]>(() => {
    const out: Branch[] = [];
    const grow = (x: number, y: number, len: number, ang: number, depth: number) => {
      if (depth > MAX_DEPTH || len < 2) return;
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      out.push({ x1: x, y1: y, x2: x2, y2: y2, depth });
      grow(x2, y2, len * 0.72, ang - ANGLE, depth + 1);
      grow(x2, y2, len * 0.72, ang + ANGLE, depth + 1);
    };
    grow(150, 300, 70, -Math.PI / 2, 0);
    return out;
  }, []);

  return (
    <svg viewBox="0 0 300 320" width="100%" height={height} role="img" aria-label="Fractal tree">
      {branches.map((b, i) => {
        const t = b.depth / MAX_DEPTH;
        const color = t < 0.5 ? '#00E5C0' : '#FF3D7F';
        return (
          <line
            key={i}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={color}
            strokeWidth={Math.max(3 - b.depth * 0.32, 0.5)}
            strokeLinecap="round"
            opacity={0.85 - t * 0.3}
          />
        );
      })}
    </svg>
  );
}

export default FractalTree;
