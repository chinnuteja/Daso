import { describe, expect, it } from 'vitest';

import {
  appendStroke,
  clearMarkSelection,
  createDrawDocument,
  digestDrawSource,
  hitTestStroke,
  isMarkSelectionCurrent,
  isUsableGuidePath,
  removeLastStroke,
  samplePoint,
  setGuidePath,
  setMarkSelection,
  withDrawSourceDigest,
} from '../../../src/core/draw';

const NOW = '2026-09-27T12:00:00Z';

function document() {
  return createDrawDocument({
    documentId: 'draw_document_001',
    ownerChildId: 'child_local_01',
    now: NOW,
  });
}

const STROKE = {
  strokeId: 'stroke_scale_001',
  color: '#c45b3f',
  width: 6,
  points: [{ x: 12, y: 16 }, { x: 26, y: 30 }],
};

describe('DrawDocument source ownership', () => {
  it('keeps the source digest stable through repeated hashing and changes it only with source geometry', async () => {
    const empty = document();
    expect(await digestDrawSource(empty)).toBe(await digestDrawSource(empty));
    const changed = appendStroke(empty, STROKE, '2026-09-27T12:00:01Z');
    expect(await digestDrawSource(changed)).not.toBe(await digestDrawSource(empty));
    expect((await withDrawSourceDigest(changed)).contentDigest).toBe(await digestDrawSource(changed));
  });

  it('treats point sampling and undo as deterministic source operations', () => {
    expect(samplePoint([{ x: 1, y: 1 }], { x: 1.4, y: 1.4 })).toEqual([{ x: 1, y: 1 }]);
    expect(samplePoint([{ x: 1, y: 1 }], { x: 4, y: 1 })).toEqual([{ x: 1, y: 1 }, { x: 4, y: 1 }]);
    const changed = appendStroke(document(), STROKE, '2026-09-27T12:00:01Z');
    const undone = removeLastStroke(changed, '2026-09-27T12:00:02Z');
    expect(undone?.strokes).toEqual([]);
    expect(undone?.revision).toBe(3);
  });

  it('grounds selection in an existing source stroke and makes it stale after source geometry changes', async () => {
    const sourced = await withDrawSourceDigest(appendStroke(document(), STROKE, '2026-09-27T12:00:01Z'));
    const selected = setMarkSelection(sourced, ['stroke_scale_001'], '2026-09-27T12:00:02Z');
    expect(isMarkSelectionCurrent(selected)).toBe(true);
    const immediatelyEdited = appendStroke(selected, {
      ...STROKE,
      strokeId: 'stroke_scale_002',
      points: [{ x: 42, y: 42 }, { x: 57, y: 57 }],
    }, '2026-09-27T12:00:03Z');
    expect(isMarkSelectionCurrent(immediatelyEdited)).toBe(false);

    const editedSource = await withDrawSourceDigest(immediatelyEdited);
    expect(isMarkSelectionCurrent(editedSource)).toBe(false);
    expect(clearMarkSelection(editedSource, '2026-09-27T12:00:04Z').selection).toBeUndefined();
  });

  it('uses touch-tolerant hit testing and preserves guide direction as ordered points', async () => {
    const sourced = await withDrawSourceDigest(appendStroke(document(), STROKE, '2026-09-27T12:00:01Z'));
    expect(hitTestStroke(sourced.strokes, { x: 20, y: 24 }, 12)?.strokeId).toBe('stroke_scale_001');
    expect(hitTestStroke(sourced.strokes, { x: 400, y: 400 }, 12)).toBeNull();
    expect(isUsableGuidePath([{ x: 2, y: 2 }, { x: 4, y: 4 }])).toBe(false);
    const withPath = setGuidePath(sourced, {
      pathId: 'draw_path_tail_001',
      points: [{ x: 90, y: 100 }, { x: 250, y: 170 }],
    }, '2026-09-27T12:00:02Z');
    expect(withPath.guidePath?.points[0]).toEqual({ x: 90, y: 100 });
    expect(withPath.guidePath?.points[1]).toEqual({ x: 250, y: 170 });
  });
});
