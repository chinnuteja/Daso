import { z } from 'zod';

import { ChildId, IsoTimestamp, NonEmptyString, ToolId, ToolVersionId } from './primitives';
import { ToolKind } from './vocabulary';

/**
 * Optional one-generation reuse lineage. Absent on tools created through teaching.
 * Present only on a second-child-owned fork of an exact source snapshot.
 */
export const ForkLineage = z.strictObject({
  toolId: ToolId,
  versionId: ToolVersionId,
  ownerChildId: ChildId,
});
export type ForkLineage = z.infer<typeof ForkLineage>;

/** Specification section 9.2. The stable identity of a child-created tool. */
export const ToolDefinition = z.strictObject({
  toolId: ToolId,
  ownerChildId: ChildId,
  displayName: NonEmptyString,
  kind: ToolKind,
  currentVersionId: ToolVersionId,
  createdAt: IsoTimestamp,
  forkedFrom: ForkLineage.optional(),
});
export type ToolDefinition = z.infer<typeof ToolDefinition>;
