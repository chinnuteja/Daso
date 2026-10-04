import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_TEACHING_BODY_BYTES, POST } from '../../../src/app/api/agents/teaching/route';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('teaching transport is bounded before interpretation', () => {
  it.each([true, false])('rejects oversized bytes with declared Content-Length=%s, without contacting a model', async (declare) => {
    vi.stubEnv('KALE_DISABLE_TEACHING', '0');
    const network = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', network);
    const response = await POST(new Request('http://localhost/api/agents/teaching', { method: 'POST', headers: declare ? { 'content-length': String(MAX_TEACHING_BODY_BYTES + 1) } : {}, body: 'x'.repeat(MAX_TEACHING_BODY_BYTES + 1) }));
    expect(response.status).toBe(413); expect(await response.json()).toEqual({ ok: false, reasons: ['request_too_large'] }); expect(network).not.toHaveBeenCalled();
  });
  it('invalid JSON and invalid bounded requests fail closed without model access', async () => {
    vi.stubEnv('KALE_DISABLE_TEACHING', '0');
    const network = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', network);
    expect((await POST(new Request('http://localhost/api/agents/teaching', { method: 'POST', body: '{bad' }))).status).toBe(400);
    expect((await POST(new Request('http://localhost/api/agents/teaching', { method: 'POST', body: '{}' }))).status).toBe(400);
    expect(network).not.toHaveBeenCalled();
  });
});
