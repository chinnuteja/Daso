import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import {
  createMemoryRepositories,
  openIndexedDbRepositories,
  persistGraph,
  setFailAfterForkWrite,
} from '../../src/adapters/persistence';
import { buildForkSnapshot } from '../../src/core/reuse';
import type { Repositories } from '../../src/core/ports/repositories';
import { EventId } from '../../src/core/schema/primitives';
import { LEO_PROFILE } from '../../src/ui/flows/runner/secondChild';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { mayaGraphCanonical } from '../support/mayaGraph';

/**
 * INV-67 — atomic fork success and rollback against memory and IndexedDB.
 */

afterEach(() => {
  setFailAfterForkWrite(false);
});

function snapshotFromGraph() {
  const graph = flightLabGraph();
  const source = graph.tools[0];
  const version = graph.versions[1];
  if (source === undefined || version === undefined) {
    throw new Error('fixture missing');
  }
  return {
    graph,
    source,
    snapshot: buildForkSnapshot({
      sourceDefinition: source,
      sourceVersion: version,
      sourceLedger: graph.entries,
      targetToolId: 'mayas-flight-lab-copy',
      targetOwnerChildId: LEO_PROFILE.childId,
      targetDisplayName: "Leo's copy of Maya's Flight Lab",
      replacementEventIds: graph.entries.map((_, index) =>
        EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
      ),
      targetVersionId: 'tool_version_200',
      forkedAt: '2026-08-21T09:05:00Z',
    }),
  };
}

async function seed(repositories: Repositories): Promise<string> {
  const graph = flightLabGraph();
  await persistGraph(repositories, graph);
  await repositories.profiles.save(LEO_PROFILE);
  return mayaGraphCanonical(repositories);
}

describe('INV-67 — atomic fork commit', () => {
  it('INV-67: memory success writes one target graph; injected failure writes nothing', async () => {
    const first = createMemoryRepositories();
    const before = await seed(first);
    const { snapshot } = snapshotFromGraph();
    await first.versions.saveForkSnapshot(snapshot);
    expect((await first.tools.get(snapshot.definition.toolId))?.ownerChildId).toBe(LEO_PROFILE.childId);
    expect(await mayaGraphCanonical(first)).toBe(before);

    const second = createMemoryRepositories();
    const beforeFail = await seed(second);
    setFailAfterForkWrite(true);
    await expect(second.versions.saveForkSnapshot(snapshot)).rejects.toThrow(/injected fork failure/u);
    expect(await second.tools.get(snapshot.definition.toolId)).toBeNull();
    expect(await second.versions.get(snapshot.version.versionId)).toBeNull();
    expect(await second.ledger.listByTool(snapshot.definition.toolId)).toEqual([]);
    expect(await mayaGraphCanonical(second)).toBe(beforeFail);
  });

  it('INV-67: IndexedDB success and injected failure match memory', async () => {
    const name = 'teach-daso-inv-67';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    const before = await seed(opened.repositories);
    const { snapshot } = snapshotFromGraph();
    await opened.repositories.versions.saveForkSnapshot(snapshot);
    expect(await opened.repositories.tools.get(snapshot.definition.toolId)).not.toBeNull();
    expect(await mayaGraphCanonical(opened.repositories)).toBe(before);
    opened.database.close();

    await deleteDB(name);
    const failing = await openIndexedDbRepositories(name);
    const beforeFail = await seed(failing.repositories);
    setFailAfterForkWrite(true);
    await expect(failing.repositories.versions.saveForkSnapshot(snapshot)).rejects.toThrow(
      /injected fork failure/u,
    );
    expect(await failing.repositories.tools.get(snapshot.definition.toolId)).toBeNull();
    expect(await mayaGraphCanonical(failing.repositories)).toBe(beforeFail);
    failing.database.close();
    await deleteDB(name);
  });
});
