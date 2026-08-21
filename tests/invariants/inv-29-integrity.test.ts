import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import {
  createIndexedDbRepositories,
  createMemoryPersistence,
  openTeachDasoDatabase,
  STORE,
} from '../../src/adapters/persistence';
import { LedgerIntegrityError, assertLedgerIntegrity } from '../../src/core/ledger/integrity';
import type { ApprovalEntry, CandidateEntry, LedgerEntry } from '../../src/core/ledger/types';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-29 — a dropped or reordered event fails loudly (specification section 10, E.11).
 */

const first: CandidateEntry = {
  entryKind: 'candidate',
  eventId: 'event_001',
  sequence: 1,
  toolId: 'mayas-flight-lab',
  actor: 'child',
  type: 'definition_decision',
  originalInput: 'distance',
  candidateMutation: { operation: 'add_metric', metric: 'median_distance' },
  createdAt: '2026-08-18T10:13:00Z',
};

const second: ApprovalEntry = {
  entryKind: 'approval',
  eventId: 'event_002',
  sequence: 2,
  toolId: 'mayas-flight-lab',
  actor: 'child',
  approves: 'event_001',
  createdAt: '2026-08-18T10:13:20Z',
};

const fourth: CandidateEntry = {
  entryKind: 'candidate',
  eventId: 'event_004',
  sequence: 4,
  toolId: 'mayas-flight-lab',
  actor: 'child',
  type: 'definition_decision',
  originalInput: 'consistency',
  candidateMutation: { operation: 'add_metric', metric: 'consistency' },
  createdAt: '2026-08-18T10:14:00Z',
};

const gapped: readonly LedgerEntry[] = [first, second, fourth];

describe('INV-29 — a dropped or reordered event fails loudly (§10, E.11)', () => {
  it('INV-29: the integrity check passes on the contiguous Flight Lab stream', () => {
    expect(() => assertLedgerIntegrity(flightLabLedger)).not.toThrow();
  });

  it('INV-29: the integrity check fails on a gap, a stream not starting at 1, and a duplicate event id', () => {
    expect(() => assertLedgerIntegrity(gapped)).toThrow(LedgerIntegrityError);
    expect(() => assertLedgerIntegrity([second])).toThrow(LedgerIntegrityError);
    expect(() => assertLedgerIntegrity([first, { ...first, sequence: 2 }])).toThrow(LedgerIntegrityError);
  });

  it('INV-29: loading a tool whose stored IndexedDB stream has a gap throws', async () => {
    const name = 'teach-daso-inv-29-idb';
    await deleteDB(name);
    const database = await openTeachDasoDatabase(name);
    await database.put(STORE.ledgerEntries, first);
    await database.put(STORE.ledgerEntries, second);
    await database.put(STORE.ledgerEntries, fourth);
    const repositories = createIndexedDbRepositories(database);
    await expect(repositories.ledger.listByTool('mayas-flight-lab')).rejects.toThrow(
      LedgerIntegrityError,
    );
    database.close();
    await deleteDB(name);
  });

  it('INV-29: loading a gapped stream from memory throws rather than returning a short history', async () => {
    const persistence = createMemoryPersistence();
    persistence.records.ledger.set(first.eventId, first);
    persistence.records.ledger.set(second.eventId, second);
    persistence.records.ledger.set(fourth.eventId, fourth);
    await expect(persistence.repositories.ledger.listByTool('mayas-flight-lab')).rejects.toThrow(
      LedgerIntegrityError,
    );
  });
});
