import { describe, expect, it } from 'vitest';

import { teachingRequestBody } from '../../src/adapters/agents/teaching';
import { TeachingRequest } from '../../src/core/ports/teaching';

/**
 * INV-51 — The route receives minimal context (§11.2).
 */

describe('INV-51 — the route receives minimal context (§11.2)', () => {
  it('INV-51: the request schema has exactly state and originalInput', () => {
    const parsed = TeachingRequest.parse({
      state: 'IMAGINE',
      originalInput: 'I want to find out which paper airplane is best.',
    });
    expect(Object.keys(parsed).sort()).toEqual(['originalInput', 'state']);
  });

  it('INV-51: parsing rejects a request carrying a ledger, trials, a profile, or a transcript', () => {
    const base = {
      state: 'IMAGINE',
      originalInput: 'I want to find out which paper airplane is best.',
    };
    expect(TeachingRequest.safeParse({ ...base, ledger: [] }).success).toBe(false);
    expect(TeachingRequest.safeParse({ ...base, trials: [] }).success).toBe(false);
    expect(TeachingRequest.safeParse({ ...base, profile: { childId: 'child_local_01' } }).success).toBe(
      false,
    );
    expect(TeachingRequest.safeParse({ ...base, transcript: ['hello'] }).success).toBe(false);
  });

  it('INV-51: the outbound body for a real step contains no event id and no trial id', () => {
    const body = teachingRequestBody({
      state: 'PROPOSE_CORRECTION',
      originalInput: "That one shouldn't count because it hit the chair",
    });
    const encoded = JSON.stringify(body);
    expect(encoded).not.toMatch(/event_/u);
    expect(encoded).not.toMatch(/trial_/u);
    expect(body).toEqual({
      state: 'PROPOSE_CORRECTION',
      originalInput: "That one shouldn't count because it hit the chair",
    });
  });
});
