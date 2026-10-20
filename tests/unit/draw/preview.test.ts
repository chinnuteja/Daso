import { describe, expect, it } from 'vitest';

import {
  appendStroke,
  buildDeterministicDrawPreview,
  createDrawDocument,
  setGuidePath,
  setMarkSelection,
  withDrawSourceDigest,
} from '../../../src/core/draw';

const NOW = '2026-09-27T12:00:00Z';
const SCALE = {
  strokeId: 'stroke_scale_001',
  color: '#c45b3f',
  width: 6,
  points: [{ x: 10, y: 10 }, { x: 20, y: 0 }, { x: 30, y: 10 }],
};

async function preparedDocument() {
  const blank = createDrawDocument({ documentId: 'draw_document_001', ownerChildId: 'child_local_01', now: NOW });
  const sourced = await withDrawSourceDigest(appendStroke(blank, SCALE, '2026-09-27T12:00:01Z'));
  const selected = setMarkSelection(sourced, ['stroke_scale_001'], '2026-09-27T12:00:02Z');
  return setGuidePath(selected, {
    pathId: 'draw_path_001',
    points: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
  }, '2026-09-27T12:00:03Z');
}

describe('deterministic Draw preview', () => {
  it('repeats only the child-selected source vector without changing the source document', async () => {
    const drawing = await preparedDocument();
    const before = structuredClone(drawing);
    const preview = buildDeterministicDrawPreview(drawing, { spacing: 80, startScale: 1, endScale: 0.5 });

    expect(preview.stampCount).toBe(3);
    expect(preview.strokes).toHaveLength(3);
    expect(preview.strokes.every((stroke) => stroke.sourceStrokeId === 'stroke_scale_001')).toBe(true);
    expect(drawing).toEqual(before);
  });

  it('is repeatable, directed, and makes the final repeat smaller', async () => {
    const drawing = await preparedDocument();
    const input = { spacing: 80, startScale: 1, endScale: 0.5, followPath: true };
    const first = buildDeterministicDrawPreview(drawing, input);
    const second = buildDeterministicDrawPreview(drawing, input);

    expect(first).toEqual(second);
    expect(first.strokes[0]!.points[0]!.x).toBeLessThan(first.strokes.at(-1)!.points[0]!.x);
    expect(first.strokes[0]!.width).toBeGreaterThan(first.strokes.at(-1)!.width);
  });

  it('rejects a missing, stale, or excessively dense teaching context', async () => {
    const drawing = await preparedDocument();
    expect(() => buildDeterministicDrawPreview({ ...drawing, guidePath: undefined })).toThrow(/show where/i);
    expect(() => buildDeterministicDrawPreview({ ...drawing, selection: undefined })).toThrow(/pick a current/i);
    const densePath = setGuidePath(drawing, {
      pathId: 'draw_path_dense_001',
      points: [{ x: 0, y: 0 }, { x: 4096, y: 0 }],
    }, '2026-09-27T12:00:04Z');
    expect(() => buildDeterministicDrawPreview(densePath, { spacing: 16 })).toThrow(/too many repeats/i);
  });
});
