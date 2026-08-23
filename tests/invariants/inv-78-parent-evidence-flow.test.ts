import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';
import { deleteDB } from 'idb';

import { createScriptedEvidenceSource } from '../../src/adapters/evidence/scripted';
import { openIndexedDbRepositories } from '../../src/adapters/persistence';
import { exportToolGraph } from '../../src/core/dataRights';
import { createFixedClock } from '../../src/core/ports/clock';
import { createSequentialIdFactory } from '../../src/core/ports/ids';
import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { loadParentEvidence } from '../../src/ui/flows/parentEvidence';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-78 — parent evidence is grounded in stored data, then export and confirm-delete.
 */

describe('INV-78 — parent evidence flow', () => {
  it('INV-78: a scripted journey persists a summary, supporting ids, export, and delete', async () => {
    const name = 'teach-daso-inv-78';
    await deleteDB(name);
    const opened = await openIndexedDbRepositories(name);
    await runScriptedFlightLabJourney({
      approveCorrection: true,
      repositories: opened.repositories,
      ids: createSequentialIdFactory(),
      clock: createFixedClock('2026-08-18T10:13:00Z'),
    });

    const loaded = await loadParentEvidence({
      repositories: opened.repositories,
      evidence: createScriptedEvidenceSource(),
      ids: createSequentialIdFactory({ event: 20, tool_version: 2, trial: 4 }),
      clock: createFixedClock('2026-08-18T10:36:00Z'),
      rawToolId: 'mayas-flight-lab',
    });
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') {
      return;
    }
    expect(loaded.view.clauses.heading).toContain('Maya');
    expect(loaded.view.clauses.heading).toContain('Flight Lab');
    expect(loaded.view.clauses.supporting.map((row) => row.referenceId)).toEqual(
      expect.arrayContaining(['event_001', 'trial_004', 'event_014', 'tool_version_002']),
    );
    expect(loaded.view.clauses.result).toContain('not counted');
    expect(loaded.view.summary.text).not.toMatch(/I think Falcon will do best/u);
    const exported = exportToolGraph({
      tool: loaded.view.exportGraph.tool,
      versions: loaded.view.exportGraph.versions,
      ledger: loaded.view.exportGraph.ledger,
      trials: loaded.view.exportGraph.trials,
      grants: loaded.view.exportGraph.grants,
      summaries: loaded.view.exportGraph.summaries,
    });
    expect(exported.tool.toolId).toBe('mayas-flight-lab');
    expect(exported.summaries.some((summary) => summary.summaryId === loaded.view.summary.summaryId)).toBe(
      true,
    );

    const ui = listSourceFiles(SRC_ROOT).filter(
      (file) =>
        file.path.startsWith('src/ui/flows/parentEvidence/') ||
        file.path.startsWith('src/ui/screens/ParentEvidenceScreen'),
    );
    expect(ui.some((file) => file.text.includes('Confirm delete'))).toBe(true);
    expect(ui.some((file) => file.text.includes('onAskDeleteTool'))).toBe(true);

    await opened.repositories.tools.deleteToolGraph('mayas-flight-lab');
    opened.database.close();

    const reopened = await openIndexedDbRepositories(name);
    expect(await reopened.repositories.tools.get('mayas-flight-lab')).toBeNull();
    expect(await reopened.repositories.summaries.listByTool('mayas-flight-lab')).toEqual([]);
    const missing = await loadParentEvidence({
      repositories: reopened.repositories,
      evidence: createScriptedEvidenceSource(),
      ids: createSequentialIdFactory(),
      clock: createFixedClock('2026-08-18T10:40:00Z'),
      rawToolId: 'mayas-flight-lab',
    });
    expect(missing.status).toBe('empty');
    reopened.database.close();
    await deleteDB(name);
  });
});
