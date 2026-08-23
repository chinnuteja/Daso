import { describe, expect, it } from 'vitest';

import { createRemoteEvidenceSource } from '../../src/adapters/agents/evidence';
import { interpretEvidenceSelection } from '../../src/app/api/agents/evidence/route';
import { flightLabProjection } from '../support/evidenceGraph';

/**
 * INV-74 — the evidence route rejects malformed request/selection output server-side.
 */

describe('INV-74 — evidence route validates request and selection server-side', () => {
  it('INV-74: malformed request, free-text selection, extra keys, and a valid id list', async () => {
    const { projection } = flightLabProjection();
    const request = { projection };
    const ids = {
      evidenceEventIds: ['event_001', 'trial_004', 'event_014', 'tool_version_002'],
    };

    const badRequest = await interpretEvidenceSelection({ projection, ledger: [] }, async () => ids);
    expect(badRequest).toEqual({ status: 400, payload: { ok: false, reasons: ['invalid_request'] } });

    const freeText = await interpretEvidenceSelection(request, async () => 'Maya taught a rule');
    expect(freeText).toEqual({
      status: 422,
      payload: { ok: false, reasons: ['invalid_selection'] },
    });

    const extraKey = await interpretEvidenceSelection(request, async () => ({
      ...ids,
      text: 'no',
    }));
    expect(extraKey.payload.ok).toBe(false);

    const valid = await interpretEvidenceSelection(request, async () => ids);
    expect(valid).toEqual({ status: 200, payload: { ok: true, selection: ids } });
  });

  it('INV-74: the typed client rejects a bad route payload without a live network', async () => {
    const { projection } = flightLabProjection();
    const source = createRemoteEvidenceSource(async () =>
      new Response(JSON.stringify({ ok: true, selection: { text: 'no' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(source.select({ projection })).rejects.toThrow();
  });
});
