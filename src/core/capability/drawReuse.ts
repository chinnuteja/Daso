import { buildDrawPreviewFromSource, type DrawPoint, type DrawPreview } from '../draw';
import type { MarkSnapshot } from '../draw/schema';
import type { DrawCapabilityVersion } from './types';

/**
 * Applies an already-approved Draw capability to a new path. This is intentionally a local,
 * deterministic runtime: it accepts no language, agent, or model input.
 */
export function runSavedDrawCapability(input: {
  readonly snapshot: MarkSnapshot;
  readonly version: DrawCapabilityVersion;
  readonly pathId: string;
  readonly path: readonly DrawPoint[];
}): DrawPreview {
  if (input.snapshot.toolId !== input.version.toolId) {
    throw new Error('This saved mark belongs to a different tool. It was not applied.');
  }
  if (input.snapshot.snapshotId !== input.version.markSnapshotId) {
    throw new Error('This saved version does not match its original mark. It was not applied.');
  }
  return buildDrawPreviewFromSource({
    sourceDigest: input.snapshot.sourceDigest,
    sourceStrokes: input.snapshot.strokes,
    guidePath: { pathId: input.pathId, points: input.path },
    controls: input.version.controls,
  });
}
