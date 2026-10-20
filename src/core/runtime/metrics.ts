import type { MetricId } from '../schema/vocabulary';

/**
 * Distance arithmetic is integer millimetres. Metres are converted once with rounding so
 * ranking never depends on binary floating-point accident.
 */
export function metresToMillimetres(distanceM: number): number {
  return Math.round(distanceM * 1000);
}

export function millimetresToMetres(distanceMm: number): number {
  return distanceMm / 1000;
}

export function hasMedianDistance(metrics: readonly MetricId[]): boolean {
  return metrics.includes('median_distance');
}

export function hasMedianLoad(metrics: readonly MetricId[]): boolean {
  return metrics.includes('median_load');
}

export function hasConsistency(metrics: readonly MetricId[]): boolean {
  return metrics.includes('consistency');
}

/** Odd count: the middle value. Even count: arithmetic mean of the two middle integers. */
export function medianMillimetres(sortedAscending: readonly number[]): number {
  if (sortedAscending.length === 0) {
    throw new RangeError('median of an empty list is undefined');
  }
  const middle = Math.floor(sortedAscending.length / 2);
  if (sortedAscending.length % 2 === 1) {
    const value = sortedAscending[middle];
    if (value === undefined) {
      throw new RangeError('median index was missing');
    }
    return value;
  }
  const left = sortedAscending[middle - 1];
  const right = sortedAscending[middle];
  if (left === undefined || right === undefined) {
    throw new RangeError('median pair was missing');
  }
  return (left + right) / 2;
}

export function consistencySpreadMm(sortedAscending: readonly number[]): number {
  const first = sortedAscending[0];
  const last = sortedAscending[sortedAscending.length - 1];
  if (first === undefined || last === undefined) {
    throw new RangeError('consistency of an empty list is undefined');
  }
  return last - first;
}

export interface RankingComparable {
  readonly designName: string;
  readonly medianDistanceMm?: number;
  readonly medianLoadCount?: number;
  readonly consistencyMm?: number;
}

/**
 * Total order over the version's active metrics only.
 * Active median metrics: descending, then consistency ascending, then designName code-point.
 * A version may compare distance, load, or both; inactive metrics never participate.
 * Consistency only: consistency ascending, then designName.
 * Does not rely on sort stability.
 */
export function compareRanking(
  left: RankingComparable,
  right: RankingComparable,
  activeMetrics: readonly MetricId[],
): number {
  if (hasMedianDistance(activeMetrics)) {
    const leftMedian = requireMetric(left.medianDistanceMm, 'medianDistanceMm');
    const rightMedian = requireMetric(right.medianDistanceMm, 'medianDistanceMm');
    if (leftMedian !== rightMedian) {
      return rightMedian - leftMedian;
    }
  }
  if (hasMedianLoad(activeMetrics)) {
    const leftMedian = requireMetric(left.medianLoadCount, 'medianLoadCount');
    const rightMedian = requireMetric(right.medianLoadCount, 'medianLoadCount');
    if (leftMedian !== rightMedian) {
      return rightMedian - leftMedian;
    }
  }
  if (hasConsistency(activeMetrics)) {
    const leftSpread = requireMetric(left.consistencyMm, 'consistencyMm');
    const rightSpread = requireMetric(right.consistencyMm, 'consistencyMm');
    if (leftSpread !== rightSpread) {
      return leftSpread - rightSpread;
    }
  }
  if (left.designName < right.designName) {
    return -1;
  }
  if (left.designName > right.designName) {
    return 1;
  }
  return 0;
}

function requireMetric(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new RangeError(`${label} is required when that metric is active`);
  }
  return value;
}
