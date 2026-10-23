import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteDB } from 'idb';
import { createMemoryPersistence, openIndexedDbRepositories } from '../../src/adapters/persistence';
import { appendToolApplication, renderToolApplications } from '../../src/core/draw/applications';
import { appendStroke, digestDrawSource } from '../../src/core/draw/document';
import { DrawDocument } from '../../src/core/draw/schema';
import { DrawWriteQueue } from '../../src/ui/draw/DrawWriteQueue';
import { seedKaleCapabilities } from '../support/kaleCapabilityGraph';
import type { CapabilityGraph } from '../../src/core/capability/graph';
import { assertCapabilityGraph } from '../../src/core/capability/graph';
import { MAX_PREVIEW_POINTS } from '../../src/core/draw/preview';

const names: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const name of names.splice(0)) await deleteDB(name); });
const time = '2026-10-23T10:00:00Z';
const application = (toolId: string, id = 'one') => ({ applicationId: `draw_application_${id}`, toolId, versionId: 'tool_version_910', path: [{ x: 100, y: 150 }, { x: 500, y: 250 }], createdAt: time });
const savedToolRecords = (graph: CapabilityGraph) => ({ tool: graph.tool, versions: graph.versions, ledger: graph.ledger, snapshots: graph.snapshots });

describe('saved tools become part of a picture', () => {
  for (const kind of ['memory', 'indexeddb']) {
    it(`${kind}: keeps multiple trails across reload without changing original marks or approving a new version`, async () => {
      const name = `picture-${crypto.randomUUID()}`;
      if (kind === 'indexeddb') names.push(name);
      const opened = kind === 'indexeddb' ? await openIndexedDbRepositories(name) : null;
      const repo = opened?.repositories ?? createMemoryPersistence().repositories;
      try {
        const { toolId, drawing } = await seedKaleCapabilities(repo);
        const graph = (await repo.capabilities.getGraph(toolId))!;
        const immutable = savedToolRecords(graph);
        const writer = new DrawWriteQueue(repo.drawAssets); await writer.track(drawing, drawing.ownerChildId);
        const first = appendToolApplication(drawing, application(toolId));
        const second = appendToolApplication(first, { ...application(toolId, 'two'), path: [{ x: 150, y: 300 }, { x: 550, y: 400 }] });
        await writer.write(second);
        const loaded = (await repo.drawAssets.getDocument(drawing.documentId))!;
        expect(loaded.applications).toHaveLength(2);
        expect(loaded.strokes).toEqual(drawing.strokes);
        expect(await digestDrawSource(loaded)).toBe(drawing.contentDigest);
        const rendered = renderToolApplications(loaded, new Map([[toolId, graph]]));
        expect(rendered.unavailable).toEqual([]);
        expect(rendered.strokes.length).toBeGreaterThan(1);
        expect(new Set(rendered.strokes.map(item => item.previewStrokeId)).size).toBe(rendered.strokes.length);
        expect(renderToolApplications(loaded, new Map([[toolId, graph]]))).toEqual(rendered);
        expect(savedToolRecords((await repo.capabilities.getGraph(toolId))!)).toEqual(immutable);

        const moreDrawing = appendStroke(loaded, { strokeId: 'stroke_added_by_child', color: '#123456', width: 5, points: [{ x: 20, y: 80 }, { x: 100, y: 100 }] }, time);
        await writer.write(moreDrawing);
        expect((await repo.drawAssets.getDocument(drawing.documentId))?.strokes).toHaveLength(drawing.strokes.length + 1);
        expect(renderToolApplications(moreDrawing, new Map([[toolId, graph]]))).toEqual(rendered);
        expect(savedToolRecords((await repo.capabilities.getGraph(toolId))!)).toEqual(immutable);

        await repo.tools.deleteToolGraph(toolId);
        const afterDelete = (await repo.drawAssets.getDocument(drawing.documentId))!;
        const hidden = renderToolApplications(afterDelete, new Map());
        expect(hidden.strokes).toEqual([]);
        expect(hidden.unavailable).toHaveLength(2);
        expect(afterDelete.strokes).toEqual(moreDrawing.strokes);
        expect(JSON.stringify(afterDelete.applications)).not.toContain('stroke_910');
      } finally { opened?.database.close(); }
    });
  }
  it('rejects duplicate trails and too many stored paths; an unapproved version cannot render', async () => {
    const repo = createMemoryPersistence().repositories;
    const { drawing, toolId } = await seedKaleCapabilities(repo);
    const first = appendToolApplication(drawing, application(toolId));
    expect(() => appendToolApplication(first, application(toolId))).toThrow();
    expect(() => DrawDocument.parse({ ...drawing, applications: Array.from({ length: 25 }, (_, i) => application(toolId, String(i))) })).toThrow();
    const graph = (await repo.capabilities.getGraph(toolId))!;
    const invalid = appendToolApplication(drawing, { ...application(toolId), versionId: 'tool_version_999' });
    expect(renderToolApplications(invalid, new Map([[toolId, graph]])).unavailable).toEqual(['draw_application_one']);
  });
  it('pins earlier artwork to its approved version even when a later approved version exists, with zero network access', async () => {
    const repo = createMemoryPersistence().repositories;
    const { toolId, drawing } = await seedKaleCapabilities(repo);
    const graph = (await repo.capabilities.getGraph(toolId))!;
    const used = appendToolApplication(drawing, application(toolId));
    const expected = renderToolApplications(used, new Map([[toolId, graph]]));
    const intent = graph.ledger[0]!, candidate = graph.ledger[1]!, firstVersion = graph.versions[0]!;
    if (intent.type !== 'child_intent' || candidate.type !== 'capability_candidate' || firstVersion.kind !== 'draw_pattern') throw new Error('bad fixture');
    const proposal = { type: 'propose_capability' as const, kind: 'draw_pattern' as const, operation: 'repeat_selected_mark' as const, spacing: 'close' as const, sizeProfile: 'constant' as const };
    const second = assertCapabilityGraph({ ...graph,
      tool: { ...graph.tool, currentVersionId: 'tool_version_911' },
      ledger: [...graph.ledger,
        { ...intent, eventId: 'event_914', sequence: 5 },
        { ...candidate, eventId: 'event_915', sequence: 6, sourceIntentEventId: 'event_914', proposal },
        { type: 'child_approval', actor: 'child', toolId, eventId: 'event_916', sequence: 7, occurredAt: time, candidateEventId: 'event_915', approvedProposal: proposal, idempotencyKey: 'second_picture_version' }],
      versions: [...graph.versions, { ...firstVersion, version: 2, versionId: 'tool_version_911', controls: { ...firstVersion.controls, spacing: 36 }, metadata: { ...firstVersion.metadata, approvalEventId: 'event_916', sourceEventIds: [...graph.ledger.map(entry => entry.eventId), 'event_914', 'event_915'] } }],
    });
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No model or network allowed'));
    expect(renderToolApplications(used, new Map([[toolId, second]]))).toEqual(expected);
    const newer = appendToolApplication(drawing, { ...application(toolId), versionId: 'tool_version_911' });
    expect(renderToolApplications(newer, new Map([[toolId, second]])).strokes.length).toBeGreaterThan(expected.strokes.length);
    expect(network).not.toHaveBeenCalled();
    const mismatched = appendToolApplication(drawing, { ...application('wrong-tool') });
    expect(renderToolApplications(mismatched, new Map([['wrong-tool', graph]]))).toEqual({ strokes: [], pointCount: 0, unavailable: ['draw_application_one'] });
  });
  it('bounds the combined output of multiple individually valid trails', async () => {
    const repo = createMemoryPersistence().repositories;
    const { drawing, toolId } = await seedKaleCapabilities(repo);
    const graph = (await repo.capabilities.getGraph(toolId))!;
    // A detailed but individually legal saved mark. Two 9-placement trails exceed the total budget.
    graph.snapshots[0]!.strokes[0]!.points = Array.from({ length: 2048 }, (_, i) => ({ x: 20 + i / 100, y: 20 + i % 2 }));
    const path = [{ x: 100, y: 100 }, { x: 850, y: 100 }];
    const one = appendToolApplication(drawing, { ...application(toolId), path });
    const two = appendToolApplication(one, { ...application(toolId, 'two'), path });
    const result = renderToolApplications(two, new Map([[toolId, graph]]));
    expect(result.pointCount).toBeGreaterThan(0);
    expect(result.pointCount).toBeLessThanOrEqual(MAX_PREVIEW_POINTS);
    expect(result.unavailable).toEqual(['draw_application_two']);
  });
});
