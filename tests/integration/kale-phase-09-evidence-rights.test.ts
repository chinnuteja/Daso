import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryPersistence, openIndexedDbRepositories, setFailAfterDeleteWrite } from '../../src/adapters/persistence';
import { beginCapabilityReview } from '../../src/core/capability';
import { buildCapabilityParentEvidence, buildCapabilityEvidenceProjection, selectCapabilityEvidence, validateCapabilityEvidenceSelection, exportCapabilityGraph } from '../../src/core/evidence/capability';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { interpretCapabilityEvidenceSelection } from '../../src/core/evidence/capability';
import { seedKaleCapabilities } from '../support/kaleCapabilityGraph';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { flightPracticeTrials } from '../../src/core/capability/flightPractice';

const names: string[] = [];
afterEach(async () => { setFailAfterDeleteWrite(false); vi.unstubAllGlobals(); for (const name of names.splice(0)) await deleteDB(name); });
async function harness(adapter: 'memory' | 'idb' | 'idb-v1') {
  if (adapter === 'memory') return { repositories: createMemoryPersistence().repositories, close: () => undefined };
  const name = `kale-phase-09-${names.length}`; names.push(name);
  if (adapter === 'idb-v1') {
    const legacy = await openDB(name, 1, { upgrade(db) {
      for (const [store, key, index] of [['childProfiles', 'childId', ''], ['tools', 'toolId', 'ownerChildId'], ['toolVersions', 'versionId', 'toolId'], ['ledgerEntries', 'eventId', 'toolId'], ['trials', 'trialId', 'toolId'], ['grants', 'grantId', 'toolId'], ['summaries', 'summaryId', 'toolId'], ['meta', 'key', '']] as const) {
        const created = db.createObjectStore(store, { keyPath: key }); if (index) created.createIndex(index, index);
        if (store === 'ledgerEntries') created.createIndex('toolIdSequence', ['toolId', 'sequence'], { unique: true });
      }
    } });
    const graph = flightLabGraph(); await legacy.put('childProfiles', graph.profile);
    for (const [store, rows] of [['tools', graph.tools], ['toolVersions', graph.versions], ['ledgerEntries', graph.entries], ['trials', graph.trials], ['grants', graph.grants], ['summaries', graph.summaries]] as const) for (const row of rows) await legacy.put(store, row);
    legacy.close();
  }
  const opened = await openIndexedDbRepositories(name);
  if (adapter === 'idb-v1') {
    const graph = flightLabGraph();
    expect(await opened.repositories.ledger.listByTool(graph.tools[0]!.toolId)).toEqual(graph.entries);
    expect(await opened.repositories.versions.listByTool(graph.tools[0]!.toolId)).toEqual(graph.versions);
  }
  return { repositories: opened.repositories, close: () => opened.database.close() };
}

