import { describe, expect, it } from 'vitest';
import { createDrawDocument } from '../../../src/core/draw';
import { assertCanAddLine, exceedsDrawingBudget, MAX_WORKBENCH_POINTS } from '../../../src/ui/draw/drawingBudget';

describe('large valid artwork is preserved, not silently simplified', () => {
  it('accepts the desk limit and rejects the next line without changing any point', () => {
    const strokes = Array.from({ length: 32 }, (_, index) => ({ strokeId: `stroke_budget_${index}`, color: '#123456', width: 5, points: Array.from({ length: 2048 }, () => ({ x: 1, y: 1 })) }));
    const drawing = createDrawDocument({ documentId: 'draw_document_budget', ownerChildId: 'child_local_01', now: '2026-10-04T00:00:00Z', strokes });
    expect(drawing.strokes.reduce((sum, line) => sum + line.points.length, 0)).toBe(MAX_WORKBENCH_POINTS);
    const before = structuredClone(drawing);
    expect(exceedsDrawingBudget(drawing)).toBe(false);
    expect(() => assertCanAddLine(drawing, { ...strokes[0]!, points: [{ x: 2, y: 2 }] })).toThrow(/earlier lines are kept/);
    expect(drawing).toEqual(before);
    const maximum = createDrawDocument({ ...drawing, now: drawing.createdAt, strokes: Array.from({ length: 512 }, (_, index) => ({ ...strokes[0]!, strokeId: `stroke_max_${index}` })) });
    expect(exceedsDrawingBudget(maximum)).toBe(true);
    expect(maximum.strokes).toHaveLength(512);
  });
});
