import type { ToolDefinitionRepository } from '../../../core/ports/repositories';
import type { ChildId, ToolId } from '../../../core/schema/primitives';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { requireActiveVersion } from '../definitionPointer';
import { rejectLineageOnDirectWrite } from '../forkCommit';
import { STORE, type TeachDasoDatabase } from '../database';
import { abortTransaction, getParsed } from './access';

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
      const parsed = ToolDefinition.parse(definition);
      rejectLineageOnDirectWrite(parsed);
      const tx = database.transaction([STORE.tools, STORE.toolVersions], 'readwrite');
      const toolStore = tx.objectStore(STORE.tools);
      const versionStore = tx.objectStore(STORE.toolVersions);
      const rawVersion = await versionStore.get(parsed.currentVersionId);
      const version = rawVersion === undefined ? null : ToolVersion.parse(rawVersion);
      try {
        requireActiveVersion(parsed, version);
      } catch (error) {
        await abortTransaction(
          tx,
          error instanceof Error ? error.message : 'definition pointer is invalid',
        );
      }
      await toolStore.put(parsed);
      await tx.done;
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      await database.delete(STORE.tools, toolId);
    },
  };
}
