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

const V1 = compileToolVersion(
  flightLabLedger.filter((entry) => entry.sequence <= 10),
  { versionId: 'tool_version_001', compiledAt: '2026-08-18T10:21:00Z' },
);

const V2 = compileToolVersion(flightLabLedger, {
  versionId: 'tool_version_002',
  compiledAt: '2026-08-18T10:31:00Z',
});

const DEFINITION_V1 = ToolDefinition.parse({
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
  await repositories.versions.saveAndActivate(V1, DEFINITION_V1);
  expect(await repositories.versions.get(V1.versionId)).not.toBeNull();
  expect((await repositories.tools.get(DEFINITION_V1.toolId))?.currentVersionId).toBe(V1.versionId);
}

async function assertInjectedFailureDuringV2(repositories: Repositories): Promise<void> {
  await repositories.versions.saveAndActivate(V1, DEFINITION_V1);
  setFailAfterVersionWrite(true);
  await expect(
    repositories.versions.saveAndActivate(V2, {
      ...DEFINITION_V1,
      currentVersionId: V2.versionId,
    }),
  ).rejects.toThrow(/injected compilation failure/u);
  expect((await repositories.tools.get(DEFINITION_V1.toolId))?.currentVersionId).toBe(V1.versionId);
  expect(await repositories.versions.get(V1.versionId)).not.toBeNull();
  expect(await repositories.versions.get(V2.versionId)).toBeNull();
  setFailAfterVersionWrite(false);
}

async function assertDuplicate(repositories: Repositories): Promise<void> {
  await repositories.versions.saveAndActivate(V1, DEFINITION_V1);
  await expect(repositories.versions.saveAndActivate(V1, DEFINITION_V1)).rejects.toBeInstanceOf(
    PersistenceError,
  );
  expect((await repositories.tools.get(DEFINITION_V1.toolId))?.currentVersionId).toBe(V1.versionId);
}

describe('INV-57 — atomic compilation commit', () => {
  it('INV-57: memory commit, v2 injected failure, and duplicate leave v1 active', async () => {
    await assertAtomic(createMemoryRepositories());
    await assertInjectedFailureDuringV2(createMemoryRepositories());
    await assertDuplicate(createMemoryRepositories());
  });

  it('INV-57: IndexedDB commit, v2 injected failure, and duplicate leave v1 active', async () => {
    const name = 'teach-daso-inv-57';
    await deleteDB(name);
    const first = await openIndexedDbRepositories(name);
    await assertAtomic(first.repositories);
    first.database.close();

    await deleteDB(name);
    const second = await openIndexedDbRepositories(name);
    await assertInjectedFailureDuringV2(second.repositories);
    second.database.close();

    await deleteDB(name);
    const third = await openIndexedDbRepositories(name);
    await assertDuplicate(third.repositories);
    third.database.close();
    await deleteDB(name);
  });
});
