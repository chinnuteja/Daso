import type { DrawDocument, DrawStroke } from '../../core/draw';

/** A presentation budget, not a rewrite or lossy simplification of canonical artwork. */
export const MAX_WORKBENCH_POINTS = 65_536;
export function exceedsDrawingBudget(drawing: DrawDocument): boolean {
  return drawing.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) > MAX_WORKBENCH_POINTS;
}
export function assertCanAddLine(drawing: DrawDocument, stroke: DrawStroke): void {
  if (drawing.strokes.reduce((sum, line) => sum + line.points.length, stroke.points.length) > MAX_WORKBENCH_POINTS) throw new Error('This drawing is too detailed for this desk. Your earlier lines are kept. Download them before starting another drawing.');
}
