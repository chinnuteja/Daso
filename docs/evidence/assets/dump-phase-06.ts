/**
 * Evidence-only dump of Phase 6 canonical graphs. Not a product path.
 */
import {
  createMemoryRepositories,
  openIndexedDbRepositories,
  persistGraph,
  setFailAfterForkWrite,
} from '../../../src/adapters/persistence';
import { deleteDB } from 'idb';
import { bodyFromVersion } from '../../../src/core/compiler';
import { foldApprovedEvents } from '../../../src/core/ledger/fold';
import { createFixedClock } from '../../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../../src/core/ports/ids';
import { replay } from '../../../src/core/runtime';
import { EventId } from '../../../src/core/schema/primitives';
import { canonicalJson } from '../../../src/core/serialization/canonicalJson';
import { buildForkSnapshot } from '../../../src/core/reuse';
import {
  captureTrialUnderActiveVersion,
  createOrReuseFork,
  ensureSecondChildProfile,
} from '../../../src/ui/flows/runner';
import { flightLabGraph } from '../../../tests/fixtures/persistence/flightLab';
import { mayaGraphCanonical } from '../../../tests/support/mayaGraph';

import 'fake-indexeddb/auto';

function buildSnapshot() {
  const graph = flightLabGraph();
  const source = graph.tools[0];
  const version = graph.versions[1];
  if (source === undefined || version === undefined) {
    throw new Error('fixture missing');
  }
  return buildForkSnapshot({
    sourceDefinition: source,
    sourceVersion: version,
    sourceLedger: graph.entries,
    targetToolId: 'mayas-flight-lab-copy',
    targetOwnerChildId: 'child_local_02',
    targetDisplayName: "Leo's copy of Maya's Flight Lab",
    replacementEventIds: graph.entries.map((_, index) =>
      EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
    ),
    targetVersionId: 'tool_version_200',
    forkedAt: '2026-08-21T09:05:00Z',
  });
}

async function main(): Promise<void> {
  const memory = createMemoryRepositories();
  await persistGraph(memory, flightLabGraph());
  const leo = await ensureSecondChildProfile(memory);
  const before = await mayaGraphCanonical(memory);
  console.log('MAYA_BEFORE', before);

  const snapshot = buildSnapshot();
  console.log('FORK_DEFINITION', canonicalJson(snapshot.definition));
  console.log('FORK_VERSION', canonicalJson(snapshot.version));
  console.log('FORK_LEDGER', canonicalJson(snapshot.ledger));
  console.log(
    'FORK_FOLD_EQUALS_BODY',
    canonicalJson(foldApprovedEvents(snapshot.ledger)) ===
      canonicalJson(bodyFromVersion(snapshot.version)),
  );

  const failing = createMemoryRepositories();
  await persistGraph(failing, flightLabGraph());
  await failing.profiles.save(leo);
  const failBefore = {
    maya: await mayaGraphCanonical(failing),
    targetTool: await failing.tools.get(snapshot.definition.toolId),
    targetVersion: await failing.versions.get(snapshot.version.versionId),
    targetLedger: await failing.ledger.listByTool(snapshot.definition.toolId),
  };
  setFailAfterForkWrite(true);
  try {
    await failing.versions.saveForkSnapshot(snapshot);
  } catch (error) {
    console.log('MEMORY_INJECTED_FAILURE', error instanceof Error ? error.message : error);
  }
  setFailAfterForkWrite(false);
  const failAfter = {
    maya: await mayaGraphCanonical(failing),
    targetTool: await failing.tools.get(snapshot.definition.toolId),
    targetVersion: await failing.versions.get(snapshot.version.versionId),
    targetLedger: await failing.ledger.listByTool(snapshot.definition.toolId),
  };
  console.log('MEMORY_FAIL_BEFORE', canonicalJson(failBefore));
  console.log('MEMORY_FAIL_AFTER', canonicalJson(failAfter));
  console.log('MEMORY_FAIL_UNCHANGED', failBefore.maya === failAfter.maya);

  const idbName = 'teach-daso-phase-06-dump';
  await deleteDB(idbName);
  const idb = await openIndexedDbRepositories(idbName);
  await persistGraph(idb.repositories, flightLabGraph());
  await idb.repositories.profiles.save(leo);
  const idbFailBefore = {
    maya: await mayaGraphCanonical(idb.repositories),
    targetTool: await idb.repositories.tools.get(snapshot.definition.toolId),
    targetVersion: await idb.repositories.versions.get(snapshot.version.versionId),
    targetLedger: await idb.repositories.ledger.listByTool(snapshot.definition.toolId),
  };
  setFailAfterForkWrite(true);
  try {
    await idb.repositories.versions.saveForkSnapshot(snapshot);
  } catch (error) {
    console.log('IDB_INJECTED_FAILURE', error instanceof Error ? error.message : error);
  }
  setFailAfterForkWrite(false);
  const idbFailAfter = {
    maya: await mayaGraphCanonical(idb.repositories),
    targetTool: await idb.repositories.tools.get(snapshot.definition.toolId),
    targetVersion: await idb.repositories.versions.get(snapshot.version.versionId),
    targetLedger: await idb.repositories.ledger.listByTool(snapshot.definition.toolId),
  };
  console.log('IDB_FAIL_BEFORE', canonicalJson(idbFailBefore));
  console.log('IDB_FAIL_AFTER', canonicalJson(idbFailAfter));
  console.log('IDB_FAIL_UNCHANGED', idbFailBefore.maya === idbFailAfter.maya);
  idb.database.close();
  await deleteDB(idbName);

  let idCalls = 0;
  let timeCalls = 0;
  const ids = createSequentialIdFactory({ event: 15, tool_version: 2 });
  const countingIds = {
    next: (kind: Parameters<typeof ids.next>[0]) => {
      idCalls += 1;
      return ids.next(kind);
    },
    snapshot: () => ids.snapshot(),
  };
  const clock = {
    now: () => {
      timeCalls += 1;
      return createFixedClock('2026-08-21T09:05:00Z').now();
    },
  };
  const first = await createOrReuseFork({
    repositories: memory,
    ids: countingIds,
    clock,
    sourceToolId: 'mayas-flight-lab',
    targetOwner: leo,
  });
  const afterFirst = { idCalls, timeCalls, reused: first.reused, toolId: first.snapshot.definition.toolId };
  const second = await createOrReuseFork({
    repositories: memory,
    ids: countingIds,
    clock,
    sourceToolId: 'mayas-flight-lab',
    targetOwner: leo,
  });
  console.log(
    'IDEMPOTENT_REUSE',
    canonicalJson({
      afterFirst,
      afterSecond: {
        idCalls,
        timeCalls,
        reused: second.reused,
        toolId: second.snapshot.definition.toolId,
      },
    }),
  );

  const trial = await captureTrialUnderActiveVersion({
    repositories: memory,
    ids: createSequentialIdFactory({ trial: 10 }),
    clock: createFixedClock('2026-08-21T09:06:00Z'),
    trial: {
      toolId: first.snapshot.definition.toolId,
      designName: 'Dart',
      distanceM: 8.1,
      obstruction: true,
      validAtCapture: true,
    },
  });
  const runtime = replay(first.snapshot.version, await memory.trials.listByTool(first.snapshot.definition.toolId));
  console.log('DAY_TWO_TRIAL', canonicalJson(trial));
  console.log('DAY_TWO_RUNTIME', canonicalJson(runtime));
  console.log('MAYA_AFTER', await mayaGraphCanonical(memory));
  console.log('MAYA_UNCHANGED', before === (await mayaGraphCanonical(memory)));
}

await main();
