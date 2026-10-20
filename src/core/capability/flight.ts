import { TeachingRequestV2, digestCapabilityContext } from './context';
import { ModelIntent, FlightCapabilityVersion, CapabilityDefinition, type FlightTeachingContext, type FlightValidityProposal } from './types';
import { reviewedProposal, type ApprovedCapabilityCommit } from './approval';
import type { CapabilityLedgerEntry } from './ledger';
import type { ExperimentTrial } from '../schema/experimentTrial';
import { replay } from '../runtime';
import { ToolVersion } from '../schema/toolVersion';

export const FLIGHT_PROPOSAL: FlightValidityProposal = { type: 'propose_capability', kind: 'flight_validity', rule: 'exclude_obstructed_trial' };
export type FlightGroundingResult = { readonly ok: true; readonly proposal: FlightValidityProposal; readonly quote: string } | { readonly ok: false; readonly question: string };
export function groundFlightInterpretation(request: unknown, intent: unknown): FlightGroundingResult {
  const asked = TeachingRequestV2.safeParse(request);
  const proposed = ModelIntent.safeParse(intent);
  if (!asked.success || !proposed.success || asked.data.context.kind !== 'flight_validity') return { ok: false, question: 'Choose the observation this idea is about.' };
  if (proposed.data.type === 'clarify') return { ok: false, question: proposed.data.question };
  if (proposed.data.kind !== 'flight_validity' || !asked.data.context.selectedTrial.obstruction) return { ok: false, question: 'That observation has no recorded obstruction. Which throw hit something?' };
  const words = asked.data.childWords;
  const reason = /\b(hit (?:the |a |an )?(?:chair|wall|tree|table|obstacle)|obstruct(?:ed|ion)|blocked|collision|collided)\b/iu.exec(words);
  const excludes = /\b((?:should|does|do|must)(?:n['’]t| not)\s+(?:be\s+)?count(?:ed)?|exclude|ignore|leave out|not count|unfair)\b/iu.test(words);
  const uncertain = /\b(after|before|maybe|might|not sure|did(?:n['’]t| not) hit|never hit|no obstruction|without hitting|(?:was|is)(?:n['’]t| not) obstructed|not obstructed|(?:should|do|must)(?:n['’]t| not)\s+(?:be\s+)?(?:exclud(?:e|ed)|ignor(?:e|ed)|left out)|should (?:still )?count)\b/iu.test(words);
  if (reason === null || !excludes || uncertain) return { ok: false, question: uncertain ? 'We did not record when it hit something. Should throws with a recorded obstruction be left out?' : 'Are you saying throws that hit an obstacle should not count? Distance alone is not an obstruction.' };
  return { ok: true, proposal: proposed.data, quote: reason[0] };
}

export function flightContext(input: { readonly toolId: string; readonly activeVersionId: string | null; readonly ledgerSequence: number; readonly trial: ExperimentTrial; readonly counterexample: ExperimentTrial | null }): FlightTeachingContext {
  return { toolId: input.toolId, activeVersionId: input.activeVersionId, ledgerSequence: input.ledgerSequence, kind: 'flight_validity', selectedTrial: { trialId: input.trial.trialId, obstruction: input.trial.obstruction, setupChanged: input.trial.setupChanged ?? false, distanceM: input.trial.distanceM ?? 0 }, counterexampleTrialId: input.counterexample?.trialId ?? null };
}

/** Restricted adapter into the existing ranking runtime; the language cannot supply a predicate. */
export function replayFlightCapability(toolId: string, trials: readonly ExperimentTrial[], saved: FlightCapabilityVersion | null) {
  if (trials.some((trial) => trial.toolId !== toolId) || (saved !== null && saved.toolId !== toolId)) throw new Error('These observations belong to a different tool.');
  if (saved !== null) FlightCapabilityVersion.parse(saved);
  const executable = ToolVersion.parse({ toolId, versionId: saved?.versionId ?? 'tool_version_800', version: saved === null ? 1 : saved.version + 1, inputs: ['design_name', 'distance_m', 'obstruction'], metrics: ['median_distance', 'consistency'], rules: saved === null ? [] : [{ ruleId: 'exclude_obstructed_flight', when: { field: 'obstruction', equals: true }, effect: { set: 'trial.valid', value: false }, sourceEventId: saved.metadata.approvalEventId }], compiledAt: saved?.createdAt ?? '2026-10-01T00:00:00Z' });
  return replay(executable, trials);
}

export async function buildFlightApprovalBundle(input: { readonly context: FlightTeachingContext; readonly entries: readonly CapabilityLedgerEntry[]; readonly approval: CapabilityLedgerEntry; readonly ownerChildId: string; readonly displayName: string; readonly versionId: string; readonly version: number; readonly createdAt: string }): Promise<ApprovedCapabilityCommit> {
  if (input.approval.type !== 'child_approval' || input.approval.actor !== 'child') throw new Error('Only the child can save this rule.');
  const proposal = reviewedProposal(input.entries, input.approval.candidateEventId);
  if (proposal.kind !== 'flight_validity' || JSON.stringify(proposal) !== JSON.stringify(input.approval.approvedProposal)) throw new Error('The rule does not match the child’s review.');
  return {
    definition: CapabilityDefinition.parse({ toolId: input.context.toolId, ownerChildId: input.ownerChildId, displayName: input.displayName, kind: 'flight_validity', currentVersionId: input.versionId, createdAt: input.createdAt }),
    version: FlightCapabilityVersion.parse({ toolId: input.context.toolId, versionId: input.versionId, kind: 'flight_validity', version: input.version, rule: proposal.rule, metadata: { algorithmVersion: 1, contextDigest: await digestCapabilityContext(input.context), sourceEventIds: input.entries.filter((entry) => entry.type !== 'child_rejection').map((entry) => entry.eventId), approvalEventId: input.approval.eventId }, createdAt: input.createdAt }),
    approval: input.approval,
    reviewedContext: input.context,
  };
}
