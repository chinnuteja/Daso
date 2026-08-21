import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import {
  createMemoryRepositories,
  openIndexedDbRepositories,
  setFailAfterVersionWrite,
} from '../../src/adapters/persistence';
import { PersistenceError } from '../../src/adapters/persistence/database';
import { compileToolVersion } from '../../src/core/compiler';
import type { Repositories } from '../../src/core/ports/repositories';
import { ToolDefinition } from '../../src/core/schema/toolDefinition';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-57 — atomic compilation commit against memory and IndexedDB.
 */

const VERSION = compileToolVersion(
  flightLabLedger.filter((entry) => entry.sequence <= 10),
  { versionId: 'tool_version_001', compiledAt: '2026-08-18T10:21:00Z' },
);

const DEFINITION = ToolDefinition.parse({
  toolId: 'mayas-flight-lab',
  ownerChildId: 'child_local_01',
  displayName: "Maya's Flight Lab",
  kind: 'experiment_comparator',
  currentVersionId: 'tool_version_001',
  createdAt: '2026-08-18T10:21:00Z',
});

afterEach(() => {
  setFailAfterVersionWrite(false);
});

async function assertAtomic(repositories: Repositories): Promise<void> {
  await repositories.versions.saveAndActivate(VERSION, DEFINITION);
  expect(await repositories.versions.get(VERSION.versionId)).not.toBeNull();
  expect((await repositories.tools.get(DEFINITION.toolId))?.currentVersionId).toBe(VERSION.versionId);
}

async function assertInjectedFailure(repositories: Repositories): Promise<void> {
  setFailAfterVersionWrite(true);
  await expect(repositories.versions.saveAndActivate(VERSION, DEFINITION)).rejects.toThrow(
    /injected compilation failure/u,
  );
  expect(await repositories.versions.get(VERSION.versionId)).toBeNull();
  expect(await repositories.tools.get(DEFINITION.toolId)).toBeNull();
  setFailAfterVersionWrite(false);
}

async function assertDuplicate(repositories: Repositories): Promise<void> {
  await repositories.versions.saveAndActivate(VERSION, DEFINITION);
  await expect(repositories.versions.saveAndActivate(VERSION, DEFINITION)).rejects.toBeInstanceOf(
    PersistenceError,
  );
  expect((await repositories.tools.get(DEFINITION.toolId))?.currentVersionId).toBe(VERSION.versionId);
}

describe('INV-57 — atomic compilation commit', () => {
  it('INV-57: memory commit, injected failure, and duplicate leave no partial version', async () => {
    await assertAtomic(createMemoryRepositories());
    await assertInjectedFailure(createMemoryRepositories());
    await assertDuplicate(createMemoryRepositories());
  });

  it('INV-57: IndexedDB commit, injected failure, and duplicate leave no partial version', async () => {
    const name = 'teach-daso-inv-57';
    await deleteDB(name);
    const first = await openIndexedDbRepositories(name);
    await assertAtomic(first.repositories);
    first.database.close();

    await deleteDB(name);
    const second = await openIndexedDbRepositories(name);
    await assertInjectedFailure(second.repositories);
    second.database.close();

    await deleteDB(name);
    const third = await openIndexedDbRepositories(name);
    await assertDuplicate(third.repositories);
    third.database.close();
    await deleteDB(name);
  });
});
