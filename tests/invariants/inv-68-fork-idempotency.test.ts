import { describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { createOrReuseFork, ensureSecondChildProfile } from '../../src/ui/flows/runner';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-68 — repeating reuse returns the existing fork before consuming ids or time.
 */

describe('INV-68 — fork idempotency', () => {
  it('INV-68: a second reuse of the same source snapshot returns the existing fork without new ids', async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    const leo = await ensureSecondChildProfile(repositories);
    let idCalls = 0;
    let timeCalls = 0;
    const ids = createSequentialIdFactory({ event: 15, tool_version: 2 });
    const countingIds = {
      next: (kind: Parameters<typeof ids.next>[0]) => {
        idCalls += 1;
        return ids.next(kind);
      },
      snapshot: () => ids.snapshot(),
    };
    const clock = {
      now: () => {
        timeCalls += 1;
        return createFixedClock('2026-08-21T09:05:00Z').now();
      },
    };

    const first = await createOrReuseFork({
      repositories,
      ids: countingIds,
      clock,
      sourceToolId: 'mayas-flight-lab',
      targetOwner: leo,
    });
    expect(first.reused).toBe(false);
    const idsAfterFirst = idCalls;
    const timeAfterFirst = timeCalls;

    const second = await createOrReuseFork({
      repositories,
      ids: countingIds,
      clock,
      sourceToolId: 'mayas-flight-lab',
      targetOwner: leo,
    });
    expect(second.reused).toBe(true);
    expect(second.snapshot.definition.toolId).toBe(first.snapshot.definition.toolId);
    expect(idCalls).toBe(idsAfterFirst);
    expect(timeCalls).toBe(timeAfterFirst);
    expect((await repositories.tools.listByOwner(leo.childId)).length).toBe(1);
  });
});
