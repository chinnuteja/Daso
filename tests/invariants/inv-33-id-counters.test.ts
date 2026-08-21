import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { loadIdCounters, openTeachDasoDatabase, saveIdCounters } from '../../src/adapters/persistence';
import { createSequentialIdFactory } from '../../src/core/ports/ids';

/**
 * INV-33 — identifier counters survive a reload (specification section 17 Determinism).
 */

describe('INV-33 — identifier counters survive a reload (§17 Determinism)', () => {
  it('INV-33: a reopened factory continues the sequence and does not reissue event_001', async () => {
    const name = 'teach-daso-inv-33';
    await deleteDB(name);

    const first = createSequentialIdFactory();
    const issued: string[] = [];
    for (let index = 0; index < 15; index += 1) {
      issued.push(first.next('event'));
    }
    expect(issued[0]).toBe('event_001');
    expect(issued[14]).toBe('event_015');

    const database = await openTeachDasoDatabase(name);
    await saveIdCounters(database, first.snapshot());
    database.close();

    const reopened = await openTeachDasoDatabase(name);
    const restored = createSequentialIdFactory(await loadIdCounters(reopened));
    expect(restored.next('event')).toBe('event_016');
    expect(issued.includes('event_016')).toBe(false);
    reopened.close();
    await deleteDB(name);
  });
});
