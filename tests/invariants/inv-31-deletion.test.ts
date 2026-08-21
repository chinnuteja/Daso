import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import {
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
 * INV-31 — storage deletion is real (specification section 11.4).
 *
 * Absence is verified by reading the object stores, not by asking the repository that
 * just performed the delete.
 */

describe('INV-31 — storage deletion is real (§11.4)', () => {
  it('INV-31: after deleteByTool the tool is absent from every store; an unrelated tool remains; deleteProfile removes the profile record', async () => {
    const name = 'teach-daso-inv-31';
    await deleteDB(name);
    const { repositories, database } = await openIndexedDbRepositories(name);

    await persistGraph(repositories, flightLabGraph());
    await persistGraph(repositories, otherToolGraph());

    await repositories.tools.deleteByTool('mayas-flight-lab');
    await repositories.versions.deleteByTool('mayas-flight-lab');
    await repositories.ledger.deleteByTool('mayas-flight-lab');
    await repositories.trials.deleteByTool('mayas-flight-lab');
    await repositories.grants.deleteByTool('mayas-flight-lab');
    await repositories.summaries.deleteByTool('mayas-flight-lab');

    const tools = (await database.getAll(STORE.tools)).map((raw) => ToolDefinition.parse(raw));
    expect(tools.map((tool) => tool.toolId)).toEqual(['other-paper-lab']);

    const versions = (await database.getAll(STORE.toolVersions)).map((raw) => ToolVersion.parse(raw));
    expect(versions.map((version) => version.toolId)).toEqual(['other-paper-lab']);

    const entries = (await database.getAllFromIndex(STORE.ledgerEntries, 'toolId', 'mayas-flight-lab')).map(
      (raw) => LedgerEntry.parse(raw),
    );
    expect(entries).toEqual([]);

    const remainingEntries = (await database.getAllFromIndex(
      STORE.ledgerEntries,
      'toolId',
      'other-paper-lab',
    )).map((raw) => LedgerEntry.parse(raw));
    expect(remainingEntries.length).toBe(2);

    const trials = (await database.getAllFromIndex(STORE.trials, 'toolId', 'mayas-flight-lab')).map((raw) =>
      ExperimentTrial.parse(raw),
    );
    expect(trials).toEqual([]);

    const grants = (await database.getAllFromIndex(STORE.grants, 'toolId', 'mayas-flight-lab')).map((raw) =>
      PermissionGrant.parse(raw),
    );
    expect(grants).toEqual([]);

    const summaries = (await database.getAllFromIndex(STORE.summaries, 'toolId', 'mayas-flight-lab')).map(
      (raw) => ParentSummary.parse(raw),
    );
    expect(summaries).toEqual([]);

    await repositories.profiles.deleteProfile('child_local_01');
    expect(await database.get(STORE.childProfiles, 'child_local_01')).toBeUndefined();
    expect(ChildProfile.safeParse(await database.get(STORE.childProfiles, 'child_local_01')).success).toBe(
      false,
    );

    database.close();
    await deleteDB(name);
  });
});
