import type { DrawStroke } from '../../core/draw/schema';

/** Crop the viewport, never the authored geometry. */
export function SourceMark({ strokes, label }: { strokes: readonly DrawStroke[]; label: string }) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, margin = 10;
  for (const stroke of strokes) { margin = Math.max(margin, stroke.width); for (const p of stroke.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); } }
  if (!Number.isFinite(minX)) return null;
  return <svg viewBox={`${minX - margin} ${minY - margin} ${Math.max(32, maxX - minX + margin * 2)} ${Math.max(32, maxY - minY + margin * 2)}`} role="img" aria-label={label} style={{ width: '100%', height: 70, display: 'block' }}>{strokes.map(s => s.points.length === 1 ? <circle key={s.strokeId} cx={s.points[0]!.x} cy={s.points[0]!.y} r={s.width / 2} fill={s.color} /> : <polyline key={s.strokeId} points={s.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />)}</svg>;
}
