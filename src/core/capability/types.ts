import { z } from 'zod';

import {
  DrawDocumentId,
  DrawPathId,
  EventId,
  MarkSnapshotId,
  Sha256Digest,
  ToolId,
  ToolVersionId,
  TrialId,
} from '../schema/primitives';

/** Exactly the two vertical slices share this primitive. Widening it is a product decision. */
export const CapabilityKind = z.enum(['draw_pattern', 'flight_validity']);
export type CapabilityKind = z.infer<typeof CapabilityKind>;

const ContextBase = z.strictObject({
  toolId: ToolId,
  activeVersionId: ToolVersionId.nullable(),
  /** Zero is valid before a new capability has its first ledger event. */
  ledgerSequence: z.number().int().min(0),
});

export const DrawTeachingContext = ContextBase.extend({
  kind: z.literal('draw_pattern'),
  sourceDocumentId: DrawDocumentId,
  sourceRevision: z.number().int().positive(),
  selectedMarkSnapshotId: MarkSnapshotId,
  guidePathId: DrawPathId,
  guidePathRevision: z.number().int().positive(),
});
export type DrawTeachingContext = z.infer<typeof DrawTeachingContext>;

export const FlightTeachingContext = ContextBase.extend({
  kind: z.literal('flight_validity'),
  selectedTrial: z.strictObject({
    trialId: TrialId,
    obstruction: z.boolean(),
    setupChanged: z.boolean(),
    distanceM: z.number().min(0),
  }),
  /** A contrasting trial makes a proposed rule inspectable instead of hand-wavy. */
  counterexampleTrialId: TrialId.nullable(),
});
export type FlightTeachingContext = z.infer<typeof FlightTeachingContext>;

export const CapabilityTeachingContext = z.discriminatedUnion('kind', [
  DrawTeachingContext,
  FlightTeachingContext,
]);
export type CapabilityTeachingContext = z.infer<typeof CapabilityTeachingContext>;

export const DrawPatternProposal = z.strictObject({
  type: z.literal('propose_capability'),
  kind: z.literal('draw_pattern'),
  operation: z.literal('repeat_selected_mark'),
  spacing: z.enum(['even', 'close', 'wide']),
  sizeProfile: z.enum(['constant', 'smaller_toward_end']),
});
export type DrawPatternProposal = z.infer<typeof DrawPatternProposal>;

export const FlightValidityProposal = z.strictObject({
  type: z.literal('propose_capability'),
  kind: z.literal('flight_validity'),
  rule: z.literal('exclude_obstructed_trial'),
});
export type FlightValidityProposal = z.infer<typeof FlightValidityProposal>;

export const CapabilityProposal = z.discriminatedUnion('kind', [
  DrawPatternProposal,
  FlightValidityProposal,
]);
export type CapabilityProposal = z.infer<typeof CapabilityProposal>;

/** The model may ask one bounded question; it can never signal approval or persistence. */
export const ClarifyIntent = z.strictObject({
  type: z.literal('clarify'),
  unresolved: z.enum(['selected_mark', 'guide_path', 'spacing', 'size_profile', 'reason']),
  question: z.string().trim().min(1).max(240),
});
export type ClarifyIntent = z.infer<typeof ClarifyIntent>;

export const ModelIntent = z.union([CapabilityProposal, ClarifyIntent]);
export type ModelIntent = z.infer<typeof ModelIntent>;

export const CapabilityVersionMetadata = z.strictObject({
  algorithmVersion: z.literal(1),
  contextDigest: Sha256Digest,
  sourceEventIds: z.array(EventId).min(1),
  approvalEventId: EventId,
});
export type CapabilityVersionMetadata = z.infer<typeof CapabilityVersionMetadata>;
