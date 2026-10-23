import { z } from 'zod';

import {
  ChildId,
  DrawDocumentId,
  DrawPathId,
  IsoTimestamp,
  MarkSnapshotId,
  PositiveInt,
  Sha256Digest,
  StrokeId,
  ToolId,
  ToolVersionId,
} from '../schema/primitives';

/**
 * Draw deliberately stores authored vectors, not a bitmap for a model to reinterpret.
 * The child-selected stroke(s) are therefore the canonical source for every later pattern.
 */
export const DrawPoint = z.strictObject({
  x: z.number().finite().min(0).max(4096),
  y: z.number().finite().min(0).max(4096),
});
export type DrawPoint = z.infer<typeof DrawPoint>;

export const DrawStroke = z.strictObject({
  strokeId: StrokeId,
  color: z.string().regex(/^#[0-9a-f]{6}$/iu, 'must be a six-digit hex colour'),
  width: z.number().finite().positive().max(128),
  points: z.array(DrawPoint).min(1).max(2048),
});
export type DrawStroke = z.infer<typeof DrawStroke>;

/** A direct child selection; it references their existing source strokes without copying them. */
export const DrawMarkSelection = z.strictObject({
  strokeIds: z.array(StrokeId).min(1).max(32),
  sourceDigest: Sha256Digest,
  selectedAt: IsoTimestamp,
});
export type DrawMarkSelection = z.infer<typeof DrawMarkSelection>;

/** The ordered points make direction explicit: first point is “starts here”, last is “ends here”. */
export const DrawGuidePath = z.strictObject({
  pathId: DrawPathId,
  revision: PositiveInt,
  points: z.array(DrawPoint).min(2).max(2048),
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
});
export type DrawGuidePath = z.infer<typeof DrawGuidePath>;

/** References to approved tools, never flattened into the child's original strokes. */
export const DrawToolApplication = z.strictObject({
  applicationId: z.string().regex(/^draw_application_[a-z0-9_]+$/u),
  toolId: ToolId,
  versionId: ToolVersionId,
  path: z.array(DrawPoint).min(2).max(2048),
  createdAt: IsoTimestamp,
});
export type DrawToolApplication = z.infer<typeof DrawToolApplication>;

export const DrawDocument = z.strictObject({
  documentId: DrawDocumentId,
  ownerChildId: ChildId,
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
  revision: PositiveInt,
  strokes: z.array(DrawStroke).max(512),
  applications: z.array(DrawToolApplication).max(24).refine(items => new Set(items.map(item => item.applicationId)).size === items.length, 'application ids must be unique').optional(),
  /** Hash of canonical source geometry only; derived previews never participate. */
  contentDigest: Sha256Digest,
  /** Workbench-only teaching references. Absent fields keep Phase 2 records readable. */
  selection: DrawMarkSelection.optional(),
  guidePath: DrawGuidePath.optional(),
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
});
export type DrawDocument = z.infer<typeof DrawDocument>;

/**
 * An immutable copy of exactly the mark selected by the child. Saving the snapshot makes
 * subsequent document edits unable to silently change an already-approved capability.
 */
export const MarkSnapshot = z.strictObject({
  snapshotId: MarkSnapshotId,
  toolId: ToolId,
  sourceDocumentId: DrawDocumentId,
  sourceRevision: PositiveInt,
  strokes: z.array(DrawStroke).min(1).max(32),
  sourceDigest: Sha256Digest,
  createdAt: IsoTimestamp,
});
export type MarkSnapshot = z.infer<typeof MarkSnapshot>;
