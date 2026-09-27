import { describe, expect, it } from 'vitest';

import { appendStroke, createDrawDocument, setGuidePath, setMarkSelection, withDrawSourceDigest } from '../../../src/core/draw';
import { buildDrawApprovalBundle, DrawAuthorityError } from '../../../src/core/capability';
import type { CapabilityLedgerEntry } from '../../../src/core/capability/ledger';
import { createMemoryPersistence } from '../../../src/adapters/persistence';
import { setFailAfterCapabilityWrite } from '../../../src/adapters/persistence';

const NOW = '2026-09-27T12:00:00Z';
const PROPOSAL = { type: 'propose_capability' as const, kind: 'draw_pattern' as const, operation: 'repeat_selected_mark' as const, spacing: 'even' as const, sizeProfile: 'smaller_toward_end' as const };

async function drawing() {
  const blank = createDrawDocument({ documentId: 'draw_document_001', ownerChildId: 'child_local_01', now: NOW });
  const hashed = await withDrawSourceDigest(appendStroke(blank, { strokeId: 'stroke_scale_001', color: '#c45b3f', width: 6, points: [{ x: 12, y: 12 }, { x: 24, y: 24 }] }, '2026-09-27T12:00:01Z'));
  return setGuidePath(setMarkSelection(hashed, ['stroke_scale_001'], '2026-09-27T12:00:02Z'), { pathId: 'draw_path_001', points: [{ x: 50, y: 50 }, { x: 300, y: 120 }] }, '2026-09-27T12:00:03Z');
}

const entries: readonly CapabilityLedgerEntry[] = [
  { type: 'child_intent', eventId: 'event_101', toolId: 'my-dragon-scales', sequence: 1, occurredAt: NOW, actor: 'child', childWords: 'Make my scale repeat and shrink.', contextDigest: 'a'.repeat(64) },
  { type: 'capability_candidate', eventId: 'event_102', toolId: 'my-dragon-scales', sequence: 2, occurredAt: NOW, actor: 'ai', origin: 'model', sourceIntentEventId: 'event_101', proposal: PROPOSAL },
  { type: 'child_edit', eventId: 'event_103', toolId: 'my-dragon-scales', sequence: 3, occurredAt: NOW, actor: 'child', candidateEventId: 'event_102', proposal: { ...PROPOSAL, spacing: 'wide' } },
];

