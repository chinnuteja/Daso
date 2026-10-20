import { z } from 'zod';

import { IsoTimestamp, PositiveInt, ToolId, ToolVersionId } from './primitives';
import { CoachingPreference, InputField, MetricId, ToolRule } from './vocabulary';

/**
 * The part of a tool version that is *produced by folding approved authorship events*
 * (ruling R1). Nothing here is supplied by a caller, which is why provenance cannot be
 * decorative: a behaviour with no approved event has no way into this object.
 */
export const ToolVersionBody = z.strictObject({
  toolId: ToolId,
  version: PositiveInt,
  inputs: z.array(InputField),
  metrics: z.array(MetricId),
  rules: z.array(ToolRule),
  coachingPreference: CoachingPreference.optional(),
});
export type ToolVersionBody = z.infer<typeof ToolVersionBody>;

/**
 * Specification section 9.3. The body plus the two fields that can only come from injected
 * ports: the identifier from the IdFactory and the compilation instant from the Clock.
 */
export const ToolVersion = ToolVersionBody.extend({
  versionId: ToolVersionId,
  compiledAt: IsoTimestamp,
});
export type ToolVersion = z.infer<typeof ToolVersion>;
