import type { Repositories } from '../../../core/ports/repositories';
import { createMemoryGrantRepository } from './grants';
import { createMemoryLedgerRepository } from './ledger';
import { createMemoryProfileRepository } from './profiles';
import { createEmptyMemoryRecords, type MemoryRecords } from './store';
import { createMemorySummaryRepository } from './summaries';
import { createMemoryToolRepository } from './tools';
import { createMemoryTrialRepository } from './trials';
import { createMemoryVersionRepository } from './versions';

export interface MemoryPersistence {
  readonly repositories: Repositories;
  readonly records: MemoryRecords;
}

export function createMemoryPersistence(): MemoryPersistence {
  const records = createEmptyMemoryRecords();
  return {
    records,
    repositories: {
      profiles: createMemoryProfileRepository(records),
      tools: createMemoryToolRepository(records),
      versions: createMemoryVersionRepository(records),
      ledger: createMemoryLedgerRepository(records),
      trials: createMemoryTrialRepository(records),
      grants: createMemoryGrantRepository(records),
      summaries: createMemorySummaryRepository(records),
    },
  };
}

export function createMemoryRepositories(): Repositories {
  return createMemoryPersistence().repositories;
}
