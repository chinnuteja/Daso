import type { ExperimentTrial } from '../schema/experimentTrial';
import type { ToolVersion } from '../schema/toolVersion';
import {
  compareRanking,
  consistencySpreadMm,
  hasConsistency,
  hasMedianDistance,
  hasMedianLoad,
  medianMillimetres,
  metresToMillimetres,
} from './metrics';
import { projectTrial } from './rules';
import { RuntimeResult, type DesignMetrics, type RankingEntry } from './types';

/**
 * Deterministic replay of stored observations under a compiled version. Performs no I/O
 * and persists nothing. Does not mutate the caller's trials or version.
 * Ranking and metric fields follow `version.metrics`; inactive metrics are not computed.
 */
export function replay(version: ToolVersion, trials: readonly ExperimentTrial[]): RuntimeResult {
  const projections = trials.map((trial) => projectTrial(trial, version.rules));
  const validity = new Map(
    projections.map((projection) => [projection.trialId, projection.validUnderCurrentVersion]),
  );
  const useMedian = hasMedianDistance(version.metrics);
  const useLoad = hasMedianLoad(version.metrics);
  const useConsistency = hasConsistency(version.metrics);
  const rankByMetrics = useMedian || useLoad || useConsistency;

  const byDesign = new Map<string, { distances: number[]; loads: number[] }>();
  for (const trial of trials) {
    if (validity.get(trial.trialId) !== true) {
      continue;
    }
    const values = byDesign.get(trial.designName) ?? { distances: [], loads: [] };
    if ((useMedian || useConsistency) && trial.distanceM !== undefined) {
      values.distances.push(metresToMillimetres(trial.distanceM));
    }
    if (useLoad && trial.loadCount !== undefined) values.loads.push(trial.loadCount);
    byDesign.set(trial.designName, values);
  }

  const seen = new Set<string>();
  const insufficient: string[] = [];
  const metrics: DesignMetrics[] = [];

  for (const trial of trials) {
    if (seen.has(trial.designName)) {
      continue;
    }
    seen.add(trial.designName);
    const values = byDesign.get(trial.designName);
    const hasRequiredMeasurement = values !== undefined &&
      ((!useMedian && !useConsistency) || values.distances.length > 0) &&
      (!useLoad || values.loads.length > 0);
    if (!hasRequiredMeasurement || values === undefined) {
      insufficient.push(trial.designName);
      continue;
    }
    const sorted = [...values.distances].sort((left, right) => left - right);
    const loads = [...values.loads].sort((left, right) => left - right);
    metrics.push({
      designName: trial.designName,
      validTrialCount: useLoad ? loads.length : sorted.length,
      ...(useMedian ? { medianDistanceMm: medianMillimetres(sorted) } : {}),
      ...(useLoad ? { medianLoadCount: medianMillimetres(loads) } : {}),
      ...(useConsistency ? { consistencyMm: consistencySpreadMm(sorted) } : {}),
    });
  }

  if (!rankByMetrics) {
    return RuntimeResult.parse({
      versionId: version.versionId,
      projections,
      metrics,
      ranking: [],
      insufficient,
    });
  }

  const ordered = [...metrics].sort((left, right) => compareRanking(left, right, version.metrics));
  const ranking: RankingEntry[] = ordered.map((entry, index) => ({
    rank: index + 1,
    designName: entry.designName,
    ...(entry.medianDistanceMm === undefined ? {} : { medianDistanceMm: entry.medianDistanceMm }),
    ...(entry.consistencyMm === undefined ? {} : { consistencyMm: entry.consistencyMm }),
  }));
  const winner = ranking[0]?.designName;

  return RuntimeResult.parse({
    versionId: version.versionId,
    projections,
    metrics: ordered,
    ranking,
    ...(winner === undefined ? {} : { winner }),
    insufficient,
  });
}

export function validityChanges(
  previous: RuntimeResult,
  current: RuntimeResult,
): readonly string[] {
  const changed: string[] = [];
  for (const projection of current.projections) {
    const earlier = previous.projections.find((candidate) => candidate.trialId === projection.trialId);
    if (earlier !== undefined && earlier.validUnderCurrentVersion !== projection.validUnderCurrentVersion) {
      changed.push(projection.trialId);
    }
  }
  return changed;
}
