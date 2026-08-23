import { afterEach, describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { captureTrialUnderActiveVersion, loadRunner } from '../../src/ui/flows/runner';
import { reachableFrom } from '../support/importGraph';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-22 — Runner Mode completes with model access disabled and imports no agent module.
 */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('INV-22 — Runner Mode reaches no agent module and works with model access disabled', () => {
  it('INV-22: no module reachable from /run imports teaching, agents, orchestration, or executeIntents', () => {
    const reachable = reachableFrom(['src/app/run/page.tsx']);
    const offenders = reachable
      .filter((file) => {
        return (
          file.path.includes('adapters/teaching') ||
          file.path.includes('adapters/agents') ||
          file.path.includes('ports/teaching') ||
          file.path.includes('orchestrator/events') ||
          file.path.includes('orchestrator/transition') ||
          file.path.includes('ui/flows/JourneyFlow') ||
          file.path.includes('ui/flows/executeIntents') ||
          file.path.includes('app/api/agents') ||
          /TeachingSource|TEACHING_AGENT_CREDENTIAL|MODEL_PROVIDER_BASE_ADDRESS/u.test(file.text)
        );
      })
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('INV-22: load, capture, and replay succeed while fetch and model seams throw', async () => {
    globalThis.fetch = () => {
      throw new Error('network disabled in INV-22');
    };
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    const loaded = await loadRunner(repositories, 'mayas-flight-lab', 'child_local_01');
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
    expect(loaded.view.runtime.winner).toBe('Falcon');
    const captured = await captureTrialUnderActiveVersion({
      repositories,
      ids: createSequentialIdFactory({ trial: 4 }),
      clock: createFixedClock('2026-08-21T09:10:00Z'),
      trial: {
        toolId: 'mayas-flight-lab',
        designName: 'Glider',
        distanceM: 5.5,
        obstruction: false,
        validAtCapture: true,
      },
    });
    expect(captured.toolVersionIdAtCapture).toBe('tool_version_002');
    const again = await loadRunner(repositories, 'mayas-flight-lab', 'child_local_01');
    expect(again.status).toBe('ready');
  });
});
