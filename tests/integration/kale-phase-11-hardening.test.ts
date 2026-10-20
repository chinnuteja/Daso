import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteDB } from 'idb';
import { createMemoryPersistence, openIndexedDbRepositories, setFailAfterDeleteWrite } from '../../src/adapters/persistence';
import { appendStroke, createDrawDocument, withDrawSourceDigest } from '../../src/core/draw';
import { DrawWriteQueue } from '../../src/ui/draw/DrawWriteQueue';
import { seedKaleCapabilities } from '../support/kaleCapabilityGraph';
import { runSavedDrawCapability, replayFlightCapability, beginCapabilityReview, buildDrawApprovalBundle } from '../../src/core/capability';
import type { CapabilityLedgerEntry } from '../../src/core/capability/ledger';
import { assertCapabilityGraph } from '../../src/core/capability/graph';
import type { Repositories } from '../../src/core/ports/repositories';

const NOW = '2026-10-04T00:00:00Z';
const names: string[] = [];
afterEach(async () => { setFailAfterDeleteWrite(false); vi.unstubAllGlobals(); for (const name of names.splice(0)) await deleteDB(name); });
async function open(kind: string): Promise<{ repo: Repositories; close: () => void }> {
  if (kind === 'memory') return { repo: createMemoryPersistence().repositories, close: () => undefined };
  const name = `phase11-${crypto.randomUUID()}`; names.push(name);
  const opened = await openIndexedDbRepositories(name); return { repo: opened.repositories, close: () => opened.database.close() };
}
const blank = () => createDrawDocument({ documentId: 'draw_document_hardening', ownerChildId: 'child_hardening', now: NOW });
const mark = (id: string) => ({ strokeId: id, color: '#123456', width: 5, points: [{ x: 10, y: 10 }, { x: 25, y: 30 }] });

