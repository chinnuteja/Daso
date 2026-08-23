import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { openIndexedDbRepositories } from '../../src/adapters/persistence';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-58 — no dangling active version; first compile creates the definition.
 */

describe('INV-58 — no dangling active version', () => {
  it('INV-58: no placeholder version constant remains in src/ui/**', () => {
    const offenders = listSourceFiles(`${SRC_ROOT}/ui`).filter(
      (file) =>
        file.text.includes('FLIGHT_LAB_VERSION_PLACEHOLDER') ||
        /currentVersionId:\s*['"]tool_version_/u.test(file.text),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('INV-58: the live journey stores no tool before v1 and every currentVersionId resolves', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    const tools = await result.repositories.tools.listByOwner('child_local_01');
    expect(tools).toHaveLength(1);
    const current = tools[0];
    expect(current).toBeDefined();
    if (current === undefined) {
      return;
    }
    const version = await result.repositories.versions.get(current.currentVersionId);
    expect(version).not.toBeNull();
    expect(version?.toolId).toBe(current.toolId);
    expect(current.currentVersionId).toBe('tool_version_002');
  });

  it('INV-58: IndexedDB reopen still resolves the active version to a same-tool record', async () => {
    const name = 'teach-daso-inv-58';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    await runScriptedFlightLabJourney({
      approveCorrection: true,
      repositories: opened.repositories,
    });
    opened.database.close();

    const reopened = await openIndexedDbRepositories(name);
    const tool = await reopened.repositories.tools.get(FLIGHT_LAB_TOOL_ID);
    expect(tool).not.toBeNull();
    const version = tool === null ? null : await reopened.repositories.versions.get(tool.currentVersionId);
    expect(version?.toolId).toBe(FLIGHT_LAB_TOOL_ID);
    expect(version?.versionId).toBe('tool_version_002');
    reopened.database.close();
    await deleteDB(name);
  });
});
