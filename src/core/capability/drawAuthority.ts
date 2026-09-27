import { z } from 'zod';

import { isMarkSelectionCurrent } from '../draw/document';
import type { DrawDocument, MarkSnapshot } from '../draw/schema';
import { MarkSnapshot as MarkSnapshotSchema } from '../draw/schema';
import { CapabilityLedgerEntry } from './ledger';
import {
  CapabilityDefinition,
  DrawCapabilityControls,
  DrawCapabilityVersion,
  type CapabilityProposal,
} from './types';
import { digestCapabilityContext } from './context';

export class DrawAuthorityError extends Error {}

export function createDrawMarkSnapshot(input: {
  readonly drawing: DrawDocument;
  readonly toolId: string;
  readonly snapshotId: string;
  readonly createdAt: string;
}): MarkSnapshot {
  if (!isMarkSelectionCurrent(input.drawing)) {
    throw new DrawAuthorityError('Pick a current mark before saving it as a tool.');
  }
  const chosen = new Set(input.drawing.selection?.strokeIds ?? []);
  const strokes = input.drawing.strokes.filter((stroke) => chosen.has(stroke.strokeId));
  if (strokes.length === 0) throw new DrawAuthorityError('The selected mark is no longer in this drawing. Pick it again.');
  return MarkSnapshotSchema.parse({
    snapshotId: input.snapshotId,
    toolId: input.toolId,
    sourceDocumentId: input.drawing.documentId,
    sourceRevision: input.drawing.revision,
    strokes,
    sourceDigest: input.drawing.contentDigest,
    createdAt: input.createdAt,
  });
}

function latestChildEdit(
  entries: readonly z.infer<typeof CapabilityLedgerEntry>[],
  candidateEventId: string,
): CapabilityProposal | null {
  const edit = [...entries].reverse().find((entry): entry is Extract<z.infer<typeof CapabilityLedgerEntry>, { type: 'child_edit' }> =>
    entry.type === 'child_edit' && entry.candidateEventId === candidateEventId,
  );
  return edit?.proposal ?? null;
}

/** A rejection is final for this candidate. The child starts a fresh candidate to continue. */
export function assertCandidateCanBeApproved(
  entries: readonly z.infer<typeof CapabilityLedgerEntry>[],
  candidateEventId: string,
): Extract<CapabilityProposal, { kind: 'draw_pattern' }> {
  const candidate = entries.find((entry): entry is Extract<z.infer<typeof CapabilityLedgerEntry>, { type: 'capability_candidate' }> => entry.type === 'capability_candidate' && entry.eventId === candidateEventId);
  if (candidate === undefined) throw new DrawAuthorityError('That suggestion no longer exists. Make a new preview first.');
  if (entries.some((entry) => entry.type === 'child_rejection' && entry.candidateEventId === candidateEventId)) {
    throw new DrawAuthorityError('You rejected this suggestion. Start a new one if you want to save a different idea.');
  }
  const proposal = latestChildEdit(entries, candidateEventId) ?? candidate.proposal;
  if (proposal.kind !== 'draw_pattern') throw new DrawAuthorityError('This is not a Draw suggestion.');
  return proposal;
}

export async function buildDrawApprovalBundle(input: {
  readonly drawing: DrawDocument;
  readonly toolId: string;
  readonly ownerChildId: string;
  readonly displayName: string;
  readonly existingVersionCount: number;
  readonly snapshotId: string;
  readonly versionId: string;
  readonly approvalEvent: z.infer<typeof CapabilityLedgerEntry>;
  readonly entries: readonly z.infer<typeof CapabilityLedgerEntry>[];
  readonly createdAt: string;
}): Promise<{
  readonly definition: z.infer<typeof CapabilityDefinition>;
  readonly version: z.infer<typeof DrawCapabilityVersion>;
  readonly snapshot: MarkSnapshot;
}> {
  if (input.approvalEvent.type !== 'child_approval' || input.approvalEvent.actor !== 'child') {
    throw new DrawAuthorityError('Only the child can save this tool.');
  }
  const proposal = assertCandidateCanBeApproved(input.entries, input.approvalEvent.candidateEventId);
  if (JSON.stringify(proposal) !== JSON.stringify(input.approvalEvent.approvedProposal)) {
    throw new DrawAuthorityError('The saved choice does not match the reviewed suggestion. Preview it again.');
  }
  if (input.drawing.guidePath === undefined) throw new DrawAuthorityError('Show the path again before saving this tool.');
  const snapshot = createDrawMarkSnapshot({
    drawing: input.drawing,
    toolId: input.toolId,
    snapshotId: input.snapshotId,
    createdAt: input.createdAt,
  });
  const controls = DrawCapabilityControls.parse({
    spacing: proposal.spacing === 'close' ? 36 : proposal.spacing === 'wide' ? 92 : 56,
    startScale: 1,
    endScale: proposal.sizeProfile === 'smaller_toward_end' ? 0.45 : 1,
    followPath: true,
  });
  const contextDigest = await digestCapabilityContext({
    toolId: input.toolId,
    activeVersionId: null,
    ledgerSequence: input.approvalEvent.sequence,
    kind: 'draw_pattern',
    sourceDocumentId: input.drawing.documentId,
    sourceRevision: input.drawing.revision,
    selectedMarkSnapshotId: snapshot.snapshotId,
    guidePathId: input.drawing.guidePath.pathId,
    guidePathRevision: input.drawing.guidePath.revision,
  });
  const sourceEventIds = input.entries
    .filter((entry) => entry.type !== 'child_rejection')
    .map((entry) => entry.eventId);
  return {
    definition: CapabilityDefinition.parse({
      toolId: input.toolId,
      ownerChildId: input.ownerChildId,
      displayName: input.displayName,
      kind: 'draw_pattern',
      currentVersionId: input.versionId,
      createdAt: input.createdAt,
    }),
    version: DrawCapabilityVersion.parse({
      toolId: input.toolId,
      versionId: input.versionId,
      kind: 'draw_pattern',
      version: input.existingVersionCount + 1,
      markSnapshotId: snapshot.snapshotId,
      controls,
      metadata: {
        algorithmVersion: 1,
        contextDigest,
        sourceEventIds,
        approvalEventId: input.approvalEvent.eventId,
      },
      createdAt: input.createdAt,
    }),
    snapshot,
  };
}
