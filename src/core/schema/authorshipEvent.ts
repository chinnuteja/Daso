import { z } from 'zod';

import { DocumentedMutation } from './mutation';
import { EventId, IsoTimestamp, NonEmptyString, ToolId } from './primitives';
import { Actor, AuthorshipEventType } from './vocabulary';

/**
 * Specification section 9.4, as a READ MODEL.
 *
 * `childApproved` appears here because the specification documents it and exported records
 * must match that shape. It is derived, never written: the ledger stores a candidate entry
 * and a separate child approval entry (ruling R2 / deviation D-01), and
 * `foldAuthorshipRecords` computes this boolean by looking for the matching approval entry.
 * No write path in the system accepts this field.
 */
export const AuthorshipEvent = z.strictObject({
  eventId: EventId,
  toolId: ToolId,
  actor: Actor,
  type: AuthorshipEventType,
  originalInput: NonEmptyString,
  candidateMutation: DocumentedMutation,
  childApproved: z.boolean(),
  createdAt: IsoTimestamp,
});
export type AuthorshipEvent = z.infer<typeof AuthorshipEvent>;
