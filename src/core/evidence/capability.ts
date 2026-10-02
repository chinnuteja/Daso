import { z } from 'zod';
import { assertCapabilityGraph, type CapabilityGraph } from '../capability/graph';
import { digestCapabilityContext } from '../capability/context';
import { runSavedDrawCapability } from '../capability/drawReuse';
import { replayFlightCapability } from '../capability/flight';
import type { CapabilityProposal, SavedCapabilityVersion } from '../capability/types';
import type { DrawPoint } from '../draw/schema';
import { canonicalJson } from '../serialization/canonicalJson';

export async function capabilityHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function history(graph: CapabilityGraph, version: SavedCapabilityVersion) {
  const approval = graph.ledger.find((entry) => entry.eventId === version.metadata.approvalEventId);
  if (approval?.type !== 'child_approval') throw new Error('The child approval is missing.');
  const candidate = graph.ledger.find((entry) => entry.eventId === approval.candidateEventId);
  if (candidate?.type !== 'capability_candidate') throw new Error('The reviewed choice is missing.');
  const intent = graph.ledger.find((entry) => entry.eventId === candidate.sourceIntentEventId);
  if (intent?.type !== 'child_intent') throw new Error('The child’s words are missing.');
  const edits = graph.ledger.filter((entry) => entry.type === 'child_edit' && entry.candidateEventId === candidate.eventId && entry.sequence < approval.sequence);
  return { approval, candidate, intent, edits };
}

async function deriveRun(graph: CapabilityGraph, version: SavedCapabilityVersion) {
  const { intent } = history(graph, version);
  const context = intent.reviewedContext;
  if (context !== undefined && (context.kind !== version.kind || context.toolId !== graph.tool.toolId || await digestCapabilityContext(context) !== intent.contextDigest)) throw new Error('The reviewed context receipt is inconsistent.');
  const common = { provenance: 'recomputed_for_evidence' as const, algorithmVersion: version.metadata.algorithmVersion, versionId: version.versionId, approvalEventId: version.metadata.approvalEventId, sourceEventIds: version.metadata.sourceEventIds, versionHash: await capabilityHash(version) };
  if (version.kind === 'draw_pattern') {
    const snapshot = graph.snapshots.find((item) => item.snapshotId === version.markSnapshotId)!;
    const drawing = graph.documents.find((item) => item.documentId === snapshot.sourceDocumentId);
    if (context?.kind === 'draw_pattern' && (context.selectedMarkSnapshotId !== snapshot.snapshotId || context.sourceDocumentId !== snapshot.sourceDocumentId || context.sourceRevision !== snapshot.sourceRevision)) throw new Error('The mark copy does not match the reviewed drawing.');
    const reviewedPath = intent.sourcePath;
    if (reviewedPath !== undefined && (context?.kind !== 'draw_pattern' || reviewedPath.pathId !== context.guidePathId || reviewedPath.revision !== context.guidePathRevision)) throw new Error('The path does not match the reviewed context.');
    const path: readonly DrawPoint[] = reviewedPath?.points ?? drawing?.guidePath?.points ?? [{ x: 100, y: 100 }, { x: 300, y: 140 }];
    const pathId = reviewedPath?.pathId ?? drawing?.guidePath?.pathId ?? 'draw_path_999';
    const input = { kind: 'draw_pattern' as const, snapshot, version, pathId, path, pathOrigin: reviewedPath !== undefined ? 'reviewed_child_path' as const : drawing?.guidePath !== undefined ? 'current_source_path' as const : 'inspection_example' as const };
    const output = runSavedDrawCapability(input);
    return { ...common, input, output, sourceHash: snapshot.sourceDigest, markHash: await capabilityHash(snapshot.strokes), inputHash: await capabilityHash(input), outputHash: await capabilityHash(output) };
  }
  if (context?.kind === 'flight_validity') {
    const selected = graph.trials.find((trial) => trial.trialId === context.selectedTrial.trialId);
    const contrast = graph.trials.find((trial) => trial.trialId === context.counterexampleTrialId);
    if (selected === undefined || selected.obstruction !== context.selectedTrial.obstruction || selected.distanceM !== context.selectedTrial.distanceM || (selected.setupChanged ?? false) !== context.selectedTrial.setupChanged || contrast === undefined || contrast.obstruction || contrast.distanceM !== selected.distanceM) throw new Error('The reviewed observation or contrast is missing or changed.');
  }
  const input = { kind: 'flight_validity' as const, toolId: graph.tool.toolId, version, trials: graph.trials, pathOrigin: 'stored_observations' as const };
  const output = { before: replayFlightCapability(graph.tool.toolId, graph.trials, null), after: replayFlightCapability(graph.tool.toolId, graph.trials, version) };
  return { ...common, input, output, sourceHash: await capabilityHash(graph.trials), inputHash: await capabilityHash(input), outputHash: await capabilityHash(output) };
}

