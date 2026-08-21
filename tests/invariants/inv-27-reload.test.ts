import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { openIndexedDbRepositories, persistGraph } from '../../src/adapters/persistence';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-27 — reload preserves the complete history (Milestone 2 verification, §11.1).
 */

async function snapshot(name: string) {
  const { repositories, database } = await openIndexedDbRepositories(name);
  try {
    const graph = flightLabGraph();
    return {
      profile: await repositories.profiles.get(graph.profile.childId),
      tool: await repositories.tools.get('mayas-flight-lab'),
      versions: await repositories.versions.listByTool('mayas-flight-lab'),
      entries: await repositories.ledger.listByTool('mayas-flight-lab'),
      trials: await repositories.trials.listByTool('mayas-flight-lab'),
    };
  } finally {
    database.close();
  }
}

describe('INV-27 — reload preserves the complete experiment and authorship history (§11.1)', () => {
  it('INV-27: close and reopen IndexedDB; canonical JSON is identical and the ledger is in sequence order', async () => {
    const name = 'teach-daso-inv-27';
    await deleteDB(name);

    const first = await openIndexedDbRepositories(name);
    await persistGraph(first.repositories, flightLabGraph());
    const before = {
      profile: await first.repositories.profiles.get('child_local_01'),
      tool: await first.repositories.tools.get('mayas-flight-lab'),
      versions: await first.repositories.versions.listByTool('mayas-flight-lab'),
      entries: await first.repositories.ledger.listByTool('mayas-flight-lab'),
      trials: await first.repositories.trials.listByTool('mayas-flight-lab'),
    };
    first.database.close();

    const after = await snapshot(name);

    expect(canonicalJson(after.profile)).toBe(canonicalJson(before.profile));
    expect(canonicalJson(after.tool)).toBe(canonicalJson(before.tool));
    expect(canonicalJson(after.versions)).toBe(canonicalJson(before.versions));
    expect(canonicalJson(after.entries)).toBe(canonicalJson(before.entries));
    expect(canonicalJson(after.trials)).toBe(canonicalJson(before.trials));
    expect(canonicalJson(after.entries)).toBe(canonicalJson(flightLabLedger));
    expect(after.entries.map((entry) => entry.sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);

    await deleteDB(name);
  });
});
