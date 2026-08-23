import type { Repositories } from '../../core/ports/repositories';
import { ChildProfile } from '../../core/schema/childProfile';
import { ExperimentTrial } from '../../core/schema/experimentTrial';
import { ParentSummary } from '../../core/schema/parentSummary';
import { PermissionGrant } from '../../core/schema/permissionGrant';
import { ToolDefinition } from '../../core/schema/toolDefinition';
import { ToolVersion } from '../../core/schema/toolVersion';
import type { LedgerEntry } from '../../core/ledger/types';

export { DATABASE_NAME, DATABASE_VERSION, STORE, openTeachDasoDatabase, PersistenceError } from './database';
export type { TeachDasoDatabase } from './database';
export {
  setFailAfterDeleteWrite,
  setFailAfterForkWrite,
  setFailAfterVersionWrite,
} from './atomicCommit';
export { loadIdCounters, saveIdCounters, loadMemoryIdCounters, saveMemoryIdCounters } from './idCounters';
export { createIndexedDbRepositories, openIndexedDbRepositories } from './indexedDb';
export { createMemoryPersistence, createMemoryRepositories } from './memory';
export type { MemoryPersistence } from './memory';
export type { MemoryRecords } from './memory/store';

export interface PersistableGraph {
  readonly profile: ChildProfile;
  readonly tools: readonly ToolDefinition[];
  readonly versions: readonly ToolVersion[];
  readonly entries: readonly LedgerEntry[];
  readonly trials: readonly ExperimentTrial[];
  readonly grants: readonly PermissionGrant[];
  readonly summaries: readonly ParentSummary[];
}

export async function persistGraph(
  repositories: Repositories,
  graph: PersistableGraph,
): Promise<void> {
  await repositories.profiles.save(ChildProfile.parse(graph.profile));
  // Versions first: tools.save rejects a pointer to a missing or other-tool version.
  for (const version of graph.versions) {
    await repositories.versions.save(ToolVersion.parse(version));
  }
  for (const tool of graph.tools) {
    await repositories.tools.save(ToolDefinition.parse(tool));
  }
  for (const entry of graph.entries) {
    await repositories.ledger.append(entry);
  }
  for (const trial of graph.trials) {
    await repositories.trials.save(ExperimentTrial.parse(trial));
  }
  for (const grant of graph.grants) {
    await repositories.grants.save(PermissionGrant.parse(grant));
  }
  for (const summary of graph.summaries) {
    await repositories.summaries.save(ParentSummary.parse(summary));
  }
}
