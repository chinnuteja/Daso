import { describe, expect, it } from 'vitest';

import { append, appendEntries } from '../../src/core/ledger/append';
import { foldApprovedEvents } from '../../src/core/ledger/fold';
import type { ApprovalEntry, CandidateEntry, LedgerEntry } from '../../src/core/ledger/types';

/**
 * INV-10 — AI cannot approve its own mutation (specification sections 7.3 and 12).
 *
 * Admission is decided by the presence of a child approval entry, never by who authored the
 * candidate. An AI-authored candidate stays out until a child approval exists; an approval
 * whose actor is `ai` does not count.
 */

const TOOL_ID = 'mayas-flight-lab';
const INSTANT = '2026-08-18T10:00:00Z';

const childSeed: CandidateEntry = {
  entryKind: 'candidate',
  eventId: 'event_001',
  sequence: 1,
  toolId: TOOL_ID,
  actor: 'child',
  type: 'definition_decision',
  originalInput: 'I want to compare how far the planes fly',
  candidateMutation: { operation: 'add_metric', metric: 'median_distance' },
  createdAt: INSTANT,
};

const childSeedApproval: ApprovalEntry = {
  entryKind: 'approval',
  eventId: 'event_002',
  sequence: 2,
  toolId: TOOL_ID,
  actor: 'child',
  approves: 'event_001',
  createdAt: INSTANT,
};

const aiCandidate: CandidateEntry = {
  entryKind: 'candidate',
  eventId: 'event_003',
  sequence: 3,
  toolId: TOOL_ID,
  actor: 'ai',
  type: 'ai_suggestion',
  originalInput: 'Should Flight Lab also compare consistency?',
  candidateMutation: { operation: 'add_metric', metric: 'consistency' },
  createdAt: INSTANT,
};

const aiApproval: ApprovalEntry = {
  entryKind: 'approval',
  eventId: 'event_004',
  sequence: 4,
  toolId: TOOL_ID,
  actor: 'ai',
  approves: 'event_003',
  createdAt: INSTANT,
};

const childApprovalOfAi: ApprovalEntry = {
  entryKind: 'approval',
  eventId: 'event_005',
  sequence: 5,
  toolId: TOOL_ID,
  actor: 'child',
  approves: 'event_003',
  createdAt: INSTANT,
};

function metricsOf(entries: readonly LedgerEntry[]): readonly string[] {
  return foldApprovedEvents(entries).metrics;
}

describe('INV-10 — AI cannot approve its own mutation (§7.3, §12)', () => {
  it('INV-10: an AI candidate with no child approval does not appear in the fold', () => {
    const ledger = appendEntries([], [childSeed, childSeedApproval, aiCandidate]);
    expect(metricsOf(ledger)).toEqual(['median_distance']);
  });

  it('INV-10: an approval whose actor is ai still does not admit the candidate', () => {
    const ledger = appendEntries([], [childSeed, childSeedApproval, aiCandidate, aiApproval]);
    expect(metricsOf(ledger)).toEqual(['median_distance']);
  });

  it('INV-10: a child approval entry does admit the AI candidate', () => {
    const withoutChild = appendEntries([], [childSeed, childSeedApproval, aiCandidate, aiApproval]);
    const admitted = append(withoutChild, childApprovalOfAi);
    expect(metricsOf(admitted)).toEqual(['median_distance', 'consistency']);
  });
});
