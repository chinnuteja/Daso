import type { Repositories } from '../../core/ports/repositories';
import { ChildProfile } from '../../core/schema/childProfile';
import { ExperimentTrial } from '../../core/schema/experimentTrial';
import { ParentSummary } from '../../core/schema/parentSummary';
import { PermissionGrant } from '../../core/schema/permissionGrant';
import { ToolDefinition } from '../../core/schema/toolDefinition';
import { ToolVersion } from '../../core/schema/toolVersion';
import type { LedgerEntry } from '../../core/ledger/types';
import type { DrawAssetRepository } from '../../core/ports/repositories';
import type { CapabilityLifecycleRepository } from '../../core/ports/repositories';
import { createMemoryPersistence } from './memory';
import { openIndexedDbRepositories } from './indexedDb';

export { DATABASE_NAME, DATABASE_VERSION, STORE, openTeachDasoDatabase, PersistenceError } from './database';
export type { TeachDasoDatabase } from './database';
export {
  setFailAfterDeleteWrite,
  setFailAfterCapabilityWrite,
  setFailAfterForkWrite,
  setFailAfterVersionWrite,
} from './atomicCommit';
export { loadIdCounters, saveIdCounters, loadMemoryIdCounters, saveMemoryIdCounters } from './idCounters';
export { createIndexedDbRepositories, openIndexedDbRepositories } from './indexedDb';
export { createMemoryPersistence, createMemoryRepositories } from './memory';
export type { MemoryPersistence } from './memory';
export type { MemoryRecords } from './memory/store';

/**
 * The UI can remain usable in browser sandboxes that intentionally do not expose IndexedDB.
 * That fallback is explicitly ephemeral; normal product browsers still use the local database.
 */
export async function openBrowserDrawAssets(): Promise<{
  readonly drawAssets: DrawAssetRepository;
  readonly capabilities: CapabilityLifecycleRepository;
  readonly durable: boolean;
  readonly close: () => void;
}> {
  const fallback = () => ({
    ...(() => {
      const persistence = createMemoryPersistence();
      return {
        drawAssets: persistence.repositories.drawAssets,
        capabilities: persistence.repositories.capabilities,
      };
    })(),
    durable: false,
    close: () => undefined,
  });
  if (typeof indexedDB === 'undefined') {
    return fallback();
  }
  const opening = openIndexedDbRepositories();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const opened = await Promise.race([
      opening,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Local storage did not become ready.')), 2_000);
      }),
    ]);
    return {
      drawAssets: opened.repositories.drawAssets,
    capabilities: opened.repositories.capabilities,
      durable: true,
      close: () => opened.database.close(),
    };
  } catch {
    // A blocked/private browser must still let a child draw. If its late IDB request succeeds,
    // close it rather than leaving a hidden connection alive.
    void opening.then(({ database }) => database.close()).catch(() => undefined);
    return fallback();
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

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
