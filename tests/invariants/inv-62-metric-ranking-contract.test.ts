import { describe, expect, it } from 'vitest';

import {
  compareRanking,
  consistencySpreadMm,
  medianMillimetres,
  metresToMillimetres,
  millimetresToMetres,
  replay,
} from '../../src/core/runtime';
import { compileToolVersion } from '../../src/core/compiler';
import type { ExperimentTrial } from '../../src/core/schema/experimentTrial';
import { ToolVersion } from '../../src/core/schema/toolVersion';
import type { MetricId } from '../../src/core/schema/vocabulary';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-62 — exact metric and ranking contract.
 */

const VERSION = compileToolVersion(
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

describe('INV-62 — metric and ranking contract', () => {
  it('INV-62: millimetre rounding, odd/even median, and spread', () => {
    expect(metresToMillimetres(7.4)).toBe(7400);
    expect(metresToMillimetres(8.9)).toBe(8900);
    expect(medianMillimetres([5800, 6100, 7400])).toBe(6100);
    expect(medianMillimetres([6100, 8900])).toBe(7500);
    expect(consistencySpreadMm([6100, 8900])).toBe(2800);
    expect(millimetresToMetres(7500)).toBe(7.5);
  });

  it('INV-62: median tie, consistency tie, and lexical final tie do not depend on input order', () => {
    const medianTie = compareRanking(
      { designName: 'A', medianDistanceMm: 7000, consistencyMm: 200 },
      { designName: 'B', medianDistanceMm: 7000, consistencyMm: 50 },
      ['median_distance', 'consistency'],
    );
    expect(medianTie).toBeGreaterThan(0);
    const lexical = compareRanking(
      { designName: 'Dart', medianDistanceMm: 7000, consistencyMm: 0 },
      { designName: 'Falcon', medianDistanceMm: 7000, consistencyMm: 0 },
      ['median_distance', 'consistency'],
    );
    expect(lexical).toBeLessThan(0);

    const first = replay(VERSION, [trial('trial_001', 'Falcon', 7.4), trial('trial_002', 'Glider', 7.4)]);
    const reversed = replay(VERSION, [trial('trial_002', 'Glider', 7.4), trial('trial_001', 'Falcon', 7.4)]);
    expect(first.ranking.map((entry) => entry.designName)).toEqual(['Falcon', 'Glider']);
    expect(reversed.ranking.map((entry) => entry.designName)).toEqual(['Falcon', 'Glider']);
  });

  it('INV-62: zero-valid-trial designs are excluded; empty input has no winner', () => {
    const insufficient = replay(VERSION, [
      trial('trial_001', 'Falcon', 7.4),
      trial('trial_002', 'Dart', 8.9, { validAtCapture: false }),
    ]);
    expect(insufficient.ranking.map((entry) => entry.designName)).toEqual(['Falcon']);
    expect(insufficient.insufficient).toEqual(['Dart']);
    const empty = replay(VERSION, []);
    expect(empty.ranking).toEqual([]);
    expect(empty.winner).toBeUndefined();
  });

  it('INV-62: median-only ranking ignores consistency and omits it from output', () => {
    const trials = [
      trial('trial_001', 'Dart', 6.0),
      trial('trial_002', 'Dart', 8.0),
      trial('trial_003', 'Falcon', 6.9),
      trial('trial_004', 'Falcon', 7.1),
    ];
    const both = replay(VERSION, trials);
    const medianOnly = replay(withMetrics(VERSION, ['median_distance']), trials);
    expect(both.winner).toBe('Falcon');
    expect(medianOnly.winner).toBe('Dart');
    expect(medianOnly.ranking.map((entry) => entry.designName)).toEqual(['Dart', 'Falcon']);
    expect(canonicalJson(medianOnly)).not.toContain('consistencyMm');
    expect(medianOnly.metrics.every((entry) => entry.medianDistanceMm !== undefined)).toBe(true);
  });

  it('INV-62: consistency-only ranking ignores median and omits it from output', () => {
    const trials = [
      trial('trial_001', 'Dart', 10.0),
      trial('trial_002', 'Dart', 8.0),
      trial('trial_003', 'Falcon', 7.0),
      trial('trial_004', 'Falcon', 7.0),
    ];
    const both = replay(VERSION, trials);
    const consistencyOnly = replay(withMetrics(VERSION, ['consistency']), trials);
    expect(both.winner).toBe('Dart');
    expect(consistencyOnly.winner).toBe('Falcon');
    expect(canonicalJson(consistencyOnly)).not.toContain('medianDistanceMm');
    expect(consistencyOnly.metrics.every((entry) => entry.consistencyMm !== undefined)).toBe(true);
  });

  it('INV-62: no active metrics means no ranking and no winner', () => {
    const none = replay(withMetrics(VERSION, []), [
      trial('trial_001', 'Falcon', 7.4),
      trial('trial_002', 'Dart', 8.9),
    ]);
    expect(none.ranking).toEqual([]);
    expect(none.winner).toBeUndefined();
    expect(canonicalJson(none)).not.toContain('medianDistanceMm');
    expect(canonicalJson(none)).not.toContain('consistencyMm');
  });
});
