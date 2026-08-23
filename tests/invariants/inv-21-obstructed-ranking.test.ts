import { describe, expect, it } from 'vitest';

import { compileToolVersion } from '../../src/core/compiler';
import { millimetresToMetres, replay } from '../../src/core/runtime';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabLedger, flightLabTrials } from '../fixtures/ledger/flightLab';

/**
 * INV-21 — obstructed trial flips valid→invalid under v2 and the ranking changes.
 */

const V1 = compileToolVersion(
  flightLabLedger.filter((entry) => entry.sequence <= 10),
  { versionId: 'tool_version_001', compiledAt: '2026-08-18T10:21:00Z' },
);

const V2 = compileToolVersion(flightLabLedger, {
  versionId: 'tool_version_002',
  compiledAt: '2026-08-18T10:31:00Z',
});

describe('INV-21 — obstructed trial flips valid→invalid under v2 and the ranking changes', () => {
  it('INV-21: trial 4 is valid and Dart first under v1; under v2 only that trial becomes invalid and Falcon ranks first', () => {
    const storedBefore = canonicalJson(flightLabTrials);
    const v1 = replay(V1, flightLabTrials);
    const trial4v1 = v1.projections.find((projection) => projection.trialId === 'trial_004');
    expect(trial4v1?.validUnderCurrentVersion).toBe(true);
    expect(v1.winner).toBe('Dart');
    const dartV1 = v1.metrics.find((entry) => entry.designName === 'Dart');
    const falconV1 = v1.metrics.find((entry) => entry.designName === 'Falcon');
    expect(millimetresToMetres(dartV1?.medianDistanceMm ?? 0)).toBe(7.5);
    expect(millimetresToMetres(falconV1?.medianDistanceMm ?? 0)).toBe(7.4);

    const v2 = replay(V2, flightLabTrials);
    const trial4v2 = v2.projections.find((projection) => projection.trialId === 'trial_004');
    expect(trial4v2?.validUnderCurrentVersion).toBe(false);
    const changed = v1.projections.filter((left) => {
      const right = v2.projections.find((candidate) => candidate.trialId === left.trialId);
      return right !== undefined && right.validUnderCurrentVersion !== left.validUnderCurrentVersion;
    });
    expect(changed.map((projection) => projection.trialId)).toEqual(['trial_004']);
    expect(v2.winner).toBe('Falcon');
    const dartV2 = v2.metrics.find((entry) => entry.designName === 'Dart');
    const falconV2 = v2.metrics.find((entry) => entry.designName === 'Falcon');
    expect(millimetresToMetres(dartV2?.medianDistanceMm ?? 0)).toBe(6.1);
    expect(millimetresToMetres(falconV2?.medianDistanceMm ?? 0)).toBe(7.4);
    expect(canonicalJson(flightLabTrials)).toBe(storedBefore);
  });
});
