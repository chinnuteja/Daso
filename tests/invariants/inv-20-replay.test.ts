import { describe, expect, it } from 'vitest';

import { compileToolVersion } from '../../src/core/compiler';
import { millimetresToMetres, replay } from '../../src/core/runtime';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabLedger, flightLabTrials } from '../fixtures/ledger/flightLab';

/**
 * INV-20 — identical version + trial data yields identical results.
 */

const V1 = compileToolVersion(
  flightLabLedger.filter((entry) => entry.sequence <= 10),
  { versionId: 'tool_version_001', compiledAt: '2026-08-18T10:21:00Z' },
);

describe('INV-20 — identical version + trial data yields identical results (§17)', () => {
  it('INV-20: repeated runtime calls produce byte-identical canonical results and leave inputs unchanged', () => {
    const beforeTrials = canonicalJson(flightLabTrials);
    const beforeVersion = canonicalJson(V1);
    const first = replay(V1, flightLabTrials);
    const second = replay(V1, flightLabTrials);
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(canonicalJson(flightLabTrials)).toBe(beforeTrials);
    expect(canonicalJson(V1)).toBe(beforeVersion);
    expect(millimetresToMetres(7500)).toBe(7.5);
  });
});
