import { describe, expect, it } from 'vitest';

import { createSequentialIdFactory } from '../../src/core/ports/ids';

/**
 * INV-15 — identifiers are deterministic (specification section 17 Determinism).
 *
 * Two factories seeded identically produce the same sequence. The format matches the
 * specification's own examples: zero-padded to at least three digits (`event_014`,
 * `tool_version_002`, `trial_004`, `summary_001`).
 */

describe('INV-15 — IdFactory sequences are deterministic and zero-padded (§17 Determinism)', () => {
  it('INV-15: two factories with the same seed produce identical id sequences matching spec format', () => {
    const seed = { event: 13, tool_version: 1, trial: 3, summary: 0 } as const;
    const first = createSequentialIdFactory(seed);
    const second = createSequentialIdFactory(seed);

    expect(first.next('event')).toBe('event_014');
    expect(second.next('event')).toBe('event_014');

    expect(first.next('tool_version')).toBe('tool_version_002');
    expect(second.next('tool_version')).toBe('tool_version_002');

    expect(first.next('trial')).toBe('trial_004');
    expect(second.next('trial')).toBe('trial_004');

    expect(first.next('summary')).toBe('summary_001');
    expect(second.next('summary')).toBe('summary_001');
  });
});
