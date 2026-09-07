import { describe, expect, it } from 'vitest';

import { ToolKind } from '../../src/core/schema/vocabulary';

/**
 * INV-05 — Every tool kind is a closed, implemented capability.
 *
 * The coaching-preference kind is the declared founder-demo extension. It has its own
 * compiler projection and deterministic runtime; arbitrary generated app kinds remain invalid.
 */

describe('INV-05 — implemented tool kinds stay closed', () => {
  it('INV-05: only the experiment and coaching preference capabilities are nameable', () => {
    expect(ToolKind.options).toEqual(['experiment_comparator', 'coaching_preference']);
  });
});
