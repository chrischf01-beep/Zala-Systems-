export function formatMultiplier(v: number): string {
  return `${v.toFixed(2)}x`;
}

export function formatNumber(v: number, locale: string, digits = 2): string {
  return new Intl.NumberFormat(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

export function formatPercent(v: number, locale: string): string {
  return `${Math.round(v)}%`;
}

export function formatDate(ts: number, locale: string): string {
  const l = locale === 'sw' ? 'sw-TZ' : 'en-US';
  return new Intl.DateTimeFormat(l, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts));
}

export function formatDateTime(ts: number, locale: string): string {
  const l = locale === 'sw' ? 'sw-TZ' : 'en-US';
  return new Intl.DateTimeFormat(l, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function shortId(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
