import type { ExperimentTrialRepository } from '../../../core/ports/repositories';
import { ExperimentTrial } from '../../../core/schema/experimentTrial';
import type { ToolId, TrialId } from '../../../core/schema/primitives';
import { STORE, type TeachDasoDatabase } from '../database';
import { getParsed, listByToolIndex } from './access';

export function createIndexedDbTrialRepository(
  database: TeachDasoDatabase,
): ExperimentTrialRepository {
  return {
    async get(trialId: TrialId): Promise<ExperimentTrial | null> {
      return getParsed(database, STORE.trials, trialId, ExperimentTrial);
    },

    async listByTool(toolId: ToolId): Promise<readonly ExperimentTrial[]> {
      const found = await listByToolIndex(database, STORE.trials, toolId, ExperimentTrial);
      return found.sort((left, right) => (left.trialId < right.trialId ? -1 : 1));
    },

    async save(trial: ExperimentTrial): Promise<void> {
      await database.put(STORE.trials, ExperimentTrial.parse(trial));
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      const found = await listByToolIndex(database, STORE.trials, toolId, ExperimentTrial);
      const tx = database.transaction(STORE.trials, 'readwrite');
      for (const trial of found) {
        await tx.store.delete(trial.trialId);
      }
      await tx.done;
    },
  };
}
