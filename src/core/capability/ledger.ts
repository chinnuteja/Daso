import { z } from 'zod';

import { Actor } from '../schema/vocabulary';
import { EventId, IsoTimestamp, LedgerSequence, Sha256Digest, ToolId } from '../schema/primitives';
import { CapabilityProposal } from './types';

const EntryBase = z.strictObject({
  eventId: EventId,
  toolId: ToolId,
  sequence: LedgerSequence,
  occurredAt: IsoTimestamp,
});

/** V2 records preserve who proposed, edited, rejected, and approved a bounded capability. */
export const CapabilityChildIntentEntry = EntryBase.extend({
  type: z.literal('child_intent'),
  actor: z.literal(Actor.enum.child),
  childWords: z.string().trim().min(1).max(800),
  contextDigest: Sha256Digest,
});

export const CapabilityCandidateEntry = EntryBase.extend({
  type: z.literal('capability_candidate'),
  actor: z.literal(Actor.enum.ai),
  sourceIntentEventId: EventId,
  proposal: CapabilityProposal,
});

export const CapabilityChildEditEntry = EntryBase.extend({
  type: z.literal('child_edit'),
  actor: z.literal(Actor.enum.child),
  candidateEventId: EventId,
  proposal: CapabilityProposal,
});

export const CapabilityRejectionEntry = EntryBase.extend({
  type: z.literal('child_rejection'),
  actor: z.literal(Actor.enum.child),
  candidateEventId: EventId,
  reason: z.string().trim().min(1).max(400),
});

export const CapabilityApprovalEntry = EntryBase.extend({
  type: z.literal('child_approval'),
  actor: z.literal(Actor.enum.child),
  candidateEventId: EventId,
  approvedProposal: CapabilityProposal,
  /** Caller-supplied retry key; the repository turns a repeated save into the original result. */
  idempotencyKey: z.string().trim().min(1).max(160),
});

export const CapabilityLedgerEntry = z.discriminatedUnion('type', [
  CapabilityChildIntentEntry,
  CapabilityCandidateEntry,
  CapabilityChildEditEntry,
  CapabilityRejectionEntry,
  CapabilityApprovalEntry,
]);
export type CapabilityLedgerEntry = z.infer<typeof CapabilityLedgerEntry>;