describe('Draw child authority', () => {
  it('copies exactly the selected mark only after a child approval and preserves edited attribution', async () => {
    const approval: CapabilityLedgerEntry = { type: 'child_approval', eventId: 'event_104', toolId: 'my-dragon-scales', sequence: 4, occurredAt: NOW, actor: 'child', candidateEventId: 'event_102', approvedProposal: { ...PROPOSAL, spacing: 'wide' }, idempotencyKey: 'approval_001' };
    const bundle = await buildDrawApprovalBundle({ drawing: await drawing(), toolId: 'my-dragon-scales', ownerChildId: 'child_local_01', displayName: 'My dragon scales', existingVersionCount: 0, snapshotId: 'mark_snapshot_001', versionId: 'tool_version_101', approvalEvent: approval, entries, createdAt: NOW });
    expect(bundle.snapshot.strokes.map((stroke) => stroke.strokeId)).toEqual(['stroke_scale_001']);
    expect(bundle.version.controls.spacing).toBe(92);
    expect(bundle.version.metadata.sourceEventIds).toEqual(['event_101', 'event_102', 'event_103']);
    expect(bundle.definition.currentVersionId).toBe('tool_version_101');
  });

  it('rejects AI approval and a permanently rejected candidate', async () => {
    const aiApproval = { type: 'child_approval', eventId: 'event_104', toolId: 'my-dragon-scales', sequence: 4, occurredAt: NOW, actor: 'ai', candidateEventId: 'event_102', approvedProposal: PROPOSAL, idempotencyKey: 'approval_002' } as unknown as CapabilityLedgerEntry;
    await expect(buildDrawApprovalBundle({ drawing: await drawing(), toolId: 'my-dragon-scales', ownerChildId: 'child_local_01', displayName: 'My dragon scales', existingVersionCount: 0, snapshotId: 'mark_snapshot_002', versionId: 'tool_version_102', approvalEvent: aiApproval, entries, createdAt: NOW })).rejects.toThrow();
    const rejected: CapabilityLedgerEntry = { type: 'child_rejection', eventId: 'event_104', toolId: 'my-dragon-scales', sequence: 4, occurredAt: NOW, actor: 'child', candidateEventId: 'event_102', reason: 'Not this one.' };
    const childApproval: CapabilityLedgerEntry = { type: 'child_approval', eventId: 'event_105', toolId: 'my-dragon-scales', sequence: 5, occurredAt: NOW, actor: 'child', candidateEventId: 'event_102', approvedProposal: { ...PROPOSAL, spacing: 'wide' }, idempotencyKey: 'approval_003' };
    await expect(buildDrawApprovalBundle({ drawing: await drawing(), toolId: 'my-dragon-scales', ownerChildId: 'child_local_01', displayName: 'My dragon scales', existingVersionCount: 0, snapshotId: 'mark_snapshot_003', versionId: 'tool_version_103', approvalEvent: childApproval, entries: [...entries, rejected], createdAt: NOW })).rejects.toBeInstanceOf(DrawAuthorityError);
  });

  it('commits one complete local tool atomically and treats a duplicate save as the original result', async () => {
    const persistence = createMemoryPersistence();
    for (const entry of entries) await persistence.repositories.capabilities.append(entry);
    const approval: CapabilityLedgerEntry = { type: 'child_approval', eventId: 'event_104', toolId: 'my-dragon-scales', sequence: 4, occurredAt: NOW, actor: 'child', candidateEventId: 'event_102', approvedProposal: { ...PROPOSAL, spacing: 'wide' }, idempotencyKey: 'approval_004' };
    const bundle = await buildDrawApprovalBundle({ drawing: await drawing(), toolId: 'my-dragon-scales', ownerChildId: 'child_local_01', displayName: 'My dragon scales', existingVersionCount: 0, snapshotId: 'mark_snapshot_004', versionId: 'tool_version_104', approvalEvent: approval, entries, createdAt: NOW });
    const first = await persistence.repositories.capabilities.commitDrawApproval({ ...bundle, approval });
    const repeated = await persistence.repositories.capabilities.commitDrawApproval({ ...bundle, approval });

    expect(repeated).toEqual(first);
    expect((await persistence.repositories.capabilities.listEntriesByTool('my-dragon-scales'))).toHaveLength(4);
    expect((await persistence.repositories.capabilities.getDefinition('my-dragon-scales'))?.currentVersionId).toBe('tool_version_104');
    expect((await persistence.repositories.drawAssets.getMarkSnapshot('mark_snapshot_004'))?.strokes).toHaveLength(1);
  });

  it('rolls back the snapshot when activation fails after its first write', async () => {
    const persistence = createMemoryPersistence();
    for (const entry of entries) await persistence.repositories.capabilities.append(entry);
    const approval: CapabilityLedgerEntry = { type: 'child_approval', eventId: 'event_105', toolId: 'my-dragon-scales', sequence: 4, occurredAt: NOW, actor: 'child', candidateEventId: 'event_102', approvedProposal: { ...PROPOSAL, spacing: 'wide' }, idempotencyKey: 'approval_005' };
    const bundle = await buildDrawApprovalBundle({ drawing: await drawing(), toolId: 'my-dragon-scales', ownerChildId: 'child_local_01', displayName: 'My dragon scales', existingVersionCount: 0, snapshotId: 'mark_snapshot_005', versionId: 'tool_version_105', approvalEvent: approval, entries, createdAt: NOW });
    setFailAfterCapabilityWrite(true);
    await expect(persistence.repositories.capabilities.commitDrawApproval({ ...bundle, approval })).rejects.toThrow(/injected/i);
    setFailAfterCapabilityWrite(false);
    expect(await persistence.repositories.drawAssets.getMarkSnapshot('mark_snapshot_005')).toBeNull();
    expect(await persistence.repositories.capabilities.getDefinition('my-dragon-scales')).toBeNull();
    expect(await persistence.repositories.capabilities.listEntriesByTool('my-dragon-scales')).toHaveLength(3);
  });
});
