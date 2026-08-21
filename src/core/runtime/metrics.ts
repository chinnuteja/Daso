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

/**
 * Total ordering: median descending, consistency ascending, designName by code-point.
 * Does not rely on sort stability.
 */
export function compareRanking(
  left: { readonly designName: string; readonly medianDistanceMm: number; readonly consistencyMm: number },
  right: { readonly designName: string; readonly medianDistanceMm: number; readonly consistencyMm: number },
): number {
  if (left.medianDistanceMm !== right.medianDistanceMm) {
    return right.medianDistanceMm - left.medianDistanceMm;
  }
  if (left.consistencyMm !== right.consistencyMm) {
    return left.consistencyMm - right.consistencyMm;
  }
  if (left.designName < right.designName) {
    return -1;
  }
  if (left.designName > right.designName) {
    return 1;
  }
  return 0;
}
