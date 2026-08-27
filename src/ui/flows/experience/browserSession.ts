import { loadIdCounters, openIndexedDbRepositories, saveIdCounters } from '../../../adapters/persistence';
import { createSequentialIdFactory } from '../../../core/ports/ids';
import { ChildId, ToolId } from '../../../core/schema/primitives';
import { createBrowserClock } from '../browserClock';
import type { ExperienceContext } from './session';

const POINTER_KEY = 'result-first-example';
interface ExamplePointer { readonly toolId: string; readonly ownerChildId: string }

function parsePointer(value: unknown): ExamplePointer | null {
  if (typeof value !== 'object' || value === null || !('toolId' in value) || !('ownerChildId' in value)) return null;
  const tool = ToolId.safeParse(value.toolId);
  const owner = ChildId.safeParse(value.ownerChildId);
  return tool.success && owner.success ? { toolId: tool.data, ownerChildId: owner.data } : null;
}

async function openLocalStore(databaseName?: string) {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const opening = openIndexedDbRepositories(databaseName).then((session) => {
    if (expired) { session.database.close(); throw new Error('Storage took too long to open.'); }
    return session;
  });
  try {
    return await Promise.race([
      opening,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { expired = true; reject(new Error('Local storage is taking too long. Close other Teach Daso tabs and retry.')); }, 8000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function withExperience<T>(create: boolean, action: (context: ExperienceContext | null) => Promise<T>, databaseName?: string): Promise<T> {
  const run = async () => {
    const { repositories, database } = await openLocalStore(databaseName);
    try {
      const ids = createSequentialIdFactory(await loadIdCounters(database));
      try {
        let pointer = parsePointer(await database.get('meta', POINTER_KEY));
        if (pointer !== null && create) {
          const profile = await repositories.profiles.get(pointer.ownerChildId);
          // Never resurrect a deleted profile under the identity retained by surviving forks.
          if (profile === null) pointer = null;
        }
        if (pointer === null && create) {
          const suffix = crypto.randomUUID();
          pointer = { toolId: `sample-flight-lab-${suffix}`, ownerChildId: `child_sample_${suffix.replaceAll('-', '')}` };
          await database.put('meta', { key: POINTER_KEY, ...pointer });
        }
        return await action(pointer === null ? null : { repositories, ids, clock: createBrowserClock(), ...pointer });
      } finally { if (create) await saveIdCounters(database, ids.snapshot()); }
    } finally { database.close(); }
  };
  if (!navigator.locks) return run();
  // Time out only while waiting for another tab, never during a write in progress.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await navigator.locks.request('teach-daso-example', { signal: controller.signal }, async () => {
      clearTimeout(timer);
      return run();
    });
  } finally { clearTimeout(timer); }
}
