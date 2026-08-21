import { describe, expect, it } from 'vitest';

import { foldApprovedEvents } from '../../src/core/ledger/fold';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { ToolVersionBody } from '../../src/core/schema/toolVersion';
import { FLIGHT_LAB_TOOL_ID } from '../fixtures/script/flightLab';
import toolVersionJson from '../fixtures/spec/toolVersion.json';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-39 — Milestone 1: the full scripted journey completes without a model.
 */
describe('INV-39 — the full scripted journey completes (Milestone 1 verification)', () => {
  it('INV-39: Scene 1 → Scene 6 reaches RUN with an approved ledger whose fold equals the §9.3 body', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });

    expect(result.state).toBe('RUN');
    expect(result.teachingInvoked).toBeGreaterThan(0);

    const entries = await result.repositories.ledger.listByTool(FLIGHT_LAB_TOOL_ID);
    const trials = await result.repositories.trials.listByTool(FLIGHT_LAB_TOOL_ID);
    const versions = await result.repositories.versions.listByTool(FLIGHT_LAB_TOOL_ID);

    expect(trials).toHaveLength(4);
    expect(versions).toEqual([]);

    const approvals = entries.filter(
      (entry): entry is Extract<(typeof entries)[number], { entryKind: 'approval' }> =>
        entry.entryKind === 'approval' && entry.actor === 'child',
    );
    const approvedCandidates = entries.filter(
      (entry) =>
        entry.entryKind === 'candidate' &&
        approvals.some((approval) => approval.approves === entry.eventId),
    );
    expect(approvedCandidates.length).toBeGreaterThanOrEqual(6);
    expect(approvals.length).toBe(approvedCandidates.length);

    const body = foldApprovedEvents(entries);
    const expected = ToolVersionBody.parse({
      toolId: toolVersionJson.toolId,
      version: toolVersionJson.version,
      inputs: toolVersionJson.inputs,
      metrics: toolVersionJson.metrics,
      rules: toolVersionJson.rules,
    });
    expect(canonicalJson(body)).toBe(canonicalJson(expected));
    expect(result.compiledBody === null ? null : canonicalJson(result.compiledBody)).toBe(
      canonicalJson(expected),
    );
  });
});
