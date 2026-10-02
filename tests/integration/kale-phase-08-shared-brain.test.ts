import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteDB, openDB } from 'idb';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { createMemoryPersistence, openIndexedDbRepositories, setFailAfterCapabilityWrite } from '../../src/adapters/persistence';
import { beginCapabilityReview, buildDrawApprovalBundle, buildFlightApprovalBundle, flightContext, groundFlightInterpretation, replayFlightCapability, recordFlightObservation, buildTeachingRequestV2, FLIGHT_PROPOSAL } from '../../src/core/capability';
import { flightPracticeTrials, FLIGHT_PRACTICE_TOOL_ID } from '../../src/core/capability/flightPractice';
import type { CapabilityLedgerEntry } from '../../src/core/capability/ledger';
import type { CapabilityTeachingContext } from '../../src/core/capability/types';
import type { Repositories } from '../../src/core/ports/repositories';
import { createDrawDocument, setMarkSelection, setGuidePath, withDrawSourceDigest } from '../../src/core/draw';
import { interpretCapabilityIntent } from '../../src/app/api/agents/teaching/route';

const names: string[] = [];
afterEach(async () => { setFailAfterCapabilityWrite(false); for (const name of names.splice(0)) await deleteDB(name); vi.unstubAllGlobals(); });
async function harness(kind: 'memory' | 'idb' | 'idb-v1') {
  if (kind === 'memory') return { repositories: createMemoryPersistence().repositories, close: () => undefined };
  const name = `kale-phase-08-${names.length}`; names.push(name);
  if (kind === 'idb-v1') {
    const legacy = await openDB(name, 1, { upgrade(db) {
      for (const [store, key, index] of [['childProfiles', 'childId', ''], ['tools', 'toolId', 'ownerChildId'], ['toolVersions', 'versionId', 'toolId'], ['ledgerEntries', 'eventId', 'toolId'], ['trials', 'trialId', 'toolId'], ['grants', 'grantId', 'toolId'], ['summaries', 'summaryId', 'toolId'], ['meta', 'key', '']] as const) {
        const created = db.createObjectStore(store, { keyPath: key });
        if (index) created.createIndex(index, index);
        if (store === 'ledgerEntries') created.createIndex('toolIdSequence', ['toolId', 'sequence'], { unique: true });
      }
    } });
    const graph = flightLabGraph();
    await legacy.put('childProfiles', graph.profile);
    for (const [store, rows] of [['tools', graph.tools], ['toolVersions', graph.versions], ['ledgerEntries', graph.entries], ['trials', graph.trials], ['grants', graph.grants], ['summaries', graph.summaries]] as const) for (const row of rows) await legacy.put(store, row);
    legacy.close();
  }
  const opened = await openIndexedDbRepositories(name);
  if (kind === 'idb-v1') {
    const graph = flightLabGraph();
    expect(await opened.repositories.tools.listByOwner(graph.profile.childId)).toEqual(graph.tools);
    expect(await opened.repositories.versions.listByTool(graph.tools[0]!.toolId)).toEqual(graph.versions);
    expect(await opened.repositories.ledger.listByTool(graph.tools[0]!.toolId)).toEqual(graph.entries);
    expect(await opened.repositories.trials.listByTool(graph.tools[0]!.toolId)).toEqual(graph.trials);
  }
  return { repositories: opened.repositories, close: () => opened.database.close(), name };
}
async function prepare(repositories: Repositories, kind: 'draw_pattern' | 'flight_validity') {
  let context: CapabilityTeachingContext;
  let drawing;
  const trials = flightPracticeTrials();
  if (kind === 'flight_validity') {
    for (const trial of trials) await repositories.trials.save(trial);
    context = flightContext({ toolId: FLIGHT_PRACTICE_TOOL_ID, activeVersionId: null, ledgerSequence: 0, trial: trials[1]!, counterexample: trials[5]! });
  } else {
    drawing = await withDrawSourceDigest(createDrawDocument({ documentId: 'draw_document_test_808', ownerChildId: 'child_local_01', now: '2026-10-01T00:00:00Z', strokes: [{ strokeId: 'stroke_test_808', color: '#005544', width: 5, points: [{ x: 20, y: 20 }, { x: 40, y: 30 }] }] }));
    drawing = setGuidePath(setMarkSelection(drawing, ['stroke_test_808'], '2026-10-01T00:00:00Z'), { pathId: 'draw_path_808', points: [{ x: 100, y: 100 }, { x: 300, y: 140 }] }, '2026-10-01T00:00:00Z');
    await repositories.drawAssets.saveDocument(drawing);
    context = { toolId: 'my-draw-test', kind, activeVersionId: null, ledgerSequence: 0, sourceDocumentId: drawing.documentId, sourceRevision: drawing.revision, selectedMarkSnapshotId: 'mark_snapshot_808', guidePathId: drawing.guidePath!.pathId, guidePathRevision: drawing.guidePath!.revision };
  }
  const proposal = kind === 'flight_validity' ? FLIGHT_PROPOSAL : { type: 'propose_capability' as const, kind: 'draw_pattern' as const, operation: 'repeat_selected_mark' as const, spacing: 'even' as const, sizeProfile: 'constant' as const };
  const entries = await beginCapabilityReview(repositories.capabilities, { context, ownerChildId: 'child_local_01', childWords: kind === 'flight_validity' ? "That throw shouldn't count because it hit the chair." : 'Repeat my mark along this path.', proposal, origin: 'model', intentEventId: 'event_808', candidateEventId: 'event_809', occurredAt: '2026-10-01T00:00:00Z' });
  const approval: CapabilityLedgerEntry = { type: 'child_approval', actor: 'child', toolId: context.toolId, eventId: 'event_810', candidateEventId: 'event_809', sequence: 3, occurredAt: '2026-10-01T00:00:00Z', approvedProposal: proposal, idempotencyKey: 'phase_08_save' };
  const bundle = context.kind === 'flight_validity' ? await buildFlightApprovalBundle({ context, entries, approval, ownerChildId: 'child_local_01', displayName: 'Fair throws', versionId: 'tool_version_808', version: 1, createdAt: '2026-10-01T00:00:00Z' }) : { ...await buildDrawApprovalBundle({ drawing: drawing!, toolId: context.toolId, ownerChildId: 'child_local_01', displayName: 'My marks', existingVersionCount: 0, snapshotId: 'mark_snapshot_808', versionId: 'tool_version_808', approvalEvent: approval, entries, reviewedContext: context, createdAt: '2026-10-01T00:00:00Z' }), approval, reviewedContext: context };
  return { bundle, trials, context };
}

