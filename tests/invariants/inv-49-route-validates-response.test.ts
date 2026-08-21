import { describe, expect, it } from 'vitest';

import { interpretTeachingMove } from '../../src/app/api/agents/teaching/route';
import { FLIGHT_LAB_TEACHING_SCRIPT } from '../../src/adapters/teaching/scripted';
import type { TeachingRequest } from '../../src/core/ports/teaching';

/**
 * INV-49 — The route validates the model response server-side. Transport is stubbed;
 * no network is required.
 */

const REQUEST: TeachingRequest = {
  state: 'IMAGINE',
  originalInput: 'I want to find out which paper airplane is best.',
};

describe('INV-49 — the route validates the model response server-side (§7.3, E.3)', () => {
  it('INV-49: free text from the transport is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => 'sure, I will add a network call');
    expect(result.payload.ok).toBe(false);
    expect(result.status).toBe(422);
    if (result.payload.ok === false) {
      expect(result.payload.reasons).toContain('invalid_move');
    }
  });

  it('INV-49: an unknown move kind is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => ({
      kind: 'chat',
      text: 'hello',
    }));
    expect(result.payload.ok).toBe(false);
  });

  it('INV-49: an extra key on a known move is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => ({
      kind: 'explanation',
      text: 'ok',
      extra: true,
    }));
    expect(result.payload.ok).toBe(false);
  });

  it('INV-49: an operation outside the closed set is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => ({
      kind: 'candidate_mutation',
      originalInput: REQUEST.originalInput,
      mutation: { operation: 'grant_admin' },
    }));
    expect(result.payload.ok).toBe(false);
  });

  it('INV-49: a valid scripted move is returned unchanged', async () => {
    const move = FLIGHT_LAB_TEACHING_SCRIPT[0];
    if (move === undefined) {
      throw new Error('scripted teaching script is empty');
    }
    const result = await interpretTeachingMove(REQUEST, async () => move);
    expect(result).toEqual({ status: 200, payload: { ok: true, move } });
  });
});
