import type { DrawDocument, MarkSnapshot } from '../draw/schema';
import type { ExperimentTrial } from '../schema/experimentTrial';
import { digestCapabilityContext } from './context';
import { CapabilityLedgerEntry } from './ledger';
import { CapabilityDefinition, DrawCapabilityVersion, FlightCapabilityVersion, type CapabilityProposal, type CapabilityTeachingContext, type SavedCapabilityVersion } from './types';

/** Internal compatibility input for the pre-v2 Draw entry point. */
export type ApprovalStorageInput = Readonly<{
  definition: CapabilityDefinition;
  approval: CapabilityLedgerEntry;
  reviewedContext?: CapabilityTeachingContext;
}> & (
  | Readonly<{ version: DrawCapabilityVersion; snapshot: MarkSnapshot }>
  | Readonly<{ version: FlightCapabilityVersion; snapshot?: never }>
);

/** Every new shared-engine approval must bind the reviewed source and active version. */
export type ApprovedCapabilityCommit = ApprovalStorageInput & Readonly<{ reviewedContext: CapabilityTeachingContext }>;

/** One authority fold for both artwork and reasoning. */
export function reviewedProposal(entries: readonly CapabilityLedgerEntry[], candidateEventId: string): CapabilityProposal {
  const candidate = entries.find((entry) => entry.type === 'capability_candidate' && entry.eventId === candidateEventId);
  if (candidate?.type !== 'capability_candidate') throw new Error('This review no longer exists. Start a fresh review.');
  if (entries.some((entry) => entry.type === 'child_rejection' && entry.candidateEventId === candidateEventId)) throw new Error('You rejected this idea. Start a fresh review.');
  const edit = [...entries].reverse().find((entry) => entry.type === 'child_edit' && entry.candidateEventId === candidateEventId);
  return edit?.type === 'child_edit' ? edit.proposal : candidate.proposal;
}

export async function reviewedContextDigest(input: ApprovalStorageInput): Promise<string | undefined> {
  return input.reviewedContext === undefined ? undefined : digestCapabilityContext(input.reviewedContext);
}

