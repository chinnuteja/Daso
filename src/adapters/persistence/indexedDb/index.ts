import type { Repositories } from '../../../core/ports/repositories';
import { openTeachDasoDatabase, type TeachDasoDatabase } from '../database';
import { createIndexedDbGrantRepository } from './grants';
import { createIndexedDbLedgerRepository } from './ledgerRepository';
import { createIndexedDbProfileRepository } from './profiles';
import { createIndexedDbSummaryRepository } from './summaries';
import { createIndexedDbToolRepository } from './tools';
import { createIndexedDbTrialRepository } from './trials';
import { createIndexedDbVersionRepository } from './versions';

export function createIndexedDbRepositories(database: TeachDasoDatabase): Repositories {
  return {
    profiles: createIndexedDbProfileRepository(database),
    tools: createIndexedDbToolRepository(database),
    versions: createIndexedDbVersionRepository(database),
    ledger: createIndexedDbLedgerRepository(database),
    trials: createIndexedDbTrialRepository(database),
    grants: createIndexedDbGrantRepository(database),
    summaries: createIndexedDbSummaryRepository(database),
  };
}

export async function openIndexedDbRepositories(
  name?: string,
): Promise<{ readonly repositories: Repositories; readonly database: TeachDasoDatabase }> {
  const database = await openTeachDasoDatabase(name);
  return {
    database,
    repositories: createIndexedDbRepositories(database),
  };
}
