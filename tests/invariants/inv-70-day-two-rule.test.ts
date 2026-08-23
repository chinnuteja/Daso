import { describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { replay } from '../../src/core/runtime';
import {
  captureTrialUnderActiveVersion,
  createOrReuseFork,
  ensureSecondChildProfile,
  loadRunner,
} from '../../src/ui/flows/runner';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-70 — Day-2 obstructed trial is stored only on the fork and attributed to Maya.
 */

describe('INV-70 — day-two inherited rule', () => {
  it('INV-70: an obstructed fork trial is invalid, stamped with the fork version, and credited to Maya', async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
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
    expect(trial.toolId).toBe(fork.snapshot.definition.toolId);
    expect(trial.toolVersionIdAtCapture).toBe(fork.snapshot.version.versionId);
    expect(await repositories.trials.listByTool('mayas-flight-lab')).toHaveLength(4);

    const loaded = await loadRunner(repositories, fork.snapshot.definition.toolId, leo.childId);
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
    const projected = replay(loaded.view.version, loaded.view.trials).projections.find(
      (projection) => projection.trialId === trial.trialId,
    );
    expect(projected?.validUnderCurrentVersion).toBe(false);
    expect(loaded.view.sourceAuthor?.displayName).toBe('Maya');
    expect(
      loaded.view.explanation.some(
        (entry) => entry.attribution === 'child_taught' && entry.subject.kind === 'rule',
      ),
    ).toBe(true);
  });
});
