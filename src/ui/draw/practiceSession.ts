import { openIndexedDbRepositories } from '../../adapters/persistence';

/** Only new, explicitly labelled Draw practice uses this separate identity. */
export const DRAW_PRACTICE_OWNER = 'child_kale_practice_01';

export async function resetDrawPractice(databaseName?: string): Promise<void> {
  const opened = await openIndexedDbRepositories(databaseName);
  try {
    await opened.repositories.profiles.deleteProfileGraph(DRAW_PRACTICE_OWNER);
  } finally { opened.database.close(); }
}
