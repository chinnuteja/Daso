import { buildEvidenceProjection } from '../../src/core/evidence';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

export function flightLabProjection() {
  const graph = flightLabGraph();
  const tool = graph.tools[0];
  const version = graph.versions.find((candidate) => candidate.versionId === tool?.currentVersionId);
  if (tool === undefined || version === undefined) {
    throw new Error('flight lab graph is missing the active version');
  }
  return {
    graph,
    tool,
    version,
    projection: buildEvidenceProjection({
      tool,
      ownerDisplayName: graph.profile.displayName,
      version,
      ledger: graph.entries,
      trials: graph.trials,
    }),
  };
}
