import { describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import {
  captureTrialUnderActiveVersion,
  createOrReuseFork,
  ensureSecondChildProfile,
  loadRunner,
  loadSavedTiles,
} from '../../src/ui/flows/runner';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { mayaGraphCanonical } from '../support/mayaGraph';

describe('phase 6 keep and reuse', () => {
  it('grounds the saved tile, forks for Leo, and rejects an obstructed Day-2 trial', async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    const tiles = await loadSavedTiles(repositories, ['child_local_01']);
    expect(tiles[0]?.observationCount).toBe(4);
    expect(tiles[0]?.approvedCorrectionCount).toBe(1);

    const before = await mayaGraphCanonical(repositories);
    const leo = await ensureSecondChildProfile(repositories);
    const fork = await createOrReuseFork({
      repositories,
      ids: createSequentialIdFactory({ event: 15, tool_version: 2 }),
      clock: createFixedClock('2026-08-21T09:05:00Z'),
      sourceToolId: 'mayas-flight-lab',
      targetOwner: leo,
    });
    const trial = await captureTrialUnderActiveVersion({
      repositories,
      ids: createSequentialIdFactory({ trial: 10 }),
      clock: createFixedClock('2026-08-21T09:06:00Z'),
      trial: {
        toolId: fork.snapshot.definition.toolId,
        designName: 'Dart',
        distanceM: 8.1,
        obstruction: true,
        validAtCapture: true,
      },
    });
    const loaded = await loadRunner(repositories, fork.snapshot.definition.toolId, leo.childId);
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
    const projected = loaded.view.runtime.projections.find(
      (candidate) => candidate.trialId === trial.trialId,
    );
    expect(projected?.validUnderCurrentVersion).toBe(false);
    expect(loaded.view.sourceAuthor?.displayName).toBe('Maya');
    expect(await mayaGraphCanonical(repositories)).toBe(before);
  });
});
