import { beginCapabilityReview, buildDrawApprovalBundle, buildFlightApprovalBundle, flightContext, FLIGHT_PROPOSAL } from '../../src/core/capability';
import { flightPracticeTrials, FLIGHT_PRACTICE_TOOL_ID } from '../../src/core/capability/flightPractice';
import type { CapabilityLedgerEntry } from '../../src/core/capability/ledger';
import type { DrawTeachingContext } from '../../src/core/capability/types';
import { createDrawDocument, setGuidePath, setMarkSelection, withDrawSourceDigest } from '../../src/core/draw';
import type { Repositories } from '../../src/core/ports/repositories';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

export async function seedKaleCapabilities(repositories: Repositories) {
  const time = '2026-10-01T00:00:00Z';
  const ownerChildId = 'child_local_01';
  await repositories.profiles.save(flightLabGraph().profile);
  const toolId = 'parent-draw-proof';
  let drawing = await withDrawSourceDigest(createDrawDocument({ documentId: 'draw_document_910', ownerChildId, now: time, strokes: [{ strokeId: 'stroke_910', color: '#005544', width: 5, points: [{ x: 20, y: 20 }, { x: 40, y: 30 }] }] }));
  drawing = setGuidePath(setMarkSelection(drawing, ['stroke_910'], time), { pathId: 'draw_path_910', points: [{ x: 100, y: 100 }, { x: 300, y: 140 }] }, time);
  await repositories.drawAssets.saveDocument(drawing);
  const context: DrawTeachingContext = { toolId, kind: 'draw_pattern', activeVersionId: null, ledgerSequence: 0, sourceDocumentId: drawing.documentId, sourceRevision: drawing.revision, selectedMarkSnapshotId: 'mark_snapshot_910', guidePathId: drawing.guidePath!.pathId, guidePathRevision: drawing.guidePath!.revision };
  const proposal = { type: 'propose_capability' as const, kind: 'draw_pattern' as const, operation: 'repeat_selected_mark' as const, spacing: 'even' as const, sizeProfile: 'constant' as const };
  let entries = await beginCapabilityReview(repositories.capabilities, { context, ownerChildId, sourcePath: drawing.guidePath, childWords: 'Repeat my mark along here.', proposal, origin: 'model', intentEventId: 'event_910', candidateEventId: 'event_911', occurredAt: time });
  const edited = { ...proposal, spacing: 'wide' as const };
  const edit: CapabilityLedgerEntry = { type: 'child_edit', actor: 'child', toolId, eventId: 'event_912', sequence: 3, occurredAt: time, candidateEventId: 'event_911', proposal: edited };
  await repositories.capabilities.append(edit); entries = [...entries, edit];
  const approval: CapabilityLedgerEntry = { type: 'child_approval', actor: 'child', toolId, eventId: 'event_913', sequence: 4, occurredAt: time, candidateEventId: 'event_911', approvedProposal: edited, idempotencyKey: 'parent_draw_save' };
  const bundle = await buildDrawApprovalBundle({ drawing, toolId, ownerChildId, displayName: 'Maya’s repeating mark', existingVersionCount: 0, snapshotId: 'mark_snapshot_910', versionId: 'tool_version_910', approvalEvent: approval, entries, createdAt: time, reviewedContext: context });
  await repositories.capabilities.commitApprovedCapability({ ...bundle, approval, reviewedContext: context });

  const trials = flightPracticeTrials();
  for (const trial of trials) await repositories.trials.save(trial);
  const flight = flightContext({ toolId: FLIGHT_PRACTICE_TOOL_ID, activeVersionId: null, ledgerSequence: 0, trial: trials[1]!, counterexample: trials[5]! });
  const flightEntries = await beginCapabilityReview(repositories.capabilities, { context: flight, ownerChildId, childWords: "That throw shouldn't count because it hit the chair.", proposal: FLIGHT_PROPOSAL, origin: 'manual', intentEventId: 'event_920', candidateEventId: 'event_921', occurredAt: time });
  const flightApproval: CapabilityLedgerEntry = { type: 'child_approval', actor: 'child', toolId: flight.toolId, eventId: 'event_922', sequence: 3, occurredAt: time, candidateEventId: 'event_921', approvedProposal: FLIGHT_PROPOSAL, idempotencyKey: 'parent_flight_save' };
  await repositories.capabilities.commitApprovedCapability(await buildFlightApprovalBundle({ context: flight, entries: flightEntries, approval: flightApproval, ownerChildId, displayName: 'My fair-flight rule', versionId: 'tool_version_920', version: 1, createdAt: time }));
  return { toolId, flightToolId: flight.toolId, drawing, context, proposal, ownerChildId };
}
