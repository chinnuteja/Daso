import { z } from 'zod';

import { CandidateMutation } from '../schema/mutation';
import {
  EventId,
  IsoTimestamp,
  LedgerSequence,
  NonEmptyString,
  ToolId,
} from '../schema/primitives';
import { Actor, AuthorshipEventType } from '../schema/vocabulary';

/**
 * The append-only authorship ledger has exactly two entry kinds.
 *
 * Ruling R2 / deviation D-01: approval is its own entry, not a field on the thing being
 * approved. An actor that can write its own approval flag can approve its own mutation, and a
 * boolean on an append-only record cannot be flipped later anyway. So a proposal and its
 * approval are two separate facts, and `childApproved` exists only in the section 9.4 read
 * model, computed by the fold.
 *
 * Note what is absent from both shapes below: there is no `childApproved` field to write.
 */

/** A proposed change to a tool definition, from the child or from the Teaching Agent. */
export const CandidateEntry = z.strictObject({
  entryKind: z.literal('candidate'),
  eventId: EventId,
  sequence: LedgerSequence,
  toolId: ToolId,
  actor: Actor,
  type: AuthorshipEventType,
  /** What the child actually said, kept verbatim so the translation stays auditable. */
  originalInput: NonEmptyString,
  candidateMutation: CandidateMutation,
  createdAt: IsoTimestamp,
});
export type CandidateEntry = z.infer<typeof CandidateEntry>;

/**
 * An approval of a specific candidate. Only an entry whose actor is `child` admits a
 * candidate into a compiled version; an `ai` approval entry is representable precisely so
 * that a test can prove the fold ignores it.
 */
export const ApprovalEntry = z.strictObject({
  entryKind: z.literal('approval'),
  eventId: EventId,
  sequence: LedgerSequence,
  toolId: ToolId,
  actor: Actor,
  approves: EventId,
  createdAt: IsoTimestamp,
});
export type ApprovalEntry = z.infer<typeof ApprovalEntry>;

export const LedgerEntry = z.discriminatedUnion('entryKind', [CandidateEntry, ApprovalEntry]);
export type LedgerEntry = z.infer<typeof LedgerEntry>;

export const Ledger = z.array(LedgerEntry);
export type Ledger = z.infer<typeof Ledger>;

/** Total order over a ledger: by sequence, and by event id when sequences tie. */
export function compareEntries(left: LedgerEntry, right: LedgerEntry): number {
  if (left.sequence !== right.sequence) {
    return left.sequence < right.sequence ? -1 : 1;
  }
  if (left.eventId === right.eventId) {
    return 0;
  }
  return left.eventId < right.eventId ? -1 : 1;
}
