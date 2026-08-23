import type { ToolDefinitionRepository } from '../../../core/ports/repositories';
import type { ChildId, ToolId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { requireActiveVersion } from '../definitionPointer';
import { rejectLineageOnDirectWrite } from '../forkCommit';
import { deleteMemoryToolGraph } from './deleteGraph';
import type { MemoryRecords } from './store';

export function createMemoryToolRepository(records: MemoryRecords): ToolDefinitionRepository {
  return {
    async get(toolId: ToolId): Promise<ToolDefinition | null> {
      const raw = records.tools.get(toolId);
      if (raw === undefined) {
        return null;
      }
      return ToolDefinition.parse(raw);
    },

    async listByOwner(childId: ChildId): Promise<readonly ToolDefinition[]> {
      const found: ToolDefinition[] = [];
      for (const raw of records.tools.values()) {
        const parsed = ToolDefinition.parse(raw);
        if (parsed.ownerChildId === childId) {
          found.push(parsed);
        }
      }
      return found.sort((left, right) => (left.toolId < right.toolId ? -1 : 1));
    },

    async save(definition: ToolDefinition): Promise<void> {
      const parsed = ToolDefinition.parse(definition);
      rejectLineageOnDirectWrite(parsed);
      const previous = records.tools.get(parsed.toolId);
      const rawVersion = records.versions.get(parsed.currentVersionId);
      const version = rawVersion === undefined ? null : ToolVersion.parse(rawVersion);
      try {
        requireActiveVersion(parsed, version);
      } catch (error) {
        if (previous !== undefined) {
          records.tools.set(parsed.toolId, previous);
        }
        throw error;
      }
      records.tools.set(parsed.toolId, parsed);
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      records.tools.delete(toolId);
    },

    async deleteToolGraph(toolId: ToolId): Promise<void> {
      deleteMemoryToolGraph(records, toolId);
    },
  };
}
