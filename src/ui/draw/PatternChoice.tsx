import type { DrawStroke } from '../../core/draw';

/** A small diagram of the selected original, never a replacement for its source geometry. */
export function PatternChoice({ kind, strokes = [] }: { kind: 'close' | 'even' | 'wide' | 'same' | 'smaller'; strokes?: readonly DrawStroke[] }) {
  const positions = kind === 'close' ? [33, 51, 69, 87] : kind === 'wide' ? [12, 44, 76, 108] : [21, 47, 73, 99];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const stroke of strokes) for (const point of stroke.points) {
    minX = Math.min(minX, point.x - stroke.width / 2); minY = Math.min(minY, point.y - stroke.width / 2);
    maxX = Math.max(maxX, point.x + stroke.width / 2); maxY = Math.max(maxY, point.y + stroke.width / 2);
  }
  const scale = 19 / Math.max(1, maxX - minX, maxY - minY);
  const centreX = (minX + maxX) / 2, centreY = (minY + maxY) / 2;
  return <svg viewBox="0 0 120 42" aria-hidden="true" focusable="false">
    {positions.map((x, i) => <g key={x} transform={`translate(${x} 21) scale(${kind === 'smaller' ? 1 - i * .21 : 1})`}>
      {Number.isFinite(centreX) ? <g transform={`scale(${scale}) translate(${-centreX} ${-centreY})`}>
        {strokes.map(stroke => stroke.points.length === 1 ? <circle key={stroke.strokeId} cx={stroke.points[0]!.x} cy={stroke.points[0]!.y} r={stroke.width / 2} fill={stroke.color} /> : <polyline key={stroke.strokeId} points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
      </g> : <path d="M 0 -10 L 9 0 L 0 10 L -9 0 Z" fill="currentColor" />}
    </g>)}
  </svg>;
}
