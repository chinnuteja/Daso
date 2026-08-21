import { z } from 'zod';

import {
  DistanceMetres,
  IsoTimestamp,
  NonEmptyString,
  ToolId,
  ToolVersionId,
  TrialId,
} from './primitives';

/**
 * Specification section 9.5.
 *
 * Two validity fields, not one: `validAtCapture` is what the child judged at the time, and
 * `validUnderCurrentVersion` is what the taught rules now say. Keeping both is what lets
 * section 6 scene 5 replay old observations under a new version without rewriting history.
 *
 * `note` is optional and carries section 6 scene 3's "optional note"; it is absent from the
 * section 9.5 example and therefore absent from that fixture, which parses unchanged.
 */
export const ExperimentTrial = z.strictObject({
  trialId: TrialId,
  toolId: ToolId,
  toolVersionIdAtCapture: ToolVersionId,
  designName: NonEmptyString,
  distanceM: DistanceMetres,
  obstruction: z.boolean(),
  validAtCapture: z.boolean(),
  validUnderCurrentVersion: z.boolean(),
  note: NonEmptyString.optional(),
  createdAt: IsoTimestamp,
});
export type ExperimentTrial = z.infer<typeof ExperimentTrial>;
