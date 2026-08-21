import type { ParentSummaryRepository } from '../../../core/ports/repositories';
import { ParentSummary } from '../../../core/schema/parentSummary';
import type { ToolId } from '../../../core/schema/primitives';
import type { MemoryRecords } from './store';

export function createMemorySummaryRepository(records: MemoryRecords): ParentSummaryRepository {
  return {
    async listByTool(toolId: ToolId): Promise<readonly ParentSummary[]> {
      const found: ParentSummary[] = [];
      for (const raw of records.summaries.values()) {
        const parsed = ParentSummary.parse(raw);
        if (parsed.toolId === toolId) {
          found.push(parsed);
        }
      }
      return found.sort((left, right) => (left.summaryId < right.summaryId ? -1 : 1));
    },

    async save(summary: ParentSummary): Promise<void> {
      const parsed = ParentSummary.parse(summary);
      records.summaries.set(parsed.summaryId, parsed);
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      for (const [summaryId, raw] of records.summaries.entries()) {
        const parsed = ParentSummary.parse(raw);
        if (parsed.toolId === toolId) {
          records.summaries.delete(summaryId);
        }
      }
    },
  };
}
