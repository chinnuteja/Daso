import { describe, expect, it } from 'vitest';

import * as appendModule from '../../src/core/ledger/append';
import { append, appendEntries } from '../../src/core/ledger/append';
import * as foldModule from '../../src/core/ledger/fold';
import * as typesModule from '../../src/core/ledger/types';
import type { CandidateEntry } from '../../src/core/ledger/types';

/**
 * INV-12 — the ledger is append-only (specification section 10).
 *
 * History is only append-only if editing has no representation. Duplicate event ids and
 * non-monotonic sequences are rejected so a dropped or reordered event is a thrown error
 * rather than a silent corruption.
 */

const first: CandidateEntry = {
  entryKind: 'candidate',
  eventId: 'event_001',
  sequence: 1,
  toolId: 'mayas-flight-lab',
  actor: 'child',
  type: 'definition_decision',
  originalInput: 'I want to know which plane flies farthest',
  candidateMutation: { operation: 'add_metric', metric: 'median_distance' },
  createdAt: '2026-08-18T10:13:00Z',
};

const duplicateId: CandidateEntry = {
  ...first,
  sequence: 2,
};

const nonMonotonic: CandidateEntry = {
  ...first,
  eventId: 'event_002',
  sequence: 1,
};

describe('INV-12 — the ledger module is append-only (§10)', () => {
  it('INV-12: the ledger module exports no update or delete function', () => {
    const exported = [
      ...Object.keys(appendModule),
      ...Object.keys(foldModule),
      ...Object.keys(typesModule),
    ];
    const editors = exported.filter((name) => /update|delete/iu.test(name));
    expect(editors).toEqual([]);
  });

  it('INV-12: append with a duplicate event id throws', () => {
    const ledger = appendEntries([], [first]);
    expect(() => append(ledger, duplicateId)).toThrow(/already in the ledger/u);
  });

  it('INV-12: append with a non-monotonic sequence throws', () => {
    const ledger = appendEntries([], [first]);
    expect(() => append(ledger, nonMonotonic)).toThrow(/does not follow/u);
  });
});
