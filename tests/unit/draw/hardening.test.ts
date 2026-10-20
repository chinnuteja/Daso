import { describe, expect, it } from 'vitest';
import { buildDrawPreviewFromSource, MAX_PREVIEW_POINTS, MAX_PREVIEW_STAMPS } from '../../../src/core/draw/preview';
import { ModelIntent } from '../../../src/core/capability';
import type { DrawPoint } from '../../../src/core/draw';

const stroke = { strokeId: 'stroke_fuzz', color: '#123456', width: 6, points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] };
const input = { sourceDigest: 'source', sourceStrokes: [stroke], guidePath: { pathId: 'draw_path_fuzz', points: [{ x: 100, y: 100 }, { x: 350, y: 250 }] } };
describe('Phase 11 geometry and interpretation limits', () => {
  it('rejects non-finite, out-of-bounds, empty, and oversized inputs before geometry allocation', () => {
    for (const x of [NaN, Infinity, -Infinity, -1, 4097]) {
      expect(() => buildDrawPreviewFromSource({ ...input, guidePath: { ...input.guidePath, points: [{ x, y: 0 }, { x: 20, y: 20 }] } })).toThrow(/damaged/);
      expect(() => buildDrawPreviewFromSource({ ...input, sourceStrokes: [{ ...stroke, points: [{ x, y: 1 }] }] })).toThrow(/damaged/);
    }
    expect(() => buildDrawPreviewFromSource({ ...input, sourceStrokes: Array.from({ length: 33 }, () => stroke) })).toThrow(/oversized/);
    expect(() => buildDrawPreviewFromSource({ ...input, sourceStrokes: [{ ...stroke, points: [] }] })).toThrow(/damaged/);
    expect(() => buildDrawPreviewFromSource({ ...input, guidePath: { ...input.guidePath, points: Array.from({ length: 2049 }, () => ({ x: 20, y: 20 })) } })).toThrow(/oversized/);
  });
  it('200 seeded valid geometries are deterministic, finite, bounded, and never modify the source', () => {
    let seed = 112358; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let index = 0; index < 200; index++) {
      const source = { ...input, sourceStrokes: [{ ...stroke, points: Array.from({ length: 5 }, () => ({ x: random() * 300, y: random() * 200 })) }], guidePath: { pathId: 'draw_path_fuzz', points: [{ x: 50, y: 50 }, { x: 100 + random() * 600, y: 100 + random() * 400 }] }, controls: { spacing: 16 + random() * 220, startScale: .2 + random() * 2, endScale: .2 + random() * 2, followPath: random() > .5 } };
      const before = structuredClone(source), result = buildDrawPreviewFromSource(source);
      expect(buildDrawPreviewFromSource(source)).toEqual(result); expect(source).toEqual(before);
      expect(result.stampCount).toBeLessThanOrEqual(MAX_PREVIEW_STAMPS);
      const points: DrawPoint[] = result.strokes.flatMap((line) => line.points);
      expect(points.length).toBeLessThanOrEqual(MAX_PREVIEW_POINTS);
      expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    }
  });
  it('maximum detailed mark either stays within the budget or gives a recoverable error', () => {
    const detailed = { ...stroke, points: Array.from({ length: 2048 }, (_, index) => ({ x: index / 10, y: index / 20 })) };
    const source = { ...input, sourceStrokes: [detailed] };
    expect(buildDrawPreviewFromSource({ ...source, controls: { spacing: 160 } }).strokes.length).toBeGreaterThan(0);
    expect(() => buildDrawPreviewFromSource({ ...source, controls: { spacing: 16 } })).toThrow(/too detailed/);
  });
  it('schema-valid-looking model authority and unsupported kinds are always rejected', () => {
    const proposal = { type: 'propose_capability', kind: 'draw_pattern', operation: 'repeat_selected_mark', spacing: 'even', sizeProfile: 'constant' };
    for (const extra of [{ approved: true }, { actor: 'child' }, { code: 'fetch()' }, { sourceMark: stroke }, { type: 'child_approval' }, { operation: 'redraw_dragon' }, { kind: 'arbitrary_program' }]) expect(ModelIntent.safeParse({ ...proposal, ...extra }).success).toBe(false);
  });
});
