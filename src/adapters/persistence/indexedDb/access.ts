import type { StoreNames } from 'idb';
import type { z } from 'zod';

import { PersistenceError, type TeachDasoDatabase, type TeachDasoDb } from '../database';

export async function abortTransaction(
  tx: { abort(): void; done: Promise<void> },
  message: string,
): Promise<never> {
  const settled = tx.done.catch(() => undefined);
  tx.abort();
  await settled;
  throw new PersistenceError(message);
}

export async function getParsed<T>(
  database: TeachDasoDatabase,
  storeName: StoreNames<TeachDasoDb>,
  key: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  const raw = await database.get(storeName, key);
  if (raw === undefined) {
    return null;
  }
  return schema.parse(raw);
}

export async function listByToolIndex<T>(
  database: TeachDasoDatabase,
  storeName: Exclude<StoreNames<TeachDasoDb>, 'childProfiles' | 'meta' | 'tools'>,
  toolId: string,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const rawItems = await database.getAllFromIndex(storeName, 'toolId', toolId);
  return rawItems.map((raw) => schema.parse(raw));
}
