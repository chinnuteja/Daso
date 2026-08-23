import { describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { loadSavedTiles } from '../../src/ui/flows/runner';
import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-65 — saved tile fields are grounded in stored data.
 */

describe('INV-65 — saved tile grounding', () => {
  it('INV-65: tile counts come from stored trials and approved corrections; fixture 9/2 cannot appear', async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    const tiles = await loadSavedTiles(repositories, ['child_local_01']);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]?.displayName).toBe("Maya's Flight Lab");
    expect(tiles[0]?.creatorName).toBe('Maya');
    expect(tiles[0]?.observationCount).toBe(4);
    expect(tiles[0]?.approvedCorrectionCount).toBe(1);

    const ui = listSourceFiles(SRC_ROOT).filter(
      (file) => file.path.startsWith('src/ui/') || file.path.startsWith('src/app/'),
    );
    const offenders = ui
      .filter((file) => /9 observations|2 corrections/u.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });
});
