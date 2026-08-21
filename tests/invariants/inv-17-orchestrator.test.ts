import { describe, expect, it } from 'vitest';

import { ORCHESTRATOR_STATES } from '../../src/core/orchestrator/states';

/**
 * INV-17 — owning phase P3.
 * The Teaching Orchestrator is a deterministic state machine over exactly the ten
 * specification section 7.2 states.
 */
describe('INV-17 — Orchestrator is a deterministic state machine over exactly the ten §7.2 states', () => {
  it('INV-17: the state enum members deep-equal the ten §7.2 states in order', () => {
    expect([...ORCHESTRATOR_STATES]).toEqual([
      'IMAGINE',
      'DEFINE_METRICS',
      'DEFINE_INPUTS',
      'PREDICT',
      'COLLECT_TRIALS',
      'INSPECT_ANOMALY',
      'PROPOSE_CORRECTION',
      'REVIEW_MUTATION',
      'COMPILE',
      'RUN',
    ]);
  });
});
