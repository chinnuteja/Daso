import type { ToolVersionRepository } from '../../../core/ports/repositories';
import type { ToolId, ToolVersionId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { deepFreeze } from '../../../core/serialization/deepFreeze';
import { shouldFailAfterVersionWrite } from '../atomicCommit';
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

    async saveAndActivate(version: ToolVersion, definition: ToolDefinition): Promise<void> {
      const parsedVersion = ToolVersion.parse(version);
      const parsedDefinition = ToolDefinition.parse(definition);
      if (parsedVersion.toolId !== parsedDefinition.toolId) {
        throw new PersistenceError('version and definition must name the same tool');
      }
      if (parsedDefinition.currentVersionId !== parsedVersion.versionId) {
        throw new PersistenceError('definition must point at the version being activated');
      }
      if (records.versions.has(parsedVersion.versionId)) {
        throw new PersistenceError(
          `version ${parsedVersion.versionId} already exists; compiled versions are immutable`,
        );
      }

      const versionsSnapshot = new Map(records.versions);
      const toolsSnapshot = new Map(records.tools);
      try {
        records.versions.set(parsedVersion.versionId, parsedVersion);
        if (shouldFailAfterVersionWrite()) {
          throw new PersistenceError('injected compilation failure after version write');
        }
        records.tools.set(parsedDefinition.toolId, parsedDefinition);
      } catch (error) {
        records.versions.clear();
        for (const [key, value] of versionsSnapshot) {
          records.versions.set(key, value);
        }
        records.tools.clear();
        for (const [key, value] of toolsSnapshot) {
          records.tools.set(key, value);
        }
        throw error;
      }
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
