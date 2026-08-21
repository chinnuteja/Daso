import { z } from 'zod';

import type { IdCounters } from '../../core/ports/ids';
import type { TeachDasoDatabase } from './database';
import { STORE } from './database';
import type { MemoryRecords } from './memory/store';

export const ID_COUNTERS_META_KEY = 'idCounters';

const PersistedIdCounters = z.strictObject({
  event: z.number().int().nonnegative().optional(),
  tool_version: z.number().int().nonnegative().optional(),
  trial: z.number().int().nonnegative().optional(),
  summary: z.number().int().nonnegative().optional(),
  grant: z.number().int().nonnegative().optional(),
});

const IdCountersMeta = PersistedIdCounters.extend({
  key: z.literal(ID_COUNTERS_META_KEY),
});

export function parseIdCounters(value: unknown): IdCounters {
  if (value === undefined || value === null) {
    return {};
  }
  const parsed = IdCountersMeta.safeParse(value);
  if (parsed.success) {
    const { key: _key, ...counters } = parsed.data;
    return PersistedIdCounters.parse(counters);
  }
  return PersistedIdCounters.parse(value);
}

export async function loadIdCounters(database: TeachDasoDatabase): Promise<IdCounters> {
  return parseIdCounters(await database.get(STORE.meta, ID_COUNTERS_META_KEY));
}

export async function saveIdCounters(
  database: TeachDasoDatabase,
  counters: IdCounters,
): Promise<void> {
  const record = IdCountersMeta.parse({ key: ID_COUNTERS_META_KEY, ...PersistedIdCounters.parse(counters) });
  await database.put(STORE.meta, record);
}

export function loadMemoryIdCounters(records: MemoryRecords): IdCounters {
  return parseIdCounters(records.meta.get(ID_COUNTERS_META_KEY));
}

export function saveMemoryIdCounters(records: MemoryRecords, counters: IdCounters): void {
  const record = IdCountersMeta.parse({
    key: ID_COUNTERS_META_KEY,
    ...PersistedIdCounters.parse(counters),
  });
  records.meta.set(ID_COUNTERS_META_KEY, record);
}
