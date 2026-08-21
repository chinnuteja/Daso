import { describe, expect, it } from 'vitest';

import { foldApprovedEvents } from '../../src/core/ledger/fold';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-14 — canonical equality is order-independent (specification section 17 Determinism).
 *
 * Two values that differ only in key insertion order are the same domain value. Replaying the
 * fold over the same fixture produces the same bytes.
 */

describe('INV-14 — canonicalJson is order-independent; the fold is replay-stable (§17 Determinism)', () => {
  it('INV-14: canonicalJson of two objects differing only in key insertion order is identical', () => {
    const insertionA = { version: 2, toolId: 'mayas-flight-lab', metrics: ['consistency', 'median_distance'] };
    const insertionB = { metrics: ['consistency', 'median_distance'], toolId: 'mayas-flight-lab', version: 2 };

    expect(canonicalJson(insertionA)).toBe(canonicalJson(insertionB));
  });

  it('INV-14: folding the Flight Lab fixture twice produces identical canonical JSON', () => {
    const first = canonicalJson(foldApprovedEvents(flightLabLedger));
    const second = canonicalJson(foldApprovedEvents(flightLabLedger));
    expect(first).toBe(second);
  });
});
