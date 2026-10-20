import { z } from 'zod';
import { CapabilityDefinition, SavedCapabilityVersion } from './types';
import { CapabilityLedgerEntry } from './ledger';
import { reviewedProposal } from './approval';
import { DrawDocument, MarkSnapshot } from '../draw/schema';
import { ChildProfile } from '../schema/childProfile';
import { ExperimentTrial } from '../schema/experimentTrial';
import { ParentSummary } from '../schema/parentSummary';
import { PermissionGrant } from '../schema/permissionGrant';
import { canonicalJson } from '../serialization/canonicalJson';

/** A tool-scoped read snapshot, not another persistence family. */
export const CapabilityGraph = z.strictObject({
  tool: CapabilityDefinition,
  ownerProfile: ChildProfile.nullable(),
  versions: z.array(SavedCapabilityVersion),
  ledger: z.array(CapabilityLedgerEntry),
  documents: z.array(DrawDocument),
  snapshots: z.array(MarkSnapshot),
  trials: z.array(ExperimentTrial),
  grants: z.array(PermissionGrant),
  summaries: z.array(ParentSummary),
});
export type CapabilityGraph = z.infer<typeof CapabilityGraph>;

const byId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function assertCapabilityGraph(raw: CapabilityGraph): CapabilityGraph {
  const graph = CapabilityGraph.parse(raw);
  const id = graph.tool.toolId;
  for (const [rows, key] of [[graph.documents, 'documentId'], [graph.snapshots, 'snapshotId'], [graph.trials, 'trialId'], [graph.grants, 'grantId'], [graph.summaries, 'summaryId']] as const) {
    const ids = rows.map((row) => (row as unknown as Record<string, string>)[key]);
    if (new Set(ids).size !== ids.length) throw new Error('The export contains duplicate records.');
  }
  for (const rows of [graph.versions, graph.ledger, graph.snapshots, graph.trials, graph.grants, graph.summaries]) {
    if (rows.some((row) => row.toolId !== id)) throw new Error('This graph contains records from another tool.');
  }
  if (graph.ownerProfile !== null && graph.ownerProfile.childId !== graph.tool.ownerChildId) throw new Error('This graph contains another child’s profile.');
  graph.versions.sort((a, b) => a.version - b.version);
  graph.ledger.sort((a, b) => a.sequence - b.sequence);
  graph.documents.sort((a, b) => byId(a.documentId, b.documentId));
  graph.snapshots.sort((a, b) => byId(a.snapshotId, b.snapshotId));
  graph.trials.sort((a, b) => byId(a.trialId, b.trialId));
  graph.grants.sort((a, b) => byId(a.grantId, b.grantId));
  graph.summaries.sort((a, b) => byId(a.summaryId, b.summaryId));
  const ids = graph.ledger.map((entry) => entry.eventId);
  if (new Set(ids).size !== ids.length || graph.ledger.some((entry, index) => entry.sequence !== index + 1)) throw new Error('The saved authorship history is incomplete.');
  if (new Set(graph.versions.map((version) => version.versionId)).size !== graph.versions.length || graph.versions.some((version, index) => version.version !== index + 1 || version.kind !== graph.tool.kind)) throw new Error('The saved version history is incomplete.');
  if (graph.versions.at(-1)?.versionId !== graph.tool.currentVersionId) throw new Error('The active saved version is missing or inconsistent.');
  const sourceIds = new Set(graph.snapshots.map((snapshot) => snapshot.sourceDocumentId));
  if (graph.documents.some((drawing) => !sourceIds.has(drawing.documentId) || drawing.ownerChildId !== graph.tool.ownerChildId)) throw new Error('The source drawing belongs to another tool or child.');
  for (const entry of graph.ledger) {
    if (entry.type === 'child_intent' && entry.ownerChildId !== undefined && entry.ownerChildId !== graph.tool.ownerChildId) throw new Error('The words belong to another child.');
    if (entry.type === 'capability_candidate') {
      const intent = graph.ledger.find((item) => item.eventId === entry.sourceIntentEventId);
      if (intent?.type !== 'child_intent' || intent.sequence >= entry.sequence || entry.proposal.kind !== graph.tool.kind || (entry.origin === 'model' ? entry.actor !== 'ai' : entry.actor !== 'child')) throw new Error('A suggestion has invalid source or attribution.');
    }
    if (entry.type === 'child_edit' || entry.type === 'child_rejection' || entry.type === 'child_approval') {
      const candidate = graph.ledger.find((item) => item.eventId === entry.candidateEventId);
      if (candidate?.type !== 'capability_candidate' || candidate.sequence >= entry.sequence) throw new Error('A child decision precedes its reviewed suggestion.');
    }
  }
  const requiredSnapshots = new Set<string>();
  for (const version of graph.versions) {
    const approval = graph.ledger.find((entry) => entry.eventId === version.metadata.approvalEventId);
    if (approval?.type !== 'child_approval') throw new Error('This version has no child approval.');
    const prior = graph.ledger.filter((entry) => entry.sequence < approval.sequence);
    if (canonicalJson(reviewedProposal(prior, approval.candidateEventId)) !== canonicalJson(approval.approvedProposal) || approval.approvedProposal.kind !== version.kind) throw new Error('This version does not match the child’s decision.');
    if (canonicalJson(prior.filter((entry) => entry.type !== 'child_rejection').map((entry) => entry.eventId)) !== canonicalJson(version.metadata.sourceEventIds)) throw new Error('This version has inconsistent evidence references.');
    const candidate = prior.find((entry) => entry.eventId === approval.candidateEventId);
    const intent = candidate?.type === 'capability_candidate' ? prior.find((entry) => entry.eventId === candidate.sourceIntentEventId) : undefined;
    if (intent?.type !== 'child_intent' || candidate?.type !== 'capability_candidate' || intent.sequence >= candidate.sequence || (candidate.origin === 'model' ? candidate.actor !== 'ai' : candidate.actor !== 'child')) throw new Error('The saved suggestion has no correctly attributed child source.');
    if (intent.reviewedContext !== undefined && version.metadata.contextDigest !== intent.contextDigest) throw new Error('The saved source context does not match the review.');
    if (version.kind === 'draw_pattern' && approval.approvedProposal.kind === 'draw_pattern') {
      requiredSnapshots.add(version.markSnapshotId);
      if (!graph.snapshots.some((snapshot) => snapshot.snapshotId === version.markSnapshotId)) throw new Error('The saved mark is missing.');
      const expected = { spacing: approval.approvedProposal.spacing === 'close' ? 36 : approval.approvedProposal.spacing === 'wide' ? 92 : 56, startScale: 1, endScale: approval.approvedProposal.sizeProfile === 'constant' ? 1 : .45, followPath: true };
      if (canonicalJson(version.controls) !== canonicalJson(expected)) throw new Error('The saved behavior differs from the child’s approval.');
    }
  }
  if (graph.snapshots.some((snapshot) => !requiredSnapshots.has(snapshot.snapshotId))) throw new Error('The export contains an unrelated mark copy.');
  return graph;
}
