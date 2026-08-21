import { z } from 'zod';

import { NonEmptyString, ToolVersionId, TrialId } from '../schema/primitives';

/**
 * Frozen runtime result for P6/P7. A projection over a specific version and trials:
 * nothing here is persisted, and nothing here is a stored observation.
 */
export const TrialProjection = z.strictObject({
  trialId: TrialId,
  validUnderCurrentVersion: z.boolean(),
});
export type TrialProjection = z.infer<typeof TrialProjection>;

export const DesignMetrics = z.strictObject({
  designName: NonEmptyString,
  validTrialCount: z.number().int().nonnegative(),
  medianDistanceMm: z.number(),
  consistencyMm: z.number(),
});
export type DesignMetrics = z.infer<typeof DesignMetrics>;

export const RankingEntry = z.strictObject({
  rank: z.number().int().positive(),
  designName: NonEmptyString,
  medianDistanceMm: z.number(),
  consistencyMm: z.number(),
});
export type RankingEntry = z.infer<typeof RankingEntry>;

export const RuntimeResult = z.strictObject({
  versionId: ToolVersionId,
  projections: z.array(TrialProjection),
  metrics: z.array(DesignMetrics),
  ranking: z.array(RankingEntry),
  winner: NonEmptyString.optional(),
  insufficient: z.array(NonEmptyString),
});
export type RuntimeResult = z.infer<typeof RuntimeResult>;
