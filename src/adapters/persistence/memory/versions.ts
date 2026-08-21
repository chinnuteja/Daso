import type { ToolVersionRepository } from '../../../core/ports/repositories';
import type { ToolId, ToolVersionId } from '../../../core/schema/primitives';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { deepFreeze } from '../../../core/serialization/deepFreeze';
import { PersistenceError } from '../database';
import type { MemoryRecords } from './store';

export function createMemoryVersionRepository(records: MemoryRecords): ToolVersionRepository {
  return {
    async get(versionId: ToolVersionId): Promise<ToolVersion | null> {
      const raw = records.versions.get(versionId);
      if (raw === undefined) {
        return null;
      }
      return deepFreeze(ToolVersion.parse(raw));
    },

    async listByTool(toolId: ToolId): Promise<readonly ToolVersion[]> {
      const found: ToolVersion[] = [];
      for (const raw of records.versions.values()) {
        const parsed = ToolVersion.parse(raw);
        if (parsed.toolId === toolId) {
          found.push(deepFreeze(parsed));
        }
      }
      return found.sort((left, right) => left.version - right.version);
    },

    async save(version: ToolVersion): Promise<void> {
      const parsed = ToolVersion.parse(version);
      if (records.versions.has(parsed.versionId)) {
        throw new PersistenceError(
          `version ${parsed.versionId} already exists; compiled versions are immutable`,
        );
      }
      records.versions.set(parsed.versionId, parsed);
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      for (const [versionId, raw] of records.versions.entries()) {
        const parsed = ToolVersion.parse(raw);
        if (parsed.toolId === toolId) {
          records.versions.delete(versionId);
        }
      }
    },
  };
}
