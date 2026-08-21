import { describe, expect, it } from 'vitest';

import { appendEntries } from '../../src/core/ledger/append';
import { foldApprovedEvents } from '../../src/core/ledger/fold';
import type { CandidateEntry } from '../../src/core/ledger/types';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-11 — unapproved behaviour cannot reach a version (specification section 17 Authorship).
 *
 * A candidate authored by the child is still only a proposal. Without a matching child
 * approval entry it has no path into the folded body.
 */

const unapprovedChild: CandidateEntry = {
  entryKind: 'candidate',
  eventId: 'event_001',
  sequence: 1,
  toolId: 'mayas-flight-lab',
  actor: 'child',
  type: 'definition_decision',
  originalInput: 'Maybe I should also write what happened each time',
  candidateMutation: { operation: 'add_input', input: 'note' },
  createdAt: '2026-08-18T10:19:00Z',
};

describe('INV-11 — unapproved behaviour cannot reach a version (§17 Authorship)', () => {
  it('INV-11: a child-authored candidate that was never approved does not appear in the fold', () => {
    const ledger = appendEntries([], [unapprovedChild]);
    expect(foldApprovedEvents(ledger).inputs).toEqual([]);
  });

  it('INV-11: the Flight Lab fixture excludes the unapproved note input (event_011)', () => {
    expect(foldApprovedEvents(flightLabLedger).inputs).not.toContain('note');
  });
});
