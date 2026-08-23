import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import {
  openIndexedDbRepositories,
  persistGraph,
} from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { replay } from '../../src/core/runtime';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import {
  captureTrialUnderActiveVersion,
  createOrReuseFork,
  ensureSecondChildProfile,
} from '../../src/ui/flows/runner';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { mayaGraphCanonical } from '../support/mayaGraph';

/**
 * INV-71 — IndexedDB close/reopen retains source, fork, and byte-identical replay.
 */

describe('INV-71 — phase 6 reload proof', () => {
  it('INV-71: reopen retains source tile, fork lineage/ledger/version/trial, and source bytes', async () => {
    const name = 'teach-daso-inv-71';
    await deleteDB(name);
    const first = await openIndexedDbRepositories(name);
    await persistGraph(first.repositories, flightLabGraph());
    const before = await mayaGraphCanonical(first.repositories);
    const leo = await ensureSecondChildProfile(first.repositories);
    const fork = await createOrReuseFork({
      repositories: first.repositories,
      ids: createSequentialIdFactory({ event: 15, tool_version: 2 }),
      clock: createFixedClock('2026-08-21T09:05:00Z'),
      sourceToolId: 'mayas-flight-lab',
      targetOwner: leo,
    });
    await captureTrialUnderActiveVersion({
      repositories: first.repositories,
      ids: createSequentialIdFactory({ trial: 10 }),
      clock: createFixedClock('2026-08-21T09:06:00Z'),
      trial: {
        toolId: fork.snapshot.definition.toolId,
        designName: 'Dart',
        distanceM: 8.1,
        obstruction: true,
        validAtCapture: true,
      },
    });
    const forkTrials = await first.repositories.trials.listByTool(fork.snapshot.definition.toolId);
    const firstReplay = replay(fork.snapshot.version, forkTrials);
    first.database.close();

    const second = await openIndexedDbRepositories(name);
    expect(await mayaGraphCanonical(second.repositories)).toBe(before);
    const reloaded = await second.repositories.tools.get(fork.snapshot.definition.toolId);
    expect(reloaded?.forkedFrom).toEqual({
      toolId: 'mayas-flight-lab',
      versionId: 'tool_version_002',
      ownerChildId: 'child_local_01',
    });
    const version = await second.repositories.versions.get(fork.snapshot.version.versionId);
    const trials = await second.repositories.trials.listByTool(fork.snapshot.definition.toolId);
    expect(version).not.toBeNull();
    if (version === null) {
      return;
    }
    expect(canonicalJson(replay(version, trials))).toBe(canonicalJson(firstReplay));
    second.database.close();
    await deleteDB(name);
  });
});