/** Runs inside each adapter's atomic storage boundary after rereading the current records. */
export function assertApprovalCommit(input: ApprovalStorageInput, state: {
  readonly entries: readonly CapabilityLedgerEntry[];
  readonly activeDefinition: CapabilityDefinition | null;
  readonly drawing?: DrawDocument | null;
  readonly trials?: readonly ExperimentTrial[];
  readonly contextDigest?: string;
}): void {
  const approval = CapabilityLedgerEntry.parse(input.approval);
  const definition = CapabilityDefinition.parse(input.definition);
  const version: SavedCapabilityVersion = input.version.kind === 'draw_pattern' ? DrawCapabilityVersion.parse(input.version) : FlightCapabilityVersion.parse(input.version);
  if (approval.type !== 'child_approval') throw new Error('Only the child can save this tool.');
  if (definition.toolId !== approval.toolId || definition.toolId !== version.toolId || definition.kind !== version.kind || definition.currentVersionId !== version.versionId) throw new Error('These approval records do not describe the same tool.');
  const entries = [...state.entries].sort((a, b) => a.sequence - b.sequence);
  if (entries.some((entry, index) => entry.sequence !== index + 1) || new Set(entries.map((entry) => entry.eventId)).size !== entries.length || entries.some((entry) => entry.eventId === approval.eventId) || approval.sequence !== entries.length + 1) throw new Error('This review changed. Open a fresh preview before saving.');
  const proposal = reviewedProposal(entries, approval.candidateEventId);
  if (proposal.kind !== version.kind || JSON.stringify(proposal) !== JSON.stringify(approval.approvedProposal)) throw new Error('The saved choice does not match your latest review.');
  const candidate = entries.find((entry) => entry.eventId === approval.candidateEventId);
  const intent = candidate?.type === 'capability_candidate' ? entries.find((entry) => entry.eventId === candidate.sourceIntentEventId) : undefined;
  if (intent?.type !== 'child_intent' || intent.sequence >= (candidate?.sequence ?? 0)) throw new Error('The child’s words are missing from this review.');
  if (version.metadata.approvalEventId !== approval.eventId || JSON.stringify(version.metadata.sourceEventIds) !== JSON.stringify(entries.filter((entry) => entry.type !== 'child_rejection').map((entry) => entry.eventId))) throw new Error('This version has incorrect authorship references.');
  if (state.activeDefinition === null && version.version !== 1) throw new Error('A new tool must start at version 1.');
  if (state.activeDefinition !== null && (state.activeDefinition.ownerChildId !== definition.ownerChildId || state.activeDefinition.kind !== definition.kind)) throw new Error('The owner or kind of a saved tool cannot change.');
  if (entries.some((entry) => entry.type === 'child_approval' && entry.candidateEventId === approval.candidateEventId)) throw new Error('This idea was already saved. Start a fresh review.');
  if (version.kind === 'draw_pattern' && proposal.kind === 'draw_pattern') {
    if (input.snapshot === undefined || input.snapshot.toolId !== version.toolId || input.snapshot.snapshotId !== version.markSnapshotId) throw new Error('This version does not match its original mark.');
    const expected = { spacing: proposal.spacing === 'close' ? 36 : proposal.spacing === 'wide' ? 92 : 56, startScale: 1, endScale: proposal.sizeProfile === 'constant' ? 1 : .45, followPath: true };
    if (JSON.stringify(version.controls) !== JSON.stringify(expected)) throw new Error('Saved controls do not match the approved settings.');
  }
  const context = input.reviewedContext;
  if (context === undefined) {
    if (version.kind === 'flight_validity') throw new Error('Flight approval needs a reviewed observation context.');
    return; // Compatibility for existing P5 Draw bundles; new UI always binds context.
  }
  if (context.toolId !== definition.toolId || context.kind !== version.kind || intent.sequence !== context.ledgerSequence + 1 || context.activeVersionId !== (state.activeDefinition?.currentVersionId ?? null) || state.contextDigest !== intent.contextDigest || version.metadata.contextDigest !== state.contextDigest) throw new Error('Your source or saved version changed. Review it again.');
  if (context.kind === 'draw_pattern') {
    if (input.snapshot?.snapshotId !== context.selectedMarkSnapshotId) throw new Error('This is not the mark you reviewed. Pick the mark and review again.');
    const drawing = state.drawing;
    if (drawing == null || drawing.ownerChildId !== definition.ownerChildId || drawing.revision !== context.sourceRevision || drawing.guidePath?.pathId !== context.guidePathId || drawing.guidePath.revision !== context.guidePathRevision || drawing.selection?.sourceDigest !== drawing.contentDigest || input.snapshot === undefined || input.snapshot.sourceDigest !== drawing.contentDigest || input.snapshot.sourceDocumentId !== drawing.documentId || JSON.stringify(input.snapshot.strokes) !== JSON.stringify(drawing.strokes.filter((stroke) => drawing.selection?.strokeIds.includes(stroke.strokeId)))) throw new Error('Your drawing or path changed. Pick the mark and review again.');
  } else {
    const trial = state.trials?.find((item) => item.trialId === context.selectedTrial.trialId);
    const counterexample = state.trials?.find((item) => item.trialId === context.counterexampleTrialId);
    if (trial === undefined || trial.toolId !== definition.toolId || !trial.obstruction || trial.obstruction !== context.selectedTrial.obstruction || (trial.setupChanged ?? false) !== context.selectedTrial.setupChanged || trial.distanceM !== context.selectedTrial.distanceM || counterexample === undefined || counterexample.toolId !== definition.toolId || counterexample.obstruction || counterexample.distanceM !== trial.distanceM) throw new Error('The selected observation or counterexample changed. Review the current records again.');
  }
}
