import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import {
  createMemoryRepositories,
  openIndexedDbRepositories,
  persistGraph,
  STORE,
} from '../../src/adapters/persistence';
import { ChildProfile } from '../../src/core/schema/childProfile';
import { ExperimentTrial } from '../../src/core/schema/experimentTrial';
import { LedgerEntry } from '../../src/core/ledger/types';
import { ParentSummary } from '../../src/core/schema/parentSummary';
import { PermissionGrant } from '../../src/core/schema/permissionGrant';
import { ToolDefinition } from '../../src/core/schema/toolDefinition';
import { ToolVersion } from '../../src/core/schema/toolVersion';
import { flightLabGraph, otherToolGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-25 — coordinated tool and profile deletion is real.
 */

async function assertEmptyTool(toolId: string, repositories: {
  tools: { get(id: string): Promise<unknown> };
  versions: { listByTool(id: string): Promise<readonly unknown[]> };
  ledger: { listByTool(id: string): Promise<readonly unknown[]> };
  trials: { listByTool(id: string): Promise<readonly unknown[]> };
  grants: { listByTool(id: string): Promise<readonly unknown[]> };
  summaries: { listByTool(id: string): Promise<readonly unknown[]> };
}): Promise<void> {
  expect(await repositories.tools.get(toolId)).toBeNull();
  expect(await repositories.versions.listByTool(toolId)).toEqual([]);
  expect(await repositories.ledger.listByTool(toolId)).toEqual([]);
  expect(await repositories.trials.listByTool(toolId)).toEqual([]);
  expect(await repositories.grants.listByTool(toolId)).toEqual([]);
  expect(await repositories.summaries.listByTool(toolId)).toEqual([]);
}

describe('INV-25 — tool deletion removes definitions, versions, trials, and events from local storage', () => {
  it('INV-25: memory deleteToolGraph and deleteProfileGraph empty the owned streams', async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    await persistGraph(repositories, otherToolGraph());
    await repositories.tools.deleteToolGraph('mayas-flight-lab');
    await assertEmptyTool('mayas-flight-lab', repositories);
    expect(await repositories.tools.get('other-paper-lab')).not.toBeNull();
    expect(await repositories.profiles.get('child_local_01')).not.toBeNull();

    await persistGraph(repositories, flightLabGraph());
    await repositories.profiles.deleteProfileGraph('child_local_01');
    await assertEmptyTool('mayas-flight-lab', repositories);
    await assertEmptyTool('other-paper-lab', repositories);
    expect(await repositories.profiles.get('child_local_01')).toBeNull();
  });

  it('INV-25: IndexedDB deleteToolGraph empties six streams after close/reopen', async () => {
    const name = 'teach-daso-inv-25';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    await persistGraph(opened.repositories, flightLabGraph());
    await persistGraph(opened.repositories, otherToolGraph());
    await opened.repositories.tools.deleteToolGraph('mayas-flight-lab');
    opened.database.close();

    const reopened = await openIndexedDbRepositories(name);
    await assertEmptyTool('mayas-flight-lab', reopened.repositories);
    const tools = (await reopened.database.getAll(STORE.tools)).map((raw) => ToolDefinition.parse(raw));
    expect(tools.map((tool) => tool.toolId)).toEqual(['other-paper-lab']);
    expect(
      (await reopened.database.getAllFromIndex(STORE.toolVersions, 'toolId', 'mayas-flight-lab')).map(
        (raw) => ToolVersion.parse(raw),
      ),
    ).toEqual([]);
    expect(
      (await reopened.database.getAllFromIndex(STORE.ledgerEntries, 'toolId', 'mayas-flight-lab')).map(
        (raw) => LedgerEntry.parse(raw),
      ),
    ).toEqual([]);
    expect(
      (await reopened.database.getAllFromIndex(STORE.trials, 'toolId', 'mayas-flight-lab')).map((raw) =>
        ExperimentTrial.parse(raw),
      ),
    ).toEqual([]);
    expect(
      (await reopened.database.getAllFromIndex(STORE.grants, 'toolId', 'mayas-flight-lab')).map((raw) =>
        PermissionGrant.parse(raw),
      ),
    ).toEqual([]);
    expect(
      (await reopened.database.getAllFromIndex(STORE.summaries, 'toolId', 'mayas-flight-lab')).map(
        (raw) => ParentSummary.parse(raw),
      ),
    ).toEqual([]);
    expect(ChildProfile.safeParse(await reopened.database.get(STORE.childProfiles, 'child_local_01')).success).toBe(
      true,
    );
    reopened.database.close();
    await deleteDB(name);
  });
});
