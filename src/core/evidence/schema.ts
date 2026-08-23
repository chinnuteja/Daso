import { z } from 'zod';

import { EvidenceReferenceId, EventId, NonEmptyString, RuleId, ToolId, ToolVersionId, TrialId } from '../schema/primitives';
import { AuthorshipEventType } from '../schema/vocabulary';

export const TrialEvidence = z.strictObject({
  kind: z.literal('trial'),
  referenceId: TrialId,
  designName: NonEmptyString,
  obstruction: z.boolean(),
  validUnderCurrentVersion: z.boolean(),
});
export type TrialEvidence = z.infer<typeof TrialEvidence>;

export const CandidateEvidence = z.strictObject({
  kind: z.literal('candidate'),
  referenceId: EventId,
  type: AuthorshipEventType,
  approved: z.literal(true),
  originalInput: NonEmptyString,
  ruleId: RuleId.optional(),
});
export type CandidateEvidence = z.infer<typeof CandidateEvidence>;

export const VersionEvidence = z.strictObject({
  kind: z.literal('version'),
  referenceId: ToolVersionId,
  ruleIds: z.array(RuleId),
  isActive: z.boolean(),
});
export type VersionEvidence = z.infer<typeof VersionEvidence>;

export const EvidenceItem = z.discriminatedUnion('kind', [
  TrialEvidence,
  CandidateEvidence,
  VersionEvidence,
]);
export type EvidenceItem = z.infer<typeof EvidenceItem>;

export const EvidenceProjection = z.strictObject({
  toolId: ToolId,
  toolDisplayName: NonEmptyString,
  ownerDisplayName: NonEmptyString,
  items: z.array(EvidenceItem),
});
export type EvidenceProjection = z.infer<typeof EvidenceProjection>;

export const EvidenceSelection = z.strictObject({
  evidenceEventIds: z.array(EvidenceReferenceId).min(2).max(5),
});
export type EvidenceSelection = z.infer<typeof EvidenceSelection>;

export class EvidenceGroundingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceGroundingError';
  }
}
