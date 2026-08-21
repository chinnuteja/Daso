import type { ExperimentTrial } from '../schema/experimentTrial';
import type { ToolVersion } from '../schema/toolVersion';
import {
  compareRanking,
  consistencySpreadMm,
  hasConsistency,
  hasMedianDistance,
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
  const useConsistency = hasConsistency(version.metrics);
  const rankByMetrics = useMedian || useConsistency;

  const byDesign = new Map<string, number[]>();
  for (const trial of trials) {
    if (validity.get(trial.trialId) !== true) {
      continue;
    }
    const distances = byDesign.get(trial.designName) ?? [];
    distances.push(metresToMillimetres(trial.distanceM));
    byDesign.set(trial.designName, distances);
  }

  const seen = new Set<string>();
  const insufficient: string[] = [];
  const metrics: DesignMetrics[] = [];

  for (const trial of trials) {
    if (seen.has(trial.designName)) {
      continue;
    }
    seen.add(trial.designName);
    const distances = byDesign.get(trial.designName);
    if (distances === undefined || distances.length === 0) {
      insufficient.push(trial.designName);
      continue;
    }
    const sorted = [...distances].sort((left, right) => left - right);
    metrics.push({
      designName: trial.designName,
      validTrialCount: sorted.length,
      ...(useMedian ? { medianDistanceMm: medianMillimetres(sorted) } : {}),
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
