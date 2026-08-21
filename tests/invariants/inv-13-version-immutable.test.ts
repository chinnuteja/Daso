import { describe, expect, it } from 'vitest';

import { foldApprovedEvents } from '../../src/core/ledger/fold';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-13 — ToolVersion objects are immutable (specification sections 9.3 and 12).
 *
 * In Phase 1 the domain hands out a version as the frozen fold of approved events. Assignment
 * to a nested rule field must throw in strict mode (ES modules are always strict), and the
 * object's canonical JSON must be unchanged after the attempt.
 */

describe('INV-13 — a version returned by the domain is deeply frozen (§9.3, §12)', () => {
  it('INV-13: the folded version is deeply frozen; nested assignment throws; canonical JSON is unchanged', () => {
    const version = foldApprovedEvents(flightLabLedger);
    const before = canonicalJson(version);
    const rule = version.rules[0];

    expect(Object.isFrozen(version)).toBe(true);
    expect(Object.isFrozen(version.rules)).toBe(true);
    expect(rule).toBeDefined();
    expect(Object.isFrozen(rule)).toBe(true);

    if (rule === undefined) {
      throw new Error("expected the Flight Lab fold to contain Maya's correction rule");
    }

    expect(() => {
      rule.ruleId = 'tampered';
    }).toThrow(TypeError);

    expect(canonicalJson(version)).toBe(before);
  });
});
