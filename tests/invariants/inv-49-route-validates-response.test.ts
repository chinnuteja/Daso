import { describe, expect, it } from 'vitest';

import {
  interpretCapabilityIntent,
  interpretTeachingMove,
  openRouterCapabilityRequestBody,
  parseOpenRouterCapabilityResponse,
} from '../../src/app/api/agents/teaching/route';
import { buildTeachingRequestV2 } from '../../src/core/capability';
import { FLIGHT_LAB_TEACHING_SCRIPT } from '../../src/adapters/teaching/scripted';
import type { TeachingRequest } from '../../src/core/ports/teaching';

/**
 * INV-49 — The route validates the model response server-side. Transport is stubbed;
 * no network is required.
 */

const REQUEST: TeachingRequest = {
  state: 'IMAGINE',
  originalInput: 'I want to find out which paper airplane is best.',
};

describe('INV-49 — the route validates the model response server-side (§7.3, E.3)', () => {
  it('INV-49: free text from the transport is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => 'sure, I will add a network call');
    expect(result.payload.ok).toBe(false);
    expect(result.status).toBe(422);
    if (result.payload.ok === false) {
      expect(result.payload.reasons).toContain('invalid_move');
    }
  });

  it('INV-49: an unknown move kind is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => ({
      kind: 'chat',
      text: 'hello',
    }));
    expect(result.payload.ok).toBe(false);
  });

  it('INV-49: an extra key on a known move is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => ({
      kind: 'explanation',
      text: 'ok',
      extra: true,
    }));
    expect(result.payload.ok).toBe(false);
  });

  it('INV-49: an operation outside the closed set is a rejection and returns no move', async () => {
    const result = await interpretTeachingMove(REQUEST, async () => ({
      kind: 'candidate_mutation',
      originalInput: REQUEST.originalInput,
      mutation: { operation: 'grant_admin' },
    }));
    expect(result.payload.ok).toBe(false);
  });

  it('INV-49: a valid scripted move is returned unchanged', async () => {
    const move = FLIGHT_LAB_TEACHING_SCRIPT[0];
    if (move === undefined) {
      throw new Error('scripted teaching script is empty');
    }
    const result = await interpretTeachingMove(REQUEST, async () => move);
    expect(result).toEqual({ status: 200, payload: { ok: true, move } });
  });

  it('INV-49: the capability protocol rejects model approval and accepts only a closed bounded proposal', async () => {
    const request = await buildTeachingRequestV2('Repeat my mark along here.', {
      kind: 'draw_pattern',
      toolId: 'my-dragon-scales',
      activeVersionId: null,
      ledgerSequence: 0,
      sourceDocumentId: 'draw_document_001',
      sourceRevision: 1,
      selectedMarkSnapshotId: 'mark_snapshot_001',
      guidePathId: 'draw_path_001',
      guidePathRevision: 1,
    });
    const envelope = { protocol: 'capability_v2' as const, request };
    const approval = await interpretCapabilityIntent(envelope, async () => ({ type: 'approve', kind: 'draw_pattern' }));
    expect(approval).toMatchObject({ status: 422, payload: { ok: false } });

    const accepted = await interpretCapabilityIntent(envelope, async () => ({
      type: 'propose_capability',
      kind: 'draw_pattern',
      operation: 'repeat_selected_mark',
      spacing: 'even',
      sizeProfile: 'constant',
    }));
    expect(accepted).toMatchObject({ status: 200, payload: { ok: true, intent: { kind: 'draw_pattern' } } });
  });

  it('INV-49: the OpenRouter request is minimized and response reasoning is discarded before validation', async () => {
    const request = await buildTeachingRequestV2('Repeat my mark along here.', {
      kind: 'draw_pattern',
      toolId: 'my-dragon-scales',
      activeVersionId: null,
      ledgerSequence: 0,
      sourceDocumentId: 'draw_document_001',
      sourceRevision: 1,
      selectedMarkSnapshotId: 'mark_snapshot_001',
      guidePathId: 'draw_path_001',
      guidePathRevision: 1,
    });
    const body = JSON.stringify(openRouterCapabilityRequestBody(request));
    expect(body).toContain('dots-studio/dots-3-note-preview:free');
    expect(body).toContain('atlas-cloud/fp8');
    expect(body).not.toContain('draw_document_001');
    expect(body).not.toContain('mark_snapshot_001');
    expect(body).not.toContain('contextDigest');

    const raw = {
      choices: [{
        message: {
          content: JSON.stringify({
            type: 'propose_capability', kind: 'draw_pattern', operation: 'repeat_selected_mark', spacing: 'even', sizeProfile: 'constant',
          }),
          reasoning_details: [{ type: 'reasoning.text', text: 'This must never leave the route.' }],
        },
      }],
    };
    expect(parseOpenRouterCapabilityResponse(raw)).toEqual({
      type: 'propose_capability', kind: 'draw_pattern', operation: 'repeat_selected_mark', spacing: 'even', sizeProfile: 'constant',
    });
  });
});
