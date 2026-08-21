import type { ToolDefinitionRepository } from '../../../core/ports/repositories';
import type { ChildId, ToolId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { STORE, type TeachDasoDatabase } from '../database';
import { getParsed } from './access';

export function createIndexedDbToolRepository(database: TeachDasoDatabase): ToolDefinitionRepository {
  return {
    async get(toolId: ToolId): Promise<ToolDefinition | null> {
      return getParsed(database, STORE.tools, toolId, ToolDefinition);
    },

    async listByOwner(childId: ChildId): Promise<readonly ToolDefinition[]> {
      const rawItems = await database.getAllFromIndex(STORE.tools, 'ownerChildId', childId);
      return rawItems
        .map((raw) => ToolDefinition.parse(raw))
        .sort((left, right) => (left.toolId < right.toolId ? -1 : 1));
    },

    async save(definition: ToolDefinition): Promise<void> {
      await database.put(STORE.tools, ToolDefinition.parse(definition));
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      await database.delete(STORE.tools, toolId);
    },
  };
}
