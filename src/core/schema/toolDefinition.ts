import { z } from 'zod';

import { ChildId, IsoTimestamp, NonEmptyString, ToolId, ToolVersionId } from './primitives';
import { ToolKind } from './vocabulary';

/** Specification section 9.2. The stable identity of a child-created tool. */
export const ToolDefinition = z.strictObject({
  toolId: ToolId,
  ownerChildId: ChildId,
  displayName: NonEmptyString,
  kind: ToolKind,
  currentVersionId: ToolVersionId,
  createdAt: IsoTimestamp,
});
export type ToolDefinition = z.infer<typeof ToolDefinition>;
