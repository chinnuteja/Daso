import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import {
  createMemoryRepositories,
  openIndexedDbRepositories,
  persistGraph,
  setFailAfterDeleteWrite,
} from '../../src/adapters/persistence';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import type { Repositories } from '../../src/core/ports/repositories';
import { flightLabGraph, otherToolGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-76 — tool and profile delete are failure-atomic and idempotent.
 */

afterEach(() => {
  setFailAfterDeleteWrite(false);
});

async function graphBytes(repositories: Repositories, toolId: string): Promise<string> {
  return canonicalJson({
    tool: await repositories.tools.get(toolId),
    versions: await repositories.versions.listByTool(toolId),
    ledger: await repositories.ledger.listByTool(toolId),
    trials: await repositories.trials.listByTool(toolId),
    grants: await repositories.grants.listByTool(toolId),
    summaries: await repositories.summaries.listByTool(toolId),
  });
}

async function assertInjectedFailure(repositories: Repositories): Promise<void> {
  await persistGraph(repositories, flightLabGraph());
  await persistGraph(repositories, otherToolGraph());
  const beforeMaya = await graphBytes(repositories, 'mayas-flight-lab');
  const beforeOther = await graphBytes(repositories, 'other-paper-lab');
  const beforeProfile = canonicalJson(await repositories.profiles.get('child_local_01'));
  setFailAfterDeleteWrite(true);
  await expect(repositories.tools.deleteToolGraph('mayas-flight-lab')).rejects.toThrow(
    /injected delete failure/u,
  );
  expect(await graphBytes(repositories, 'mayas-flight-lab')).toBe(beforeMaya);
  expect(await graphBytes(repositories, 'other-paper-lab')).toBe(beforeOther);
  expect(canonicalJson(await repositories.profiles.get('child_local_01'))).toBe(beforeProfile);
  setFailAfterDeleteWrite(false);
  await repositories.tools.deleteToolGraph('mayas-flight-lab');
  expect(await repositories.tools.get('mayas-flight-lab')).toBeNull();
  expect(await repositories.versions.listByTool('mayas-flight-lab')).toEqual([]);
  expect(await graphBytes(repositories, 'other-paper-lab')).toBe(beforeOther);
  await repositories.tools.deleteToolGraph('mayas-flight-lab');

  await persistGraph(repositories, flightLabGraph());
  const beforeRetry = await graphBytes(repositories, 'mayas-flight-lab');
  setFailAfterDeleteWrite(true);
  await expect(repositories.profiles.deleteProfileGraph('child_local_01')).rejects.toThrow(
    /injected delete failure/u,
  );
  expect(await graphBytes(repositories, 'mayas-flight-lab')).toBe(beforeRetry);
  expect(await repositories.profiles.get('child_local_01')).not.toBeNull();
  setFailAfterDeleteWrite(false);
  await repositories.profiles.deleteProfileGraph('child_local_01');
  expect(await repositories.profiles.get('child_local_01')).toBeNull();
  expect(await repositories.tools.get('mayas-flight-lab')).toBeNull();
  await repositories.profiles.deleteProfileGraph('child_local_01');
}

describe('INV-76 — atomic delete', () => {
  it('INV-76: memory injected failure leaves canonical bytes unchanged, then retry succeeds', async () => {
    await assertInjectedFailure(createMemoryRepositories());
  });

  it('INV-76: IndexedDB injected failure leaves canonical bytes unchanged, then retry succeeds', async () => {
    const name = 'teach-daso-inv-76';
    await deleteDB(name);
    const { repositories, database } = await openIndexedDbRepositories(name);
    await assertInjectedFailure(repositories);
    database.close();
    await deleteDB(name);
  });
});
