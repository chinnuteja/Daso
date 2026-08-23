import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { createScriptedEvidenceSource } from '../../src/adapters/evidence/scripted';
import { openIndexedDbRepositories } from '../../src/adapters/persistence';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { loadParentEvidence } from '../../src/ui/flows/parentEvidence';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

describe('phase 7 generate → save → export → delete → reopen', () => {
  it('keeps the generated summary until the graph is deleted', async () => {
    const name = 'teach-daso-phase-07-integration';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    await runScriptedFlightLabJourney({
      approveCorrection: true,
      repositories: opened.repositories,
    });
    const loaded = await loadParentEvidence({
      repositories: opened.repositories,
      evidence: createScriptedEvidenceSource(),
      ids: createSequentialIdFactory({ event: 30, tool_version: 5, trial: 8 }),
      clock: createFixedClock('2026-08-18T10:36:00Z'),
      rawToolId: 'mayas-flight-lab',
    });
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
    expect(loaded.view.exportGraph.summaries).toHaveLength(1);
    await opened.repositories.tools.deleteToolGraph('mayas-flight-lab');
    opened.database.close();
    const reopened = await openIndexedDbRepositories(name);
    expect(await reopened.repositories.summaries.listByTool('mayas-flight-lab')).toEqual([]);
    reopened.database.close();
    await deleteDB(name);
  });
});
