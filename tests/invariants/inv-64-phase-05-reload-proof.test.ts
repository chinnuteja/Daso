import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { openIndexedDbRepositories } from '../../src/adapters/persistence';
import { millimetresToMetres, replay } from '../../src/core/runtime';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-64 — full milestone path for memory and IndexedDB/reopen.
 */

async function assertMilestone(repositories: Awaited<
  ReturnType<typeof runScriptedFlightLabJourney>
>['repositories']): Promise<void> {
  const versions = await repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID);
  const trials = await repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID);
  const ledger = await repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID);
  const tool = await repositories.tools.get(FLIGHT_LAB_TOOL_ID);
  const v1 = versions.find((version) => version.versionId === 'tool_version_001');
  const v2 = versions.find((version) => version.versionId === 'tool_version_002');
  expect(v1).toBeDefined();
  expect(v2).toBeDefined();
  expect(trials).toHaveLength(4);
  expect(tool?.currentVersionId).toBe('tool_version_002');
  if (v1 === undefined || v2 === undefined) {
    return;
  }
  const storedTrials = canonicalJson(trials);
  const first = replay(v1, trials);
  const second = replay(v2, trials);
  expect(first.winner).toBe('Dart');
  expect(millimetresToMetres(first.metrics.find((entry) => entry.designName === 'Dart')?.medianDistanceMm ?? 0)).toBe(
    7.5,
  );
  expect(second.winner).toBe('Falcon');
  expect(millimetresToMetres(second.metrics.find((entry) => entry.designName === 'Dart')?.medianDistanceMm ?? 0)).toBe(
    6.1,
  );
  expect(canonicalJson(trials)).toBe(storedTrials);
  expect(canonicalJson(ledger)).toBe(canonicalJson(await repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID)));
}

describe('INV-64 — memory and IndexedDB/reopen milestone proof', () => {
  it('INV-64: memory path compiles v1, records four trials, compiles v2, and reproduces both rankings', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    await assertMilestone(result.repositories);
  });

  it('INV-64: IndexedDB reopen still points at stored v2, retains v1, and reproduces both rankings', async () => {
    const name = 'teach-daso-inv-64';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    await runScriptedFlightLabJourney({
      approveCorrection: true,
      repositories: opened.repositories,
    });
    const ledgerBefore = canonicalJson(await opened.repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID));
    const trialsBefore = canonicalJson(await opened.repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID));
    opened.database.close();

    const reopened = await openIndexedDbRepositories(name);
    await assertMilestone(reopened.repositories);
    expect(canonicalJson(await reopened.repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID))).toBe(ledgerBefore);
    expect(canonicalJson(await reopened.repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID))).toBe(trialsBefore);
    reopened.database.close();
    await deleteDB(name);
  });
});
