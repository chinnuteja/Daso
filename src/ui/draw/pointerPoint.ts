import { DRAW_HEIGHT, DRAW_WIDTH } from '../../core/draw';
import type { DrawPoint } from '../../core/draw';

/** Invert the rendered SVG transform, including aspect-ratio letterboxing and scroll. */
export function pointerPoint(surface: { getScreenCTM(): Readonly<{ a: number; b: number; c: number; d: number; e: number; f: number }> | null }, clientX: number, clientY: number): DrawPoint {
  const matrix = surface.getScreenCTM();
  if (matrix === null) throw new Error('The drawing surface is not ready.');
  const { a, b, c, d, e, f } = matrix;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) throw new Error('The drawing surface has no usable transform.');
  const x = (d * (clientX - e) - c * (clientY - f)) / determinant;
  const y = (a * (clientY - f) - b * (clientX - e)) / determinant;
  return { x: Math.max(0, Math.min(DRAW_WIDTH, x)), y: Math.max(0, Math.min(DRAW_HEIGHT, y)) };
}
