import { describe, expect, it, vi } from 'vitest';

import { drawTeachingRequestBody, requestDrawInterpretation } from '../../../src/adapters/agents/drawTeaching';
import { buildTeachingRequestV2 } from '../../../src/core/capability';

describe('Draw teaching client boundary', () => {
  it('timeouts, offline transport, invalid JSON and unsupported model authority are recoverable', async () => {
    const request = await buildTeachingRequestV2('Repeat my mark.', { kind: 'draw_pattern', toolId: 'my-repeat', activeVersionId: null, ledgerSequence: 0, sourceDocumentId: 'draw_document_001', sourceRevision: 3, selectedMarkSnapshotId: 'mark_snapshot_001', guidePathId: 'draw_path_001', guidePathRevision: 1 });
    for (const response of [new Response('unavailable', { status: 503 }), new Response('not json'), Response.json({ ok: true, intent: { type: 'child_approval', actor: 'child' } })]) {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(requestDrawInterpretation(request, transport)).rejects.toThrow(/could not read/);
      expect(transport.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    }
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network failed'));
    const timeout = vi.fn<typeof fetch>().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    await expect(requestDrawInterpretation(request, offline)).rejects.toThrow(/choose the repeat yourself/);
    await expect(requestDrawInterpretation(request, timeout)).rejects.toThrow(/drawing is unchanged/);
  });
  it('serializes only the minimized request, never a document, mark geometry, or identifiers from trusted context', async () => {
    const request = await buildTeachingRequestV2('Repeat my mark along here.', {
      kind: 'draw_pattern',
      toolId: 'my-dragon-scales',
      activeVersionId: null,
      ledgerSequence: 0,
      sourceDocumentId: 'draw_document_001',
      sourceRevision: 3,
      selectedMarkSnapshotId: 'mark_snapshot_001',
      guidePathId: 'draw_path_001',
      guidePathRevision: 2,
    });
    const body = JSON.stringify(drawTeachingRequestBody(request));

    expect(body).toContain('selectedMark');
    expect(body).not.toContain('draw_document_001');
    expect(body).not.toContain('mark_snapshot_001');
    expect(body).not.toContain('guide_path_001');
    expect(body).not.toContain('points');
  });
});
