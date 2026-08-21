import type { ToolVersionRepository } from '../../../core/ports/repositories';
import type { ToolId, ToolVersionId } from '../../../core/schema/primitives';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { deepFreeze } from '../../../core/serialization/deepFreeze';
import { PersistenceError, STORE, type TeachDasoDatabase } from '../database';
import { getParsed, listByToolIndex } from './access';

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
