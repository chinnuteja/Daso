import { describe, expect, it } from 'vitest';

import { createMemoryRepositories, persistGraph } from '../../src/adapters/persistence';
import { replay } from '../../src/core/runtime';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { loadRunner } from '../../src/ui/flows/runner';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

/**
 * INV-69 — Runner resolves the active same-tool version and renders the P5 runtime result.
 */

describe('INV-69 — runner active version', () => {
  it('INV-69: ready load equals replay of the stored active version; missing/cross-tool is an error', async () => {
    const repositories = createMemoryRepositories();
    await persistGraph(repositories, flightLabGraph());
    const loaded = await loadRunner(repositories, 'mayas-flight-lab', 'child_local_01');
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
    expect(loaded.view.version.versionId).toBe('tool_version_002');
    const expected = replay(loaded.view.version, loaded.view.trials);
    expect(canonicalJson(loaded.view.runtime)).toBe(canonicalJson(expected));

    const missing = await loadRunner(repositories, 'missing-lab', 'child_local_01');
    expect(missing.status).toBe('empty');
  });
});
