import { describe, expect, it } from 'vitest';

import {
  compareRanking,
  consistencySpreadMm,
  medianMillimetres,
  metresToMillimetres,
  replay,
} from '../../../src/core/runtime';
import { compileToolVersion } from '../../../src/core/compiler';
import type { ExperimentTrial } from '../../../src/core/schema/experimentTrial';
import { ToolVersion } from '../../../src/core/schema/toolVersion';
import type { MetricId } from '../../../src/core/schema/vocabulary';
import { canonicalJson } from '../../../src/core/serialization/canonicalJson';
import { flightLabLedger } from '../../fixtures/ledger/flightLab';

const EMPTY_VERSION = compileToolVersion(
  flightLabLedger.filter((entry) => entry.sequence <= 10),
  { versionId: 'tool_version_001', compiledAt: '2026-08-18T10:21:00Z' },
);

function withMetrics(base: ToolVersion, metrics: readonly MetricId[]): ToolVersion {
  return ToolVersion.parse({
    ...base,
    metrics: [...metrics],
  });
}

function trial(
  trialId: ExperimentTrial['trialId'],
  designName: string,
  distanceM: number,
  extra: Partial<ExperimentTrial> = {},
): ExperimentTrial {
  return {
    trialId,
    toolId: 'mayas-flight-lab',
    toolVersionIdAtCapture: 'tool_version_001',
    designName,
    distanceM,
    obstruction: false,
    validAtCapture: true,
    validUnderCurrentVersion: true,
    createdAt: '2026-08-18T10:22:00Z',
    ...extra,
  };
}

describe('runtime metric contract', () => {
  it('rounds metres to millimetres', () => {
    expect(metresToMillimetres(7.4)).toBe(7400);
    expect(metresToMillimetres(8.9)).toBe(8900);
    expect(metresToMillimetres(7.4004)).toBe(7400);
    expect(metresToMillimetres(7.4006)).toBe(7401);
  });

  it('computes an odd-count median as the middle millimetre value', () => {
    expect(medianMillimetres([5800, 6100, 7400])).toBe(6100);
  });

  it('computes an even-count median as the mean of the two middle integers', () => {
    expect(medianMillimetres([6100, 8900])).toBe(7500);
  });

  it('computes consistency as max minus min millimetres', () => {
    expect(consistencySpreadMm([6100, 8900])).toBe(2800);
    expect(consistencySpreadMm([7400])).toBe(0);
  });

  it('breaks a median tie by consistency ascending', () => {
    expect(
      compareRanking(
        { designName: 'A', medianDistanceMm: 7000, consistencyMm: 200 },
        { designName: 'B', medianDistanceMm: 7000, consistencyMm: 50 },
        ['median_distance', 'consistency'],
      ),
    ).toBeGreaterThan(0);
  });

  it('breaks a consistency tie by designName code-point order', () => {
    expect(
      compareRanking(
        { designName: 'Dart', medianDistanceMm: 7000, consistencyMm: 0 },
        { designName: 'Falcon', medianDistanceMm: 7000, consistencyMm: 0 },
        ['median_distance', 'consistency'],
      ),
    ).toBeLessThan(0);
  });

  it('excludes designs with zero valid trials and reports them as insufficient', () => {
    const result = replay(EMPTY_VERSION, [
      trial('trial_001', 'Falcon', 7.4),
      trial('trial_002', 'Dart', 8.9, { obstruction: true, validAtCapture: false }),
    ]);
    expect(result.ranking.map((entry) => entry.designName)).toEqual(['Falcon']);
    expect(result.insufficient).toEqual(['Dart']);
    expect(result.winner).toBe('Falcon');
  });

  it('returns no winner and empty ranking for empty input', () => {
    const result = replay(EMPTY_VERSION, []);
    expect(result.ranking).toEqual([]);
    expect(result.winner).toBeUndefined();
    expect(result.insufficient).toEqual([]);
    expect(result.projections).toEqual([]);
  });

  it('ranks by median only when consistency is not an active metric', () => {
    const trials = [
      trial('trial_001', 'Dart', 6.0),
      trial('trial_002', 'Dart', 8.0),
      trial('trial_003', 'Falcon', 6.9),
      trial('trial_004', 'Falcon', 7.1),
    ];
    expect(replay(EMPTY_VERSION, trials).winner).toBe('Falcon');
    const medianOnly = replay(withMetrics(EMPTY_VERSION, ['median_distance']), trials);
    expect(medianOnly.winner).toBe('Dart');
    expect(canonicalJson(medianOnly)).not.toContain('consistencyMm');
  });

  it('ranks by consistency only when median is not an active metric', () => {
    const trials = [
      trial('trial_001', 'Dart', 10.0),
      trial('trial_002', 'Dart', 8.0),
      trial('trial_003', 'Falcon', 7.0),
      trial('trial_004', 'Falcon', 7.0),
    ];
    expect(replay(EMPTY_VERSION, trials).winner).toBe('Dart');
    const consistencyOnly = replay(withMetrics(EMPTY_VERSION, ['consistency']), trials);
    expect(consistencyOnly.winner).toBe('Falcon');
    expect(canonicalJson(consistencyOnly)).not.toContain('medianDistanceMm');
  });

  it('produces no ranking when the version has no metrics', () => {
    const none = replay(withMetrics(EMPTY_VERSION, []), [trial('trial_001', 'Falcon', 7.4)]);
    expect(none.ranking).toEqual([]);
    expect(none.winner).toBeUndefined();
  });
});
