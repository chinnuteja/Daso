import type { ToolDefinitionRepository } from '../../../core/ports/repositories';
import type { ChildId, ToolId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
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
      records.tools.set(parsed.toolId, parsed);
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      records.tools.delete(toolId);
    },
  };
}
