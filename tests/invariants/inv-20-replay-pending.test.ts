import { describe, it } from 'vitest';

/**
 * INV-20 — owning phase P5.
 * Replay determinism for compiled results: identical version + trial data yields identical
 * metric output. Phase 1 already forbids hidden inputs in core (INV-03, INV-14, INV-15).
 */
describe('INV-20 — identical version + trial data yields identical results', () => {
  it.todo(
    'INV-20: pending — owning phase P5 — compiling and evaluating the same version and trial set twice produces identical canonical JSON',
  );
});
