import type { DrawPoint, DrawStroke } from './schema';

export function distanceToSegment(point: DrawPoint, start: DrawPoint, end: DrawPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
}

/** Hit tolerance belongs to the interaction, not the source geometry. */
export function hitTestStroke(
  strokes: readonly DrawStroke[],
  point: DrawPoint,
  tolerance: number,
): DrawStroke | null {
  let nearest: { readonly stroke: DrawStroke; readonly distance: number } | null = null;
  for (const stroke of strokes) {
    const points = stroke.points;
    const distances = points.length === 1
      ? [Math.hypot(point.x - points[0]!.x, point.y - points[0]!.y)]
      : points.slice(1).map((end, index) => distanceToSegment(point, points[index]!, end));
    const distance = Math.min(...distances) - stroke.width / 2;
    if (distance <= tolerance && (nearest === null || distance < nearest.distance)) {
      nearest = { stroke, distance };
    }
  }
  return nearest?.stroke ?? null;
}

export function isUsableGuidePath(points: readonly DrawPoint[]): boolean {
  if (points.length < 2) return false;
  return points.some((point, index) => index > 0 && Math.hypot(point.x - points[0]!.x, point.y - points[0]!.y) >= 12);
}
