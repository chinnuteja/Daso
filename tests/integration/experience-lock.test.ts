import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, expect, it, vi } from 'vitest';
import { withExperience } from '../../src/ui/flows/experience/browserSession';

const TEST_DATABASE = 'teach-daso-ux-lock-test-only';
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await deleteDB(TEST_DATABASE);
});

it('a lock held by another tab produces a retryable failure instead of waiting forever', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  let signal: AbortSignal | undefined;
  const action = vi.fn();
  vi.stubGlobal('navigator', { locks: { request: vi.fn((_name: string, options: { signal: AbortSignal }) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Storage busy in another tab.'))));
  }) } });
  const waiting = withExperience(false, action, TEST_DATABASE);
  const rejected = expect(waiting).rejects.toThrow('Storage busy');
  await vi.advanceTimersByTimeAsync(8000);
  await rejected;
  expect(signal?.aborted).toBe(true);
  expect(action).not.toHaveBeenCalled();
  // A later retry can acquire storage normally and does not fabricate a sample.
  vi.stubGlobal('navigator', {});
  expect(await withExperience(false, async (context) => context, TEST_DATABASE)).toBeNull();
});

it('does not abort an operation after the lock has been granted', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  let signal: AbortSignal | undefined;
  vi.stubGlobal('navigator', { locks: { request: vi.fn((_name: string, options: { signal: AbortSignal }, callback: () => Promise<unknown>) => {
    signal = options.signal;
    return callback();
  }) } });
  let finish!: (value: string) => void;
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const pending = withExperience(false, async () => {
    markStarted();
    return new Promise<string>((resolve) => { finish = resolve; });
  }, TEST_DATABASE);
  await started;
  await vi.advanceTimersByTimeAsync(9000);
  expect(signal?.aborted).toBe(false);
  finish('completed');
  expect(await pending).toBe('completed');
});
