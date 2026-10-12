import { assertCapabilityGraph, type CapabilityGraph } from '../../core/capability/graph';
import type { DrawDocument } from '../../core/draw';

/** Restore only an actual approved version for this exact, unedited drawing. */
export function restoreKeptStamp(raw: CapabilityGraph, drawing: DrawDocument) {
  const graph = assertCapabilityGraph(raw);
  const version = graph.versions.find(item => item.versionId === graph.tool.currentVersionId);
  if (version?.kind !== 'draw_pattern' || graph.tool.ownerChildId !== drawing.ownerChildId) return null;
  const snapshot = graph.snapshots.find(item => item.snapshotId === version.markSnapshotId);
  if (snapshot?.sourceDocumentId !== drawing.documentId || snapshot.sourceRevision !== drawing.revision || snapshot.sourceDigest !== drawing.contentDigest) return null;
  const approval = graph.ledger.find(item => item.eventId === version.metadata.approvalEventId);
  if (approval?.type !== 'child_approval' || approval.approvedProposal.kind !== 'draw_pattern') return null;
  const candidate = graph.ledger.find(item => item.eventId === approval.candidateEventId);
  if (candidate?.type !== 'capability_candidate') return null;
  const intent = graph.ledger.find(item => item.eventId === candidate.sourceIntentEventId);
  if (intent?.type !== 'child_intent' || intent.reviewedContext?.kind !== 'draw_pattern') return null;
  return { name: graph.tool.displayName, controls: version.controls, session: { toolId: graph.tool.toolId, snapshotId: snapshot.snapshotId, candidateEventId: candidate.eventId, events: graph.ledger, proposal: approval.approvedProposal, childWords: intent.childWords, origin: candidate.origin, state:'saved' as const, reviewedContext:intent.reviewedContext } };
}
