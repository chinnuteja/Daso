import { describe, expect, it } from 'vitest';

import {
  appendStroke,
  createDrawDocument,
  digestDrawSource,
  removeLastStroke,
  samplePoint,
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
});
