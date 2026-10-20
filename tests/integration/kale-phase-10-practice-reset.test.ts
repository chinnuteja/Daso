import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openIndexedDbRepositories, setFailAfterDeleteWrite } from '../../src/adapters/persistence';
import { createDrawDocument, setGuidePath, setMarkSelection, withDrawSourceDigest } from '../../src/core/draw';
import { beginCapabilityReview, buildDrawApprovalBundle } from '../../src/core/capability';
import type { CapabilityLedgerEntry } from '../../src/core/capability/ledger';
import type { DrawTeachingContext } from '../../src/core/capability/types';
import { DRAW_PRACTICE_OWNER, resetDrawPractice } from '../../src/ui/draw/practiceSession';
import { seedKaleCapabilities } from '../support/kaleCapabilityGraph';

describe('Phase 10 practice reset isolation', () => {
  for (const fail of [false, true]) it(fail ? 'rolls back practice deletion without touching real work' : 'removes only new practice-owned graphs; real work and legacy practice survive', async () => {
    const name = `kale-phase10-${crypto.randomUUID()}`;
    const { repositories: repo, database } = await openIndexedDbRepositories(name);
    const real = await seedKaleCapabilities(repo);
    const time = '2026-10-02T00:00:00Z';
    let drawing = await withDrawSourceDigest(createDrawDocument({ documentId: 'draw_document_practice_new', ownerChildId: DRAW_PRACTICE_OWNER, now: time, strokes: real.drawing.strokes }));
    drawing = setGuidePath(setMarkSelection(drawing, [drawing.strokes[0]!.strokeId], time), { pathId: 'draw_path_practice', points: [{ x: 150, y: 150 }, { x: 450, y: 300 }] }, time);
    await repo.drawAssets.saveDocument(drawing);
    await repo.drawAssets.saveDocument({ ...real.drawing, documentId: 'draw_document_practice_old' });
    const context: DrawTeachingContext = { kind: 'draw_pattern', toolId: 'practice-new', activeVersionId: null, ledgerSequence: 0, sourceDocumentId: drawing.documentId, sourceRevision: drawing.revision, selectedMarkSnapshotId: 'mark_snapshot_practice', guidePathId: drawing.guidePath!.pathId, guidePathRevision: drawing.guidePath!.revision };
    const entries = await beginCapabilityReview(repo.capabilities, { context, ownerChildId: DRAW_PRACTICE_OWNER, sourcePath: drawing.guidePath, childWords: 'Repeat this practice mark.', proposal: real.proposal, origin: 'manual', intentEventId: 'event_1010', candidateEventId: 'event_1011', occurredAt: time });
    const approval: CapabilityLedgerEntry = { type: 'child_approval', actor: 'child', eventId: 'event_1012', toolId: context.toolId, sequence: 3, occurredAt: time, candidateEventId: 'event_1011', approvedProposal: real.proposal, idempotencyKey: 'practice_new_save' };
    const bundle = await buildDrawApprovalBundle({ drawing, toolId: context.toolId, ownerChildId: DRAW_PRACTICE_OWNER, displayName: 'Practice only', existingVersionCount: 0, snapshotId: context.selectedMarkSnapshotId, versionId: 'tool_version_1010', approvalEvent: approval, entries, createdAt: time, reviewedContext: context });
    await repo.capabilities.commitApprovedCapability({ ...bundle, approval, reviewedContext: context });
    const realBefore = await repo.capabilities.getGraph(real.toolId);
    const practiceBefore = await repo.capabilities.getGraph(context.toolId);
    try {
      if (fail) setFailAfterDeleteWrite(true);
      if (fail) await expect(resetDrawPractice(name)).rejects.toThrow();
      else await resetDrawPractice(name);
    } finally { setFailAfterDeleteWrite(false); }
    expect(await repo.capabilities.getGraph(real.toolId)).toEqual(realBefore);
    expect(await repo.drawAssets.getDocument('draw_document_practice_old')).not.toBeNull();
    expect(await repo.trials.listByTool(real.flightToolId)).toHaveLength(6);
    expect(await repo.capabilities.getGraph(context.toolId)).toEqual(fail ? practiceBefore : null);
    expect(await repo.drawAssets.getDocument(drawing.documentId)).toEqual(fail ? drawing : null);
    if (!fail) { await resetDrawPractice(name); expect(await repo.capabilities.getGraph(real.toolId)).toEqual(realBefore); }
    database.close();
  });
});