describe('Phase 11 persistence and authority hardening', () => {
  for (const kind of ['memory', 'idb']) {
    it(`${kind}: concurrent approvals activate exactly one version; identical winner retry is idempotent`, async () => {
      const { repo, close } = await open(kind);
      try {
        const seed = await seedKaleCapabilities(repo);
        const context = { ...seed.context, toolId: 'race-review', selectedMarkSnapshotId: 'mark_snapshot_1100' };
        const entries = await beginCapabilityReview(repo.capabilities, { context, ownerChildId: seed.ownerChildId, sourcePath: seed.drawing.guidePath, childWords: 'Repeat my mark.', proposal: seed.proposal, origin: 'manual', intentEventId: 'event_1100', candidateEventId: 'event_1101', occurredAt: NOW });
        const make = async (number: number) => {
          const approval: CapabilityLedgerEntry = { type: 'child_approval', actor: 'child', toolId: context.toolId, eventId: `event_${number}`, sequence: 3, occurredAt: NOW, candidateEventId: 'event_1101', approvedProposal: seed.proposal, idempotencyKey: `race_${number}` };
          const bundle = await buildDrawApprovalBundle({ drawing: seed.drawing, toolId: context.toolId, ownerChildId: seed.ownerChildId, displayName: 'Race tool', existingVersionCount: 0, snapshotId: context.selectedMarkSnapshotId, versionId: `tool_version_${number}`, approvalEvent: approval, entries, createdAt: NOW, reviewedContext: context });
          return { ...bundle, approval, reviewedContext: context };
        };
        const proposals = await Promise.all([make(1102), make(1103)]);
        const outcomes = await Promise.allSettled(proposals.map((proposal) => repo.capabilities.commitApprovedCapability(proposal)));
        expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
        const index = outcomes.findIndex((item) => item.status === 'fulfilled');
        await repo.capabilities.commitApprovedCapability(proposals[index]!);
        expect(await repo.capabilities.listDrawVersionsByTool(context.toolId)).toHaveLength(1);
        expect(await repo.capabilities.listEntriesByTool(context.toolId)).toHaveLength(3);
        expect((await repo.capabilities.getDefinition(context.toolId))?.currentVersionId).toBe(proposals[index]!.version.versionId);
      } finally { close(); }
    });
    it(`${kind}: two tab writers cannot overwrite the winning revision`, async () => {
      const { repo, close } = await open(kind);
      try {
        const original = await withDrawSourceDigest(blank()); await repo.drawAssets.saveDocument(original);
        const left = new DrawWriteQueue(repo.drawAssets), right = new DrawWriteQueue(repo.drawAssets);
        await left.track(original, original.ownerChildId); await right.track(original, original.ownerChildId);
        const outcomes = await Promise.allSettled([left.write(appendStroke(original, mark('stroke_left'), NOW)), right.write(appendStroke(original, mark('stroke_right'), NOW))]);
        expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1);
        const winner = outcomes.find((result) => result.status === 'fulfilled');
        expect(await repo.drawAssets.getDocument(original.documentId)).toEqual(winner?.status === 'fulfilled' ? winner.value : null);
      } finally { close(); }
    });
    it(`${kind}: ordered writer stores every revision and flush reports failed saves`, async () => {
      const { repo, close } = await open(kind);
      try {
        const queue = new DrawWriteQueue(repo.drawAssets); await queue.track(null, blank().ownerChildId);
        const first = appendStroke(blank(), mark('stroke_first'), NOW), second = appendStroke(first, mark('stroke_second'), NOW);
        await Promise.all([queue.write(first), queue.write(second)]); await queue.flush();
        expect((await repo.drawAssets.getDocument(second.documentId))?.strokes).toEqual(second.strokes);
        await repo.drawAssets.deleteDocument(second.documentId);
        await expect(queue.write(appendStroke(second, mark('stroke_late'), NOW))).rejects.toThrow(/another tab/);
        await expect(queue.flush()).rejects.toThrow();
        expect(await repo.drawAssets.getDocument(second.documentId)).toBeNull();
      } finally { close(); }
    });
    it(`${kind}: reset fences even a new source queued by a stale tab; other owner stays`, async () => {
      const { repo, close } = await open(kind);
      try {
        const queue = new DrawWriteQueue(repo.drawAssets); await queue.track(null, blank().ownerChildId);
        const other = { ...blank(), documentId: 'draw_document_other', ownerChildId: 'child_other' }; await repo.drawAssets.saveDocument(other);
        await repo.profiles.deleteProfileGraph(blank().ownerChildId);
        await expect(queue.write(blank())).rejects.toThrow(/another tab/);
        expect(await repo.drawAssets.getDocument(blank().documentId)).toBeNull();
        expect(await repo.drawAssets.getDocument(other.documentId)).toEqual(other);
        await queue.track(null, blank().ownerChildId); await queue.write(blank());
        expect(await repo.drawAssets.getOwnerGeneration(blank().ownerChildId)).toBe(1);
      } finally { close(); }
    });
    it(`${kind}: failed deletion rolls back both source and reset fence`, async () => {
      const { repo, close } = await open(kind);
      try {
        await repo.drawAssets.saveDocument(blank()); setFailAfterDeleteWrite(true);
        await expect(repo.profiles.deleteProfileGraph(blank().ownerChildId)).rejects.toThrow();
        expect(await repo.drawAssets.getDocument(blank().documentId)).toEqual(blank());
        expect(await repo.drawAssets.getOwnerGeneration(blank().ownerChildId)).toBe(0);
      } finally { setFailAfterDeleteWrite(false); close(); }
    });
    it(`${kind}: same revision changes and owner replacement fail closed`, async () => {
      const { repo, close } = await open(kind);
      try {
        await repo.drawAssets.saveDocument(blank());
        await expect(repo.drawAssets.saveDocument({ ...blank(), ownerChildId: 'child_other' })).rejects.toThrow();
        await expect(repo.drawAssets.saveDocument({ ...blank(), strokes: [mark('stroke_changed')] })).rejects.toThrow();
        expect(await repo.drawAssets.getDocument(blank().documentId)).toEqual(blank());
      } finally { close(); }
    });
    it(`${kind}: deleted reviews cannot append orphaned child words or candidates`, async () => {
      const { repo, close } = await open(kind);
      try {
        const seed = await seedKaleCapabilities(repo);
        const prior = await repo.capabilities.listEntriesByTool(seed.toolId);
        const intent = prior.find((entry) => entry.type === 'child_intent')!;
        const candidate = prior.find((entry) => entry.type === 'capability_candidate')!;
        await repo.profiles.deleteProfileGraph(seed.ownerChildId);
        await expect(repo.capabilities.append({ ...intent, eventId: 'event_1190', sequence: 1 })).rejects.toThrow(/removed/);
        await expect(repo.capabilities.append({ ...candidate, eventId: 'event_1191', sequence: 1 })).rejects.toThrow(/intent/);
        expect(await repo.capabilities.listEntriesByTool(seed.toolId)).toEqual([]);
      } finally { close(); }
    });
    it(`${kind}: Draw and Flight saved graphs replay with every network call forbidden`, async () => {
      const { repo, close } = await open(kind);
      try {
        const seed = await seedKaleCapabilities(repo);
        vi.stubGlobal('fetch', vi.fn(() => { throw new Error('network forbidden'); }));
        const draw = assertCapabilityGraph((await repo.capabilities.getGraph(seed.toolId))!);
        const version = draw.versions[0]!; if (version.kind !== 'draw_pattern') throw new Error('fixture');
        expect(runSavedDrawCapability({ snapshot: draw.snapshots[0]!, version, pathId: 'draw_path_new', path: [{ x: 100, y: 100 }, { x: 500, y: 100 }] }).stampCount).toBeGreaterThan(1);
        const flight = assertCapabilityGraph((await repo.capabilities.getGraph(seed.flightToolId))!);
        const flightVersion = flight.versions[0]!; if (flightVersion.kind !== 'flight_validity') throw new Error('fixture');
        expect(replayFlightCapability(seed.flightToolId, flight.trials, flightVersion).ranking.length).toBeGreaterThan(0);
        expect(fetch).not.toHaveBeenCalled();
      } finally { close(); }
    });
  }
});
