import { describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import {
  captureTrialUnderActiveVersion,
  createOrReuseFork,
  ensureSecondChildProfile,
} from '../../src/ui/flows/runner';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { mayaGraphCanonical } from '../support/mayaGraph';

/**
 * INV-23 — second-child reuse forks; Maya's complete graph is byte-identical after.
 */

describe('INV-23 — second-child reuse forks; the original version body is byte-identical after', () => {
  it("INV-23: after a second-child session, Maya's definition, versions, ledger, trials, grants, and summaries are unchanged", async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    const before = await mayaGraphCanonical(repositories);
    const leo = await ensureSecondChildProfile(repositories);
    const fork = await createOrReuseFork({
      repositories,
      ids: createSequentialIdFactory({ event: 15, tool_version: 2 }),
      clock: createFixedClock('2026-08-21T09:05:00Z'),
      sourceToolId: 'mayas-flight-lab',
      targetOwner: leo,
    });
    await captureTrialUnderActiveVersion({
      repositories,
      ids: createSequentialIdFactory({ trial: 10 }),
      clock: createFixedClock('2026-08-21T09:06:00Z'),
      trial: {
        toolId: fork.snapshot.definition.toolId,
        designName: 'Dart',
        distanceM: 4.2,
        obstruction: true,
        validAtCapture: true,
      },
    });
    expect(await mayaGraphCanonical(repositories)).toBe(before);
    expect(fork.snapshot.definition.ownerChildId).toBe(leo.childId);
    expect(fork.snapshot.definition.toolId).not.toBe('mayas-flight-lab');
  });
});