describe.each(['memory', 'idb', 'idb-v1'] as const)('Phase 8 shared authority in %s', (adapter) => {
  it.each(['draw_pattern', 'flight_validity'] as const)('uses shared ordering, commit and idempotency for %s', async (kind) => {
    const opened = await harness(adapter);
    try {
      const { bundle } = await prepare(opened.repositories, kind);
      await expect(opened.repositories.capabilities.commitApprovedCapability({ ...bundle, reviewedContext: undefined } as unknown as Parameters<typeof opened.repositories.capabilities.commitApprovedCapability>[0])).rejects.toThrow(/reviewed source/);
      const first = await opened.repositories.capabilities.commitApprovedCapability(bundle);
      expect(await opened.repositories.capabilities.commitApprovedCapability(bundle)).toEqual(first);
      expect((await opened.repositories.capabilities.listEntriesByTool(bundle.definition.toolId)).map((entry) => entry.type)).toEqual(['child_intent', 'capability_candidate', 'child_approval']);
      await expect(opened.repositories.capabilities.commitApprovedCapability({ ...bundle, approval: { ...bundle.approval, actor: 'ai' } as unknown as CapabilityLedgerEntry })).rejects.toThrow();
    } finally { opened.close(); }
  });
  it.each(['draw_pattern', 'flight_validity'] as const)('rejects stale source for %s without activating', async (kind) => {
    const opened = await harness(adapter);
    try {
      const { bundle, trials, context } = await prepare(opened.repositories, kind);
      if (context.kind === 'flight_validity') await opened.repositories.trials.save({ ...trials[1]!, obstruction: false });
      else {
        const document = await opened.repositories.drawAssets.getDocument(context.sourceDocumentId);
        await opened.repositories.drawAssets.saveDocument({ ...document!, revision: document!.revision + 1 });
      }
      await expect(opened.repositories.capabilities.commitApprovedCapability(bundle)).rejects.toThrow(/changed/i);
      expect(await opened.repositories.capabilities.getDefinition(context.toolId)).toBeNull();
      expect((await opened.repositories.capabilities.listEntriesByTool(context.toolId))).toHaveLength(2);
    } finally { opened.close(); }
  });
  it('rolls back interrupted Flight activation and reopens saved replay with no network', async () => {
    let opened = await harness(adapter);
    try {
      const { bundle, trials } = await prepare(opened.repositories, 'flight_validity');
      setFailAfterCapabilityWrite(true);
      await expect(opened.repositories.capabilities.commitApprovedCapability(bundle)).rejects.toThrow(/injected/);
      expect(await opened.repositories.capabilities.getDefinition(FLIGHT_PRACTICE_TOOL_ID)).toBeNull();
      expect(await opened.repositories.capabilities.getVersion('tool_version_808')).toBeNull();
      setFailAfterCapabilityWrite(false);
      const saved = await opened.repositories.capabilities.commitApprovedCapability(bundle);
      if (saved.kind !== 'flight_validity') throw new Error('wrong kind');
      const expected = replayFlightCapability(FLIGHT_PRACTICE_TOOL_ID, trials, saved);
      if ('name' in opened && typeof opened.name === 'string') {
        const name = opened.name; opened.close(); const reopened = await openIndexedDbRepositories(name); opened = { repositories: reopened.repositories, close: () => reopened.database.close(), name };
      }
      const offlineFetch = vi.fn(() => { throw new Error('network disabled'); }); vi.stubGlobal('fetch', offlineFetch);
      const loaded = await opened.repositories.capabilities.getVersion('tool_version_808');
      if (loaded?.kind !== 'flight_validity') throw new Error('missing saved rule');
      const observations = await opened.repositories.trials.listByTool(FLIGHT_PRACTICE_TOOL_ID);
      expect(replayFlightCapability(FLIGHT_PRACTICE_TOOL_ID, observations, loaded)).toEqual(expected);
      expect(offlineFetch).not.toHaveBeenCalled();
      expect(expected.winner).toBe('Falcon');
      expect(expected.projections.find((item) => item.trialId === 'trial_811')?.validUnderCurrentVersion).toBe(false);
      expect(expected.projections.find((item) => item.trialId === 'trial_815')?.validUnderCurrentVersion).toBe(true);
      expect(observations).toEqual(trials);
    } finally { opened.close(); }
  });
  it('captures facts against the stored active version, with no model access', async () => {
    const opened = await harness(adapter);
    try {
      const facts = { toolId: FLIGHT_PRACTICE_TOOL_ID, trialId: 'trial_899', designName: 'New throw', distanceM: 8.9, obstruction: true, createdAt: '2026-10-01T00:00:00Z' };
      await expect(recordFlightObservation(opened.repositories, facts)).rejects.toThrow(/save a flight rule/i);
      const { bundle } = await prepare(opened.repositories, 'flight_validity');
      const saved = await opened.repositories.capabilities.commitApprovedCapability(bundle);
      const offlineFetch = vi.fn(() => { throw new Error('network disabled'); }); vi.stubGlobal('fetch', offlineFetch);
      await recordFlightObservation(opened.repositories, facts);
      const recorded = await opened.repositories.trials.get('trial_899');
      expect(recorded?.toolVersionIdAtCapture).toBe(saved.versionId);
      expect(recorded?.obstruction).toBe(true);
      if (saved.kind !== 'flight_validity') throw new Error('wrong kind');
      expect(replayFlightCapability(FLIGHT_PRACTICE_TOOL_ID, [recorded!], saved).projections[0]?.validUnderCurrentVersion).toBe(false);
      expect(offlineFetch).not.toHaveBeenCalled();
    } finally { opened.close(); }
  });
  it('rejects a different mark snapshot than the one reviewed', async () => {
    const opened = await harness(adapter);
    try {
      const { bundle } = await prepare(opened.repositories, 'draw_pattern');
      if (bundle.version.kind !== 'draw_pattern' || bundle.snapshot === undefined) throw new Error('wrong kind');
      const changed = { ...bundle, snapshot: { ...bundle.snapshot, snapshotId: 'mark_snapshot_899' }, version: { ...bundle.version, markSnapshotId: 'mark_snapshot_899' } };
      await expect(opened.repositories.capabilities.commitApprovedCapability(changed)).rejects.toThrow(/not the mark/);
      expect(await opened.repositories.capabilities.getDefinition(bundle.definition.toolId)).toBeNull();
    } finally { opened.close(); }
  });
});

