import { describe, expect, it } from 'vitest';

import { ToolKind } from '../../src/core/schema/vocabulary';

/**
 * INV-05 — Flight Lab is the only tool kind (specification sections 15 and 20).
 *
 * Ruling R6: a second member would make this an app generator. The enum's membership is the
 * whole constraint; widening it is a specification change, not an implementation detail.
 */

describe('INV-05 — Flight Lab is the only implemented tool kind (§15, §20)', () => {
  it("INV-05: ToolKind.options deep-equals ['experiment_comparator']", () => {
    expect(ToolKind.options).toEqual(['experiment_comparator']);
  });
});
