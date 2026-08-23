import { afterEach, describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { captureTrialUnderActiveVersion, loadRunner } from '../../src/ui/flows/runner';
import { reachableFrom } from '../support/importGraph';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-79 — Runner Mode reaches neither teaching nor evidence.
 */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('INV-79 — Runner import closure reaches neither teaching nor evidence', () => {
  it('INV-79: /run reaches no teaching, evidence, agent, or route module', () => {
    const reachable = reachableFrom(['src/app/run/page.tsx']);
    const offenders = reachable
      .filter((file) => {
        return (
          file.path.includes('adapters/teaching') ||
          file.path.includes('adapters/evidence') ||
          file.path.includes('adapters/agents') ||
          file.path.includes('ports/teaching') ||
          file.path.includes('ports/evidence') ||
          file.path.includes('app/api/agents') ||
          /TeachingSource|EvidenceSource|EVIDENCE_AGENT_CREDENTIAL|TEACHING_AGENT_CREDENTIAL/u.test(
            file.text,
          )
        );
      })
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('INV-79: a model-disabled Day-2 run still loads and captures', async () => {
    globalThis.fetch = () => {
      throw new Error('network disabled in INV-79');
    };
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    const loaded = await loadRunner(repositories, 'mayas-flight-lab', 'child_local_01');
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
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
    expect(captured.toolVersionIdAtCapture).toBe(loaded.view.version.versionId);
  });
});