describe('Flight meaning and closed model boundary', () => {
  const trials = flightPracticeTrials();
  const context = flightContext({ toolId: FLIGHT_PRACTICE_TOOL_ID, activeVersionId: null, ledgerSequence: 0, trial: trials[1]!, counterexample: trials[5]! });
  it('ties the child’s chair reason to obstruction and preserves the same-distance counterexample', async () => {
    const request = await buildTeachingRequestV2("That throw shouldn't count because it hit the chair.", context);
    expect(groundFlightInterpretation(request, FLIGHT_PROPOSAL)).toEqual({ ok: true, proposal: FLIGHT_PROPOSAL, quote: 'hit the chair' });
    expect(groundFlightInterpretation(await buildTeachingRequestV2("That 8.9m throw shouldn't count.", context), FLIGHT_PROPOSAL).ok).toBe(false);
    expect(groundFlightInterpretation(await buildTeachingRequestV2("It hit the chair after landing, so it shouldn't count.", context), FLIGHT_PROPOSAL).ok).toBe(false);
    expect(groundFlightInterpretation(await buildTeachingRequestV2("It didn't hit the chair but shouldn't count.", context), FLIGHT_PROPOSAL).ok).toBe(false);
    expect(groundFlightInterpretation(await buildTeachingRequestV2("It hit the chair but shouldn't be excluded.", context), FLIGHT_PROPOSAL).ok).toBe(false);
    expect(groundFlightInterpretation(await buildTeachingRequestV2("Don't ignore the throw that hit the chair.", context), FLIGHT_PROPOSAL).ok).toBe(false);
    expect(groundFlightInterpretation(await buildTeachingRequestV2("It wasn't obstructed and shouldn't count.", context), FLIGHT_PROPOSAL).ok).toBe(false);
    const clear = { ...context, selectedTrial: { ...context.selectedTrial, obstruction: false } };
    expect(groundFlightInterpretation(await buildTeachingRequestV2("It hit the chair so it shouldn't count.", clear), FLIGHT_PROPOSAL).ok).toBe(false);
    const response = await interpretCapabilityIntent({ protocol: 'capability_v2', request }, async () => ({ ...FLIGHT_PROPOSAL, predicate: { distance: 8.9 } }));
    expect(response.status).toBe(422);
  });
});
