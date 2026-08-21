import type { ExperimentTrialRepository } from '../../../core/ports/repositories';
import { ExperimentTrial } from '../../../core/schema/experimentTrial';
import type { ToolId, TrialId } from '../../../core/schema/primitives';
import type { MemoryRecords } from './store';

export function createMemoryTrialRepository(records: MemoryRecords): ExperimentTrialRepository {
  return {
    async get(trialId: TrialId): Promise<ExperimentTrial | null> {
      const raw = records.trials.get(trialId);
      if (raw === undefined) {
        return null;
      }
      return ExperimentTrial.parse(raw);
    },

    async listByTool(toolId: ToolId): Promise<readonly ExperimentTrial[]> {
      const found: ExperimentTrial[] = [];
      for (const raw of records.trials.values()) {
        const parsed = ExperimentTrial.parse(raw);
        if (parsed.toolId === toolId) {
          found.push(parsed);
        }
      }
      return found.sort((left, right) => (left.trialId < right.trialId ? -1 : 1));
    },

    async save(trial: ExperimentTrial): Promise<void> {
      const parsed = ExperimentTrial.parse(trial);
      records.trials.set(parsed.trialId, parsed);
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      for (const [trialId, raw] of records.trials.entries()) {
        const parsed = ExperimentTrial.parse(raw);
        if (parsed.toolId === toolId) {
          records.trials.delete(trialId);
        }
      }
    },
  };
}
