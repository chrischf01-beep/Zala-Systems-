/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#05070F',
        surface: '#0C1220',
        surface2: '#131A2E',
        primary: '#00E5C0',
        primaryDark: '#00A88F',
        secondary: '#FF3D7F',
        tertiary: '#FFB020',
        success: '#3DFF8F',
        danger: '#FF5470',
        text: '#EAF2FF',
        muted: '#7A8AA8',
        border: '#1E2A44',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'Sora', 'sans-serif'],
        body: ['Inter', 'IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0,229,192,0.35)',
        glowPink: '0 0 24px rgba(255,61,127,0.35)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        spinSlow: 'spinSlow 20s linear infinite',
        fadeUp: 'fadeUp 0.35s ease both',
      },
    },
  },
  plugins: [],
};