/** Export executions are recomputations, never a fabricated usage history. */
export async function exportCapabilityGraph(raw: CapabilityGraph) {
  const graph = assertCapabilityGraph(raw);
  const runs = await Promise.all(graph.versions.map((version) => deriveRun(graph, version)));
  return { format: 'kale/capability-export-v1' as const, ...graph, runs };
}

const proposalText = (proposal: CapabilityProposal) => proposal.kind === 'flight_validity'
  ? 'Leave out throws with a recorded obstruction. Do not exclude a throw just because of its distance.'
  : `Repeat the child’s exact mark along their path, with ${proposal.spacing} spacing and ${proposal.sizeProfile === 'constant' ? 'the same size' : 'smaller marks toward the end'}.`;

export async function buildCapabilityParentEvidence(raw: CapabilityGraph) {
  const graph = assertCapabilityGraph(raw);
  const exportGraph = await exportCapabilityGraph(graph);
  const version = graph.versions.at(-1)!;
  const run = exportGraph.runs.at(-1)!;
  const { approval, candidate, intent, edits } = history(graph, version);
  const snapshot = version.kind === 'draw_pattern' ? graph.snapshots.find((item) => item.snapshotId === version.markSnapshotId) : undefined;
  const context = intent.reviewedContext;
  const selected = version.kind === 'flight_validity' ? graph.trials.find((trial) => context?.kind === 'flight_validity' ? trial.trialId === context.selectedTrial.trialId : trial.obstruction) : undefined;
  const counterexample = selected === undefined ? undefined : graph.trials.find((trial) => context?.kind === 'flight_validity' ? trial.trialId === context.counterexampleTrialId : !trial.obstruction && trial.distanceM === selected.distanceM);
  const flightRun = run.input.kind === 'flight_validity' && 'before' in run.output ? run.output : undefined;
  const steps: { actor: 'child' | 'ai' | 'system'; title: string; text: string; referenceId: string }[] = [
    { actor: 'child', title: version.kind === 'draw_pattern' ? 'Their work' : 'What they noticed', text: version.kind === 'draw_pattern' ? 'They selected a mark from a drawing. The saved copy keeps those exact strokes; AI did not redraw it.' : context === undefined ? 'An earlier review did not retain the selected observation. The examples below are a comparison, not a claim about what the child selected.' : `They selected ${selected?.designName}, ${selected?.distanceM} m, with a recorded obstruction. These are labelled practice observations.`, referenceId: snapshot?.snapshotId ?? selected?.trialId ?? intent.eventId },
    { actor: 'child', title: 'Their words', text: intent.childWords, referenceId: intent.eventId },
    { actor: candidate.origin === 'model' ? 'ai' : 'child', title: candidate.origin === 'model' ? 'Kale’s suggestion' : 'Their manual choice', text: proposalText(candidate.proposal), referenceId: candidate.eventId },
    ...edits.map((edit) => ({ actor: 'child' as const, title: 'Their adjustment', text: edit.type === 'child_edit' ? proposalText(edit.proposal) : '', referenceId: edit.eventId })),
    { actor: 'child', title: 'Their approval', text: `They approved this choice and saved version ${version.version}. Only this child decision activated the tool.`, referenceId: approval.eventId },
    { actor: 'system', title: 'What the saved tool computes', text: flightRun !== undefined ? `With the same stored observations: before ${flightRun.before.winner ?? 'no winner'} leads; with the saved rule ${flightRun.after.winner ?? 'no winner'} leads. This is a local replay, not a new observation.` : 'The saved mark is repeated by deterministic geometry, without asking AI. This preview is computed now, not a record of an earlier use.', referenceId: version.versionId },
  ];
  return { tool: graph.tool, ownerDisplayName: graph.ownerProfile?.displayName ?? 'Child on this device', steps, snapshot, sourceMissing: snapshot !== undefined && !graph.documents.some((drawing) => drawing.documentId === snapshot.sourceDocumentId), run, exportGraph, flight: flightRun !== undefined && selected !== undefined && counterexample !== undefined ? { ...flightRun, selected, counterexample, isReviewedSelection: context?.kind === 'flight_validity' } : undefined };
}

