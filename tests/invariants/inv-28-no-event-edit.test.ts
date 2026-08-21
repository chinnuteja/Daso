import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import * as persistence from '../../src/adapters/persistence';
import { openIndexedDbRepositories } from '../../src/adapters/persistence';
import * as ledgerRepository from '../../src/adapters/persistence/indexedDb/ledgerRepository';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-28 — persistence cannot edit an event (specification section 10).
 */

describe('INV-28 — persistence cannot edit an event (§10)', () => {
  it('INV-28: the persistence module exports no update, edit, patch, or single-event delete function', () => {
    const exported = [...Object.keys(persistence), ...Object.keys(ledgerRepository)];
    const editors = exported.filter(
      (name) =>
        /^(update|edit|patch)/iu.test(name) || /deleteEvent|deleteEntry|removeEvent|removeEntry/iu.test(name),
    );
    expect(editors).toEqual([]);
  });

  it('INV-28: appending a duplicate event id rejects against IndexedDB', async () => {
    const name = 'teach-daso-inv-28-dup';
    await deleteDB(name);
    const { repositories, database } = await openIndexedDbRepositories(name);
    const first = flightLabGraph().entries[0];
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    await repositories.ledger.append(first);
    await expect(repositories.ledger.append(first)).rejects.toThrow();
    database.close();
    await deleteDB(name);
  });

  it('INV-28: appending a sequence that does not strictly follow the highest rejects against IndexedDB', async () => {
    const name = 'teach-daso-inv-28-gap';
    await deleteDB(name);
    const { repositories, database } = await openIndexedDbRepositories(name);
    const entries = flightLabGraph().entries;
    const first = entries[0];
    const third = entries[2];
    expect(first).toBeDefined();
    expect(third).toBeDefined();
    if (first === undefined || third === undefined) {
      return;
    }
    await repositories.ledger.append(first);
    await expect(repositories.ledger.append(third)).rejects.toThrow();
    database.close();
    await deleteDB(name);
  });
});
