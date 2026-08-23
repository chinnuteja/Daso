import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { createMemoryRepositories, openIndexedDbRepositories, persistGraph } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import {
  createOrReuseFork,
  ensureSecondChildProfile,
  loadRunner,
} from '../../src/ui/flows/runner';
import { DELETED_SOURCE_COPY } from '../../src/ui/copy/parent';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-77 — deleting Maya's source profile leaves Leo's independently owned fork.
 */

async function forkLeo(repositories: ReturnType<typeof createMemoryRepositories>) {
  await persistGraph(repositories, flightLabGraph());
  const leo = await ensureSecondChildProfile(repositories);
  return createOrReuseFork({
    repositories,
    ids: createSequentialIdFactory({ event: 15, tool_version: 2 }),
    clock: createFixedClock('2026-08-21T09:05:00Z'),
    sourceToolId: 'mayas-flight-lab',
    targetOwner: leo,
  });
}

describe('INV-77 — orphaned fork after source-profile deletion', () => {
  it('INV-77: memory delete of Maya leaves Leo ready with anonymous deleted-source lineage', async () => {
    const repositories = createMemoryRepositories();
    const fork = await forkLeo(repositories);
    const present = await loadRunner(repositories, fork.snapshot.definition.toolId, 'child_local_02');
    expect(present.status).toBe('ready');
    if (present.status === 'ready') {
      expect(present.view.sourceAuthor?.displayName).toBe('Maya');
      expect(present.view.sourceDeleted).toBe(false);
    }

    await repositories.profiles.deleteProfileGraph('child_local_01');
    expect(await repositories.tools.get('mayas-flight-lab')).toBeNull();
    expect(await repositories.profiles.get('child_local_01')).toBeNull();
    expect(await repositories.tools.get(fork.snapshot.definition.toolId)).not.toBeNull();

    const loaded = await loadRunner(repositories, fork.snapshot.definition.toolId, 'child_local_02');
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
    expect(loaded.view.owner.displayName).toBe('Leo');
    expect(loaded.view.sourceAuthor).toBeNull();
    expect(loaded.view.sourceDeleted).toBe(true);
    expect(loaded.view.tool.forkedFrom?.ownerChildId).toBe('child_local_01');
    expect(loaded.view.version.versionId).toBe(fork.snapshot.version.versionId);
    expect(JSON.stringify(loaded.view)).not.toMatch(/"displayName":"Maya"/u);
    expect(DELETED_SOURCE_COPY).toBe('Inherited from a profile that was deleted');
  });

  it('INV-77: IndexedDB reopen still has Leo and not Maya', async () => {
    const name = 'teach-daso-inv-77';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    const fork = await forkLeo(opened.repositories);
    await opened.repositories.profiles.deleteProfileGraph('child_local_01');
    opened.database.close();

    const reopened = await openIndexedDbRepositories(name);
    expect(await reopened.repositories.tools.get('mayas-flight-lab')).toBeNull();
    expect(await reopened.repositories.tools.get(fork.snapshot.definition.toolId)).not.toBeNull();
    const loaded = await loadRunner(
      reopened.repositories,
      fork.snapshot.definition.toolId,
      'child_local_02',
    );
    expect(loaded.status).toBe('ready');
    if (loaded.status === 'ready') {
      expect(loaded.view.sourceDeleted).toBe(true);
      expect(loaded.view.sourceAuthor).toBeNull();
    }
    reopened.database.close();
    await deleteDB(name);
  });
});
