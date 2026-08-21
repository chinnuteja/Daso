import { z } from 'zod';

import {
  ChildId,
  EvidenceReferenceId,
  IsoTimestamp,
  NonEmptyString,
  SummaryId,
  ToolId,
} from './primitives';

/**
 * Specification section 9.7. At least one evidence reference is required by the schema, so a
 * summary with no grounding cannot even be constructed. Phase 7 adds the stronger check that
 * every claim maps to an event that actually exists.
 */
export const ParentSummary = z.strictObject({
  summaryId: SummaryId,
  childId: ChildId,
  toolId: ToolId,
  text: NonEmptyString,
  evidenceEventIds: z.array(EvidenceReferenceId).min(1),
  createdAt: IsoTimestamp,
});
export type ParentSummary = z.infer<typeof ParentSummary>;
