import { describe, expect, it } from 'vitest';

import { CandidateMutation, RuleDraft } from '../../src/core/schema/mutation';
import { RuleCondition, RuleEffect } from '../../src/core/schema/vocabulary';

/**
 * INV-08 — the mutation vocabulary is closed (specification sections 7.3, 7.4 and 12).
 *
 * Parsing is the only gate. An operation, field, or effect outside the closed set has no
 * representation, so it cannot be smuggled through as data. A rule cannot carry an expression
 * string that some later stage would have to parse or evaluate.
 */

describe('INV-08 — mutation vocabulary is closed; rules are data, not code (§7.3, §7.4, §12)', () => {
  it('INV-08: CandidateMutation rejects an unlisted operation', () => {
    const parsed = CandidateMutation.safeParse({
      operation: 'rename_metric',
      metric: 'median_distance',
    });
    expect(parsed.success).toBe(false);
  });

  it('INV-08: RuleCondition rejects a field outside InputField', () => {
    const parsed = RuleCondition.safeParse({ field: 'altitude', equals: true });
    expect(parsed.success).toBe(false);
  });

  it('INV-08: RuleEffect rejects a target other than trial.valid', () => {
    const parsed = RuleEffect.safeParse({ set: 'trial.score', value: true });
    expect(parsed.success).toBe(false);
  });

  it('INV-08: a rule carrying an expression string is rejected', () => {
    const parsed = RuleDraft.safeParse({
      ruleId: 'exclude_obstructed_flight',
      when: { field: 'obstruction', equals: true },
      effect: { set: 'trial.valid', value: false },
      expression: 'if (obstruction) { trial.valid = false; }',
    });
    expect(parsed.success).toBe(false);
  });
});
