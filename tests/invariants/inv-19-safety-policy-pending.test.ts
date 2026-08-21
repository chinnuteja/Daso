import { describe, expect, it } from 'vitest';

import { POLICY_BOUNDARIES, evaluatePolicy } from '../../src/core/policy';

/**
 * INV-19 — Safety policy denies each §7.5 boundary. Promoted from the pending placeholder.
 */

describe('INV-19 — safety policy denies each §7.5 boundary (§7.5)', () => {
  it('INV-19: each of the nine §7.5 boundaries is denied with its own reason', () => {
    expect([...POLICY_BOUNDARIES]).toEqual([
      'arbitrary_network',
      'unapproved_contacts',
      'background_microphone_or_camera',
      'continuous_location',
      'generated_native_code',
      'filesystem_outside_sandbox',
      'tool_to_tool_without_capability',
      'public_publishing',
      'undeclared_runner_model',
    ]);

    for (const boundary of POLICY_BOUNDARIES) {
      const verdict = evaluatePolicy({ intent: boundary });
      expect(verdict.ok).toBe(false);
      if (verdict.ok === false) {
        expect(verdict.boundary).toBe(boundary);
      }
    }
  });

  it('INV-19: a request matching no explicit allowance is denied by default', () => {
    const verdict = evaluatePolicy({ intent: 'invented_admin_override' });
    expect(verdict.ok).toBe(false);
    if (verdict.ok === false) {
      expect(verdict.boundary).toBe('unenumerated');
    }
  });

  it('INV-19: proposing a closed-vocabulary candidate is an explicit allowance', () => {
    expect(evaluatePolicy({ intent: 'propose_candidate_mutation' })).toEqual({
      ok: true,
      allowance: 'propose_candidate_mutation',
    });
  });
});
