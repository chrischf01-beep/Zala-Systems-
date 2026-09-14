interface Props {
  data: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 80, height = 24 }: Props) {
  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(max - min, 1e-6);
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => `${(i * step).toFixed(1)},${(height - ((d - min) / span) * height).toFixed(1)}`);
  const up = data[data.length - 1] >= data[0];
  const color = up ? '#3DFF8F' : '#FF5470';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default Sparkline;
