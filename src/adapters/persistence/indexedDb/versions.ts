import type { ToolVersionRepository } from '../../../core/ports/repositories';
import type { ToolId, ToolVersionId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { deepFreeze } from '../../../core/serialization/deepFreeze';
import { shouldFailAfterVersionWrite } from '../atomicCommit';
import { PersistenceError, STORE, type TeachDasoDatabase } from '../database';
import { abortTransaction, getParsed, listByToolIndex } from './access';

export function createIndexedDbVersionRepository(
  database: TeachDasoDatabase,
): ToolVersionRepository {
  return {
    async get(versionId: ToolVersionId): Promise<ToolVersion | null> {
      const parsed = await getParsed(database, STORE.toolVersions, versionId, ToolVersion);
      return parsed === null ? null : deepFreeze(parsed);
    },

    async listByTool(toolId: ToolId): Promise<readonly ToolVersion[]> {
      const found = await listByToolIndex(database, STORE.toolVersions, toolId, ToolVersion);
      return found
        .map((version) => deepFreeze(version))
        .sort((left, right) => left.version - right.version);
    },

    async save(version: ToolVersion): Promise<void> {
      const parsed = ToolVersion.parse(version);
      const existing = await database.get(STORE.toolVersions, parsed.versionId);
      if (existing !== undefined) {
        throw new PersistenceError(
          `version ${parsed.versionId} already exists; compiled versions are immutable`,
        );
      }
      await database.put(STORE.toolVersions, parsed);
    },

    async saveAndActivate(version: ToolVersion, definition: ToolDefinition): Promise<void> {
      const parsedVersion = ToolVersion.parse(version);
      const parsedDefinition = ToolDefinition.parse(definition);
      if (parsedVersion.toolId !== parsedDefinition.toolId) {
        throw new PersistenceError('version and definition must name the same tool');
      }
      if (parsedDefinition.currentVersionId !== parsedVersion.versionId) {
        throw new PersistenceError('definition must point at the version being activated');
      }

      const tx = database.transaction([STORE.toolVersions, STORE.tools], 'readwrite');
      const versionStore = tx.objectStore(STORE.toolVersions);
      const toolStore = tx.objectStore(STORE.tools);
      const existing = await versionStore.get(parsedVersion.versionId);
      if (existing !== undefined) {
        await abortTransaction(
          tx,
          `version ${parsedVersion.versionId} already exists; compiled versions are immutable`,
        );
      }
      await versionStore.put(parsedVersion);
      if (shouldFailAfterVersionWrite()) {
        await abortTransaction(tx, 'injected compilation failure after version write');
      }
      await toolStore.put(parsedDefinition);
      await tx.done;
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      const found = await listByToolIndex(database, STORE.toolVersions, toolId, ToolVersion);
      const tx = database.transaction(STORE.toolVersions, 'readwrite');
      for (const version of found) {
        await tx.store.delete(version.versionId);
      }
      await tx.done;
    },
  };
}
