import { describe, expect, it } from 'vitest';

import { createScriptedEvidenceSource } from '../../../src/adapters/evidence/scripted';
import { createRemoteEvidenceSource } from '../../../src/adapters/agents/evidence';
import { flightLabProjection } from '../../support/evidenceGraph';

describe('evidence adapters', () => {
  it('scripted source selects only projection ids', async () => {
    const { projection } = flightLabProjection();
    const selection = await createScriptedEvidenceSource().select({ projection });
    for (const id of selection.evidenceEventIds) {
      expect(projection.items.some((item) => item.referenceId === id)).toBe(true);
    }
  });

  it('remote client posts only the projection', async () => {
    const { projection } = flightLabProjection();
    let body = '';
    const source = createRemoteEvidenceSource(async (_url, init) => {
      body = String(init?.body);
      return new Response(
        JSON.stringify({
          ok: true,
          selection: { evidenceEventIds: ['event_001', 'trial_004', 'event_014', 'tool_version_002'] },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    await source.select({ projection });
    const parsed = JSON.parse(body) as { projection: unknown; ledger?: unknown };
    expect(parsed.ledger).toBeUndefined();
    expect(parsed.projection).toEqual(projection);
  });
});