const ProjectionItem = z.strictObject({ referenceId: z.string().min(1).max(160), category: z.enum(['work', 'intent', 'suggestion', 'edit', 'approval', 'version']), actor: z.enum(['child', 'ai', 'system']) });
export const CapabilityEvidenceProjection = z.strictObject({ toolId: z.string().min(1).max(160), kind: z.enum(['draw_pattern', 'flight_validity']), items: z.array(ProjectionItem).min(4).max(512) });
export type CapabilityEvidenceProjection = z.infer<typeof CapabilityEvidenceProjection>;
export const CapabilityEvidenceRequest = z.strictObject({ protocol: z.literal('capability_evidence_v2'), projection: CapabilityEvidenceProjection });
export const CapabilityEvidenceSelection = z.strictObject({ evidenceEventIds: z.array(z.string().min(1).max(160)).min(4).max(5) });
export function buildCapabilityEvidenceProjection(raw: CapabilityGraph): CapabilityEvidenceProjection {
  const graph = assertCapabilityGraph(raw);
  const version = graph.versions.at(-1)!;
  const { intent, candidate, approval, edits } = history(graph, version);
  const workId = version.kind === 'draw_pattern' ? version.markSnapshotId : intent.reviewedContext?.kind === 'flight_validity' ? intent.reviewedContext.selectedTrial.trialId : intent.eventId;
  return CapabilityEvidenceProjection.parse({ toolId: graph.tool.toolId, kind: version.kind, items: [
    { referenceId: workId, category: 'work', actor: 'child' }, { referenceId: intent.eventId, category: 'intent', actor: 'child' },
    { referenceId: candidate.eventId, category: 'suggestion', actor: candidate.actor }, ...edits.map((entry) => ({ referenceId: entry.eventId, category: 'edit', actor: 'child' })),
    { referenceId: approval.eventId, category: 'approval', actor: 'child' }, { referenceId: version.versionId, category: 'version', actor: 'system' },
  ] });
}
export function selectCapabilityEvidence(raw: CapabilityEvidenceProjection) {
  const projection = CapabilityEvidenceProjection.parse(raw);
  const ids = ['work', 'suggestion', 'approval', 'version'].map((category) => projection.items.find((item) => item.category === category)?.referenceId);
  const edit = projection.items.filter((item) => item.category === 'edit').at(-1);
  const selection = CapabilityEvidenceSelection.parse({ evidenceEventIds: [...ids, ...(edit === undefined ? [] : [edit.referenceId])] });
  validateCapabilityEvidenceSelection(projection, selection);
  return selection;
}
export function validateCapabilityEvidenceSelection(raw: CapabilityEvidenceProjection, value: unknown) {
  const projection = CapabilityEvidenceProjection.parse(raw);
  const selection = CapabilityEvidenceSelection.parse(value);
  const ids = selection.evidenceEventIds;
  if (new Set(ids).size !== ids.length || ids.some((id) => !projection.items.some((item) => item.referenceId === id))) throw new Error('Evidence can only select unique local references.');
  for (const category of ['work', 'suggestion', 'approval', 'version']) if (!projection.items.some((item) => item.category === category && ids.includes(item.referenceId))) throw new Error('Evidence must include the work, suggestion, child approval and saved version.');
  const latestEdit = projection.items.filter((item) => item.category === 'edit').at(-1);
  if (latestEdit !== undefined && !ids.includes(latestEdit.referenceId)) throw new Error('Evidence cannot omit the child’s final edit.');
  return selection;
}

/** Stubbed optional selector seam only. No production transport or new external payload. */
export async function interpretCapabilityEvidenceSelection(body: unknown, selector: (request: z.infer<typeof CapabilityEvidenceRequest>) => Promise<unknown>) {
  const parsed = CapabilityEvidenceRequest.safeParse(body);
  if (!parsed.success) return { status: 400, payload: { ok: false, reasons: ['invalid_request'] } };
  const raw = await selector(parsed.data);
  try { return { status: 200, payload: { ok: true, selection: validateCapabilityEvidenceSelection(parsed.data.projection, raw) } }; }
  catch { return { status: 422, payload: { ok: false, reasons: ['invalid_selection'] } }; }
}
