import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const COUNT = 40;
const LINK_DIST = 120;

export function ParticleNetwork({ height = 360 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const nodes = useRef<Node[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = () => canvas.width / devicePixelRatio;
    const h = () => canvas.height / devicePixelRatio;

    if (nodes.current.length === 0) {
      nodes.current = Array.from({ length: COUNT }, () => ({
        x: Math.random() * 800,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    }

    const draw = () => {
      ctx.clearRect(0, 0, w(), h());
      const ns = nodes.current;
      for (const nd of ns) {
        if (!reduced) {
          nd.x += nd.vx;
          nd.y += nd.vy;
          if (nd.x < 0 || nd.x > w()) nd.vx *= -1;
          if (nd.y < 0 || nd.y > h()) nd.vy *= -1;
        }
      }
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.4;
            ctx.strokeStyle = `rgba(0,229,192,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ns[i].x, ns[i].y);
            ctx.lineTo(ns[j].x, ns[j].y);
            ctx.stroke();
          }
        }
      }
      for (const nd of ns) {
        ctx.fillStyle = 'rgba(255,61,127,0.8)';
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      raf.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [height]);

  return <canvas ref={canvasRef} className="h-full w-full" style={{ height }} aria-hidden="true" />;
}

export default ParticleNetwork;
