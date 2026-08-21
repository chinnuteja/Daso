import { describe, expect, it } from 'vitest';

import {
  ORCHESTRATOR_EVENT_KINDS,
  ORCHESTRATOR_STATES,
  transition,
} from '../../src/core/orchestrator';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';

/**
 * INV-36 — transitions are a total function over (state, event).
 */
describe('INV-36 — transitions are a total function (§7.2, E.4)', () => {
  it('INV-36: every state × event pair returns a defined result; the table is printed', () => {
    const lines: string[] = [];
    let count = 0;

    for (const state of ORCHESTRATOR_STATES) {
      for (const kind of ORCHESTRATOR_EVENT_KINDS) {
        const first = transition(state, { kind });
        const second = transition(state, { kind });
        expect(first).toBeDefined();
        expect(first.kind === 'ignored' || first.kind === 'advanced').toBe(true);
        expect(canonicalJson(first)).toBe(canonicalJson(second));
        count += 1;
        lines.push(`${state} + ${kind} => ${canonicalJson(first)}`);
      }
    }

    expect(count).toBe(ORCHESTRATOR_STATES.length * ORCHESTRATOR_EVENT_KINDS.length);
    // Printed so a reviewer can read the machine rather than infer it from code (PHASE_03 D.4.3).
    console.log(`INV-36 transition table (${count} pairs)\n${lines.join('\n')}`);
  });
});
