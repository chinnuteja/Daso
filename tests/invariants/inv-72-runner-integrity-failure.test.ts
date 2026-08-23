import { describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import {
  ActiveVersionCaptureError,
  captureTrialUnderActiveVersion,
  loadRunner,
} from '../../src/ui/flows/runner';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-72 — integrity failures are structured, write nothing, and show no fixture ranking.
 */

describe('INV-72 — runner integrity failure', () => {
  it('INV-72: a broken ledger produces a child-safe error and no trial write', async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    await repositories.ledger.deleteByTool('mayas-flight-lab');
    const loaded = await loadRunner(repositories, 'mayas-flight-lab', 'child_local_01');
    expect(loaded.status).toBe('integrity_error');
    if (loaded.status !== 'integrity_error') {
      return;
    }
    expect(loaded.message).toMatch(/cannot be used/u);
    await expect(
      captureTrialUnderActiveVersion({
        repositories,
        ids: createSequentialIdFactory({ trial: 20 }),
        clock: createFixedClock('2026-08-21T09:10:00Z'),
        trial: {
          toolId: 'mayas-flight-lab',
          designName: 'Falcon',
          distanceM: 7,
          obstruction: false,
          validAtCapture: true,
        },
      }),
    ).rejects.toBeInstanceOf(ActiveVersionCaptureError);
    expect(await repositories.trials.listByTool('mayas-flight-lab')).toHaveLength(4);
  });
});
