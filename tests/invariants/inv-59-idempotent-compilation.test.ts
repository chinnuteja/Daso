import { describe, expect, it } from 'vitest';

import { createMemoryRepositories } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { executeIntents } from '../../src/ui/flows/executeIntents';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';

/**
 * INV-59 — compiling an unchanged ledger is a no-op.
 */

describe('INV-59 — idempotent compilation', () => {
  it('INV-59: a second compile of the same ledger writes nothing and consumes neither id nor clock', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    const beforeVersions = await result.repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID);
    const beforeBytes = canonicalJson(beforeVersions);
    const beforeTool = canonicalJson(await result.repositories.tools.get(FLIGHT_LAB_TOOL_ID));

    let idCalls = 0;
    let clockCalls = 0;
    const innerIds = createSequentialIdFactory({ event: 20, tool_version: 2, trial: 4 });
    const ids = {
      next: (kind: 'event' | 'tool_version' | 'trial' | 'summary' | 'grant') => {
        idCalls += 1;
        return innerIds.next(kind);
      },
      snapshot: () => innerIds.snapshot(),
    };
    const innerClock = createFixedClock('2026-08-18T11:00:00Z');
    const clock = {
      now: () => {
        clockCalls += 1;
        return innerClock.now();
      },
    };

    let writes = 0;
    const versions = {
      ...result.repositories.versions,
      save: async (...args: Parameters<typeof result.repositories.versions.save>) => {
        writes += 1;
        return result.repositories.versions.save(...args);
      },
      saveAndActivate: async (
        ...args: Parameters<typeof result.repositories.versions.saveAndActivate>
      ) => {
        writes += 1;
        return result.repositories.versions.saveAndActivate(...args);
      },
    };

    const compiled = await executeIntents({
      intents: ['request_compile'],
      repositories: { ...result.repositories, versions },
      ids,
      clock,
      toolId: FLIGHT_LAB_TOOL_ID,
      pendingCandidateId: null,
      toolDraft: { ownerChildId: 'child_local_01', displayName: "Maya's Flight Lab" },
    });

    expect(compiled.compiledVersion?.versionId).toBe('tool_version_002');
    expect(idCalls).toBe(0);
    expect(clockCalls).toBe(0);
    expect(writes).toBe(0);
    expect(canonicalJson(await result.repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID))).toBe(
      beforeBytes,
    );
    expect(canonicalJson(await result.repositories.tools.get(FLIGHT_LAB_TOOL_ID))).toBe(beforeTool);
  });

  it('INV-59: a first compile is not confused with an empty store', async () => {
    const repositories = createMemoryRepositories();
    await expect(
      executeIntents({
        intents: ['request_compile'],
        repositories,
        ids: createSequentialIdFactory(),
        clock: createFixedClock('2026-08-18T10:21:00Z'),
        toolId: FLIGHT_LAB_TOOL_ID,
        pendingCandidateId: null,
        toolDraft: { ownerChildId: 'child_local_01', displayName: "Maya's Flight Lab" },
      }),
    ).rejects.toThrow();
  });
});
