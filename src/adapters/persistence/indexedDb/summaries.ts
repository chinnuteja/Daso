import type { ParentSummaryRepository } from '../../../core/ports/repositories';
import { ParentSummary } from '../../../core/schema/parentSummary';
import type { ToolId } from '../../../core/schema/primitives';
import { STORE, type TeachDasoDatabase } from '../database';
import { listByToolIndex } from './access';

export function createIndexedDbSummaryRepository(
  database: TeachDasoDatabase,
): ParentSummaryRepository {
  return {
    async listByTool(toolId: ToolId): Promise<readonly ParentSummary[]> {
      const found = await listByToolIndex(database, STORE.summaries, toolId, ParentSummary);
      return found.sort((left, right) => (left.summaryId < right.summaryId ? -1 : 1));
    },

    async save(summary: ParentSummary): Promise<void> {
      await database.put(STORE.summaries, ParentSummary.parse(summary));
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      const found = await listByToolIndex(database, STORE.summaries, toolId, ParentSummary);
      const tx = database.transaction(STORE.summaries, 'readwrite');
      for (const summary of found) {
        await tx.store.delete(summary.summaryId);
      }
      await tx.done;
    },
  };
}
