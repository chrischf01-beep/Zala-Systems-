import { useId } from 'react';

interface LogoProps {
  size?: number;
  mono?: boolean;
  animate?: boolean;
  withWord?: boolean;
}

/**
 * Geometric brand mark: Fibonacci rectangles, a growth spiral, a waveform
 * overlay, and a "Z" formed from two diagonal vectors.
 */
export function LogoMark({ size = 48, mono = false, animate = true }: LogoProps) {
  const id = useId();
  const stroke = mono ? 'currentColor' : `url(#${id})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Zala Predictor logo">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E5C0" />
          <stop offset="1" stopColor="#FF3D7F" />
        </linearGradient>
      </defs>
      <g
        style={
          animate
            ? { transformOrigin: '32px 32px', animation: 'spinSlow 20s linear infinite' }
            : undefined
        }
      >
        {/* Fibonacci rectangles */}
        <rect x="8" y="8" width="48" height="48" rx="6" fill="none" stroke={stroke} strokeWidth="1" opacity="0.35" />
        <rect x="8" y="8" width="30" height="30" rx="4" fill="none" stroke={stroke} strokeWidth="1" opacity="0.3" />
        <rect x="38" y="8" width="18" height="18" rx="3" fill="none" stroke={stroke} strokeWidth="1" opacity="0.25" />
        {/* Growth spiral */}
        <path
          d="M32 32 m0 -18 a18 18 0 0 1 18 18 a12 12 0 0 1 -12 12 a8 8 0 0 1 -8 -8 a5 5 0 0 1 5 -5"
          fill="none"
          stroke={stroke}
          strokeWidth="1.4"
          opacity="0.55"
        />
      </g>
      {/* Waveform overlay */}
      <path
        d="M12 44 q5 -10 10 0 t10 0 t10 0 t10 0"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        opacity="0.5"
      />
      {/* Z from two diagonal vectors */}
      <path
        d="M20 20 H44 L20 44 H44"
        fill="none"
        stroke={stroke}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 40, withWord = true, mono = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} mono={mono} />
      {withWord && (
        <span className="font-heading text-lg font-bold tracking-tight sm:text-xl">
          <span className={mono ? '' : 'text-gradient'}>Zala</span>{' '}
          <span className="text-text">Predictor</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
