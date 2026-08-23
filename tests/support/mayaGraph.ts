import type { Repositories } from '../../src/core/ports/repositories';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/persistence/flightLab';

export async function mayaGraphCanonical(repositories: Repositories): Promise<string> {
  return canonicalJson({
    definition: await repositories.tools.get(FLIGHT_LAB_TOOL_ID),
    versions: await repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID),
    ledger: await repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID),
    trials: await repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID),
    grants: await repositories.grants.listByTool(FLIGHT_LAB_TOOL_ID),
    summaries: await repositories.summaries.listByTool(FLIGHT_LAB_TOOL_ID),
  });
}