describe.each(['memory', 'idb', 'idb-v1'] as const)('Phase 9 evidence and rights in %s', (adapter) => {
  it('keeps child work, words, AI idea, edit, approval and computed replay distinct', async () => {
    const opened = await harness(adapter);
    try {
      const seeded = await seedKaleCapabilities(opened.repositories);
      const graph = await opened.repositories.capabilities.getGraph(seeded.toolId);
      const noFetch = vi.fn(() => { throw new Error('network disabled'); }); vi.stubGlobal('fetch', noFetch);
      const view = await buildCapabilityParentEvidence(graph!);
      expect(view.steps.map((step) => step.actor)).toEqual(['child', 'child', 'ai', 'child', 'child', 'system']);
      expect(view.steps.find((step) => step.title === 'Their words')?.text).toContain('Repeat my mark');
      expect(view.run.input.kind).toBe('draw_pattern');
      expect(view.run.input.pathOrigin).toBe('reviewed_child_path');
      expect(view.snapshot?.strokes).toEqual(seeded.drawing.strokes);
      expect(view.run.inputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(view.run.outputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(noFetch).not.toHaveBeenCalled();
      const flight = await buildCapabilityParentEvidence((await opened.repositories.capabilities.getGraph(seeded.flightToolId))!);
      expect(flight.steps.some((step) => step.actor === 'ai')).toBe(false);
      expect(flight.flight?.before.winner).toBe('Dart');
      expect(flight.flight?.after.winner).toBe('Falcon');
      expect(flight.flight?.selected.trialId).toBe('trial_811');
      expect(flight.flight?.counterexample.trialId).toBe('trial_815');
    } finally { opened.close(); }
  });
  it('exports canonically, rejects cross-tool data, and keeps the copied mark after source deletion', async () => {
    const opened = await harness(adapter);
    try {
      const seeded = await seedKaleCapabilities(opened.repositories);
      const graph = (await opened.repositories.capabilities.getGraph(seeded.toolId))!;
      const first = await exportCapabilityGraph(graph);
      const shuffled = { ...graph, ledger: [...graph.ledger].reverse(), versions: [...graph.versions].reverse(), snapshots: [...graph.snapshots].reverse() };
      expect(canonicalJson(await exportCapabilityGraph(shuffled))).toBe(canonicalJson(first));
      expect(first.runs[0]?.provenance).toBe('recomputed_for_evidence');
      expect(first.documents[0]).toEqual(seeded.drawing);
      expect(first.snapshots).toHaveLength(1);
      await expect(exportCapabilityGraph({ ...graph, trials: [{ ...(await opened.repositories.trials.listByTool(seeded.flightToolId))[0]! }] })).rejects.toThrow(/another tool/);
      await opened.repositories.drawAssets.deleteDocument(seeded.drawing.documentId);
      const after = await buildCapabilityParentEvidence((await opened.repositories.capabilities.getGraph(seeded.toolId))!);
      expect(after.sourceMissing).toBe(true);
      expect(after.run.outputHash).toBe(first.runs[0]!.outputHash);
      expect(after.snapshot?.strokes).toEqual(first.snapshots[0]!.strokes);
      expect(after.exportGraph.documents).toEqual([]);
      await opened.repositories.tools.deleteToolGraph(seeded.toolId);
      expect(await opened.repositories.capabilities.getGraph(seeded.toolId)).toBeNull();
      expect(await opened.repositories.drawAssets.listMarkSnapshotsByTool(seeded.toolId)).toEqual([]);
    } finally { opened.close(); }
  });
  it('rolls back delete failure and deletes saved tools, drafts, words and artwork with the profile', async () => {
    const opened = await harness(adapter);
    try {
      const seeded = await seedKaleCapabilities(opened.repositories);
      const draftContext = { ...seeded.context, toolId: 'unfinished-draw-review' };
      await beginCapabilityReview(opened.repositories.capabilities, { context: draftContext, ownerChildId: seeded.ownerChildId, sourcePath: seeded.drawing.guidePath, childWords: 'Private unfinished words.', proposal: seeded.proposal, origin: 'manual', intentEventId: 'event_930', candidateEventId: 'event_931', occurredAt: '2026-10-01T00:00:00Z' });
      const before = canonicalJson(await opened.repositories.capabilities.getGraph(seeded.toolId));
      setFailAfterDeleteWrite(true);
      await expect(opened.repositories.profiles.deleteProfileGraph(seeded.ownerChildId)).rejects.toThrow(/injected/);
      expect(canonicalJson(await opened.repositories.capabilities.getGraph(seeded.toolId))).toBe(before);
      expect(await opened.repositories.capabilities.listEntriesByTool(draftContext.toolId)).toHaveLength(2);
      setFailAfterDeleteWrite(false);
      await opened.repositories.profiles.deleteProfileGraph(seeded.ownerChildId);
      expect(await opened.repositories.capabilities.listDefinitionsByOwner(seeded.ownerChildId)).toEqual([]);
      expect(await opened.repositories.capabilities.listEntriesByTool(draftContext.toolId)).toEqual([]);
      expect(await opened.repositories.drawAssets.listDocumentsByOwner(seeded.ownerChildId)).toEqual([]);
      expect(await opened.repositories.drawAssets.listMarkSnapshotsByTool(seeded.toolId)).toEqual([]);
      expect(await opened.repositories.trials.listByTool(seeded.flightToolId)).toEqual([]);
    } finally { opened.close(); }
  });
  it('keeps evidence selection ID-only, local, complete and unable to invent claims', async () => {
    const opened = await harness(adapter);
    try {
      const seeded = await seedKaleCapabilities(opened.repositories);
      const graph = (await opened.repositories.capabilities.getGraph(seeded.toolId))!;
      const projection = buildCapabilityEvidenceProjection(graph);
      const selection = selectCapabilityEvidence(projection);
      expect(JSON.stringify(projection)).not.toMatch(/Maya|Repeat my mark|points|strokes|color|readingBand/);
      expect(() => validateCapabilityEvidenceSelection(projection, selection)).not.toThrow();
      expect(() => validateCapabilityEvidenceSelection(projection, { evidenceEventIds: ['event_999', 'tool_version_910'] })).toThrow();
      expect(() => validateCapabilityEvidenceSelection(projection, { ...selection, text: 'Maya mastered geometry' })).toThrow();
      const result = await interpretCapabilityEvidenceSelection({ protocol: 'capability_evidence_v2', projection }, async () => selection);
      expect(result.status).toBe(200);
      expect((await interpretCapabilityEvidenceSelection({ protocol: 'capability_evidence_v2', projection, artwork: graph.snapshots }, async () => selection)).status).toBe(400);
      expect((await interpretCapabilityEvidenceSelection({ protocol: 'capability_evidence_v2', projection }, async () => ({ evidenceEventIds: ['event_999', 'tool_version_910'] }))).status).toBe(422);
    } finally { opened.close(); }
  });
  it('refuses corrupt or misattributed receipts rather than rendering a plausible story', async () => {
    const opened = await harness(adapter);
    try {
      const seeded = await seedKaleCapabilities(opened.repositories);
      const graph = (await opened.repositories.capabilities.getGraph(seeded.toolId))!;
      await expect(buildCapabilityParentEvidence({ ...graph, snapshots: [], documents: [] })).rejects.toThrow(/mark is missing/);
      await expect(buildCapabilityParentEvidence({ ...graph, snapshots: [...graph.snapshots, ...graph.snapshots] })).rejects.toThrow(/duplicate/);
      await expect(buildCapabilityParentEvidence({ ...graph, ledger: graph.ledger.map((entry) => entry.type === 'capability_candidate' ? { ...entry, actor: 'child' } : entry) })).rejects.toThrow(/attribution/);
      await expect(buildCapabilityParentEvidence({ ...graph, ledger: graph.ledger.map((entry) => entry.type === 'child_intent' ? { ...entry, ownerChildId: 'child_local_02' } : entry) })).rejects.toThrow(/another child/);
      await expect(buildCapabilityParentEvidence({ ...graph, ledger: graph.ledger.map((entry) => entry.type === 'child_intent' && entry.reviewedContext?.kind === 'draw_pattern' ? { ...entry, reviewedContext: { ...entry.reviewedContext, sourceRevision: 999 } } : entry) })).rejects.toThrow(/context receipt/);
      const flight = (await opened.repositories.capabilities.getGraph(seeded.flightToolId))!;
      await expect(buildCapabilityParentEvidence({ ...flight, trials: flight.trials.filter((trial) => trial.trialId !== 'trial_815') })).rejects.toThrow(/contrast/);
      const projection = buildCapabilityEvidenceProjection(graph);
      const selected = selectCapabilityEvidence(projection);
      expect(() => validateCapabilityEvidenceSelection(projection, { evidenceEventIds: selected.evidenceEventIds.filter((id) => id !== 'event_912') })).toThrow(/edit/);
    } finally { opened.close(); }
  });
  it('labels old source context honestly without rewriting older ledger bytes', async () => {
    const opened = await harness(adapter);
    try {
      const seeded = await seedKaleCapabilities(opened.repositories);
      const graph = (await opened.repositories.capabilities.getGraph(seeded.toolId))!;
      const ledger = graph.ledger.map((entry) => {
        if (entry.type !== 'child_intent') return entry;
        const { ownerChildId: _owner, reviewedContext: _context, sourcePath: _path, ...old } = entry;
        void _owner; void _context; void _path; return old;
      });
      expect((await buildCapabilityParentEvidence({ ...graph, ledger })).run.input.pathOrigin).toBe('current_source_path');
      const withoutSource = await buildCapabilityParentEvidence({ ...graph, ledger, documents: [] });
      expect(withoutSource.run.input.pathOrigin).toBe('inspection_example');
      expect(withoutSource.sourceMissing).toBe(true);
      expect((await opened.repositories.capabilities.getGraph(seeded.toolId))!.ledger).toEqual(graph.ledger);
    } finally { opened.close(); }
  });
  it('deletes pre-P9 ownerless unfinished reviews and pre-review practice trials, not another child’s draft', async () => {
    const opened = await harness(adapter);
    try {
      const seeded = await seedKaleCapabilities(opened.repositories);
      const template = (await opened.repositories.capabilities.listEntriesByTool(seeded.toolId))[0]!;
      if (template.type !== 'child_intent') throw new Error('fixture');
      const { ownerChildId: _owner, reviewedContext: _context, sourcePath: _path, ...old } = template;
      void _owner; void _context; void _path;
      await opened.repositories.capabilities.append({ ...old, toolId: 'old-unfinished-review', eventId: 'event_940', sequence: 1 });
      await opened.repositories.capabilities.append({ ...template, toolId: 'other-child-draft', ownerChildId: 'child_local_02', eventId: 'event_941', sequence: 1 });
      await opened.repositories.tools.deleteToolGraph(seeded.flightToolId);
      for (const trial of flightPracticeTrials()) await opened.repositories.trials.save(trial);
      await opened.repositories.profiles.deleteProfileGraph(seeded.ownerChildId);
      expect(await opened.repositories.capabilities.listEntriesByTool('old-unfinished-review')).toEqual([]);
      expect(await opened.repositories.capabilities.listEntriesByTool('other-child-draft')).toHaveLength(1);
      expect(await opened.repositories.trials.listByTool(seeded.flightToolId)).toEqual([]);
    } finally { opened.close(); }
  });
});
