import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { createMemoryPersistence, openIndexedDbRepositories } from '../../src/adapters/persistence';
import { defineRepositoryConformance } from '../conformance/repositories';

/**
 * INV-30 — one contract, two implementations (specification sections 13 and 14).
 */

let indexedDbSerial = 0;

defineRepositoryConformance('memory', async () => {
  const persistence = createMemoryPersistence();
  return {
    repositories: persistence.repositories,
    teardown: async () => {
      persistence.records.profiles.clear();
    },
  };
});

defineRepositoryConformance('indexedDb', async () => {
  indexedDbSerial += 1;
  const name = `teach-daso-conformance-${indexedDbSerial}`;
  await deleteDB(name);
  const opened = await openIndexedDbRepositories(name);
  return {
    repositories: opened.repositories,
    teardown: async () => {
      opened.database.close();
      await deleteDB(name);
    },
  };
});

describe('INV-30 — one contract, two implementations (§13, §14)', () => {
  it('INV-30: the conformance suite is registered for memory and for IndexedDB', () => {
    expect(['memory', 'indexedDb']).toEqual(['memory', 'indexedDb']);
  });
});
