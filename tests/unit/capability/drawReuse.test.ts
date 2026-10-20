import { describe, expect, it } from 'vitest';

import { runSavedDrawCapability } from '../../../src/core/capability';
import type { DrawCapabilityVersion } from '../../../src/core/capability/types';
import type { MarkSnapshot } from '../../../src/core/draw/schema';

const snapshot: MarkSnapshot = {
  snapshotId: 'mark_snapshot_201',
  toolId: 'my-dragon-scales',
  sourceDocumentId: 'draw_document_201',
  sourceRevision: 4,
  sourceDigest: 'a'.repeat(64),
  createdAt: '2026-09-30T12:00:00Z',
  strokes: [{
    strokeId: 'stroke_scale_201', color: '#c45b3f', width: 6,
    points: [{ x: 20, y: 20 }, { x: 30, y: 10 }, { x: 40, y: 20 }],
  }],
};

const version: DrawCapabilityVersion = {
  toolId: 'my-dragon-scales',
  versionId: 'tool_version_201',
  kind: 'draw_pattern',
  version: 1,
  markSnapshotId: 'mark_snapshot_201',
  controls: { spacing: 64, startScale: 1, endScale: .5, followPath: true },
  metadata: {
    algorithmVersion: 1,
    contextDigest: 'b'.repeat(64),
    sourceEventIds: ['event_201'],
    approvalEventId: 'event_202',
  },
  createdAt: '2026-09-30T12:00:00Z',
};

describe('saved Draw capability runtime', () => {
  it('reuses the immutable child mark on a fresh path deterministically without changing the source', () => {
    const beforeSnapshot = structuredClone(snapshot);
    const beforeVersion = structuredClone(version);
    const input = { snapshot, version, pathId: 'draw_reuse_path_201', path: [{ x: 100, y: 100 }, { x: 420, y: 160 }] };

    const first = runSavedDrawCapability(input);
    const second = runSavedDrawCapability(input);

    expect(first).toEqual(second);
    expect(first.stampCount).toBeGreaterThan(1);
    expect(first.strokes.every((stroke) => stroke.sourceStrokeId === 'stroke_scale_201')).toBe(true);
    expect(snapshot).toEqual(beforeSnapshot);
    expect(version).toEqual(beforeVersion);
  });

  it('refuses a mismatched immutable source rather than applying a different tool', () => {
    expect(() => runSavedDrawCapability({
      snapshot: { ...snapshot, toolId: 'another-tool' },
      version,
      pathId: 'draw_reuse_path_202',
      path: [{ x: 100, y: 100 }, { x: 420, y: 160 }],
    })).toThrow(/different tool/i);
    expect(() => runSavedDrawCapability({
      snapshot,
      version: { ...version, markSnapshotId: 'mark_snapshot_other' },
      pathId: 'draw_reuse_path_203',
      path: [{ x: 100, y: 100 }, { x: 420, y: 160 }],
    })).toThrow(/does not match/i);
  });
});
