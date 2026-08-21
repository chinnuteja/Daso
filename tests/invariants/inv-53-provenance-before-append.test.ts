import { describe, expect, it, vi } from 'vitest';

import { createMemoryRepositories } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import type { CandidateMutation } from '../../src/core/schema/mutation';
import { executeIntents } from '../../src/ui/flows/executeIntents';
import { validateCandidate } from '../../src/core/validator';
import { emptyValidationContext } from '../support/validationContext';

/**
 * INV-53 — Provenance completeness is enforced before append (§7.4, §4.1).
 */

const STAMPED_RULE = {
  operation: 'add_rule',
  rule: {
    ruleId: 'exclude_obstructed_flight',
    when: { field: 'obstruction', equals: true },
    effect: { set: 'trial.valid', value: false },
    sourceEventId: 'event_001',
  },
} as const;

describe('INV-53 — provenance completeness is enforced before append (§7.4, §4.1)', () => {
  it('INV-53: a candidate carrying a pre-stamped sourceEventId is rejected', () => {
    const verdict = validateCandidate(
      STAMPED_RULE,
      emptyValidationContext({ knownEventIds: new Set(['event_001']) }),
    );
    expect(verdict.ok).toBe(false);
    if (verdict.ok === false) {
      expect(verdict.reasons.some((reason) => reason.check === 'provenance')).toBe(true);
    }
  });

  it('INV-53: a candidate whose named source event is absent from the stream is rejected', () => {
    const named = {
      operation: 'add_metric',
      metric: 'median_distance',
      namedEventId: 'event_999',
    };
    const verdict = validateCandidate(named, emptyValidationContext());
    expect(verdict.ok).toBe(false);
    if (verdict.ok === false) {
      expect(verdict.reasons.some((reason) => reason.check === 'provenance')).toBe(true);
    }
  });

  it('INV-53: both are rejected before any repository call', async () => {
    const repositories = createMemoryRepositories();
    const append = vi.spyOn(repositories.ledger, 'append');
    const stamped = STAMPED_RULE as CandidateMutation;

    const executed = await executeIntents({
      intents: ['append_candidate'],
      repositories,
      ids: createSequentialIdFactory(),
      clock: createFixedClock('2026-08-18T10:00:00Z'),
      toolId: 'mayas-flight-lab',
      pendingCandidateId: null,
      candidate: {
        actor: 'ai',
        type: 'ai_suggestion',
        originalInput: 'exclude obstructed throws',
        mutation: stamped,
      },
    });

    expect(executed.rejection?.kind).toBe('validation');
    expect(append).not.toHaveBeenCalled();
  });
});
