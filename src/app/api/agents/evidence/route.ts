import { EvidenceRequest } from '../../../../core/ports/evidence';
import { EvidenceSelection } from '../../../../core/evidence';

/**
 * Ruling R3's second and final permitted model file. Credentials are read only here.
 *
 * The transport is a seam: tests stub it; production fetches the configured provider.
 * An unparsed model response never leaves this module.
 */

export type ModelTransport = (request: EvidenceRequest) => Promise<unknown>;

export type EvidenceRoutePayload =
  | { readonly ok: true; readonly selection: EvidenceSelection }
  | { readonly ok: false; readonly reasons: readonly string[] };

export async function interpretEvidenceSelection(
  body: unknown,
  transport: ModelTransport,
): Promise<{ readonly status: number; readonly payload: EvidenceRoutePayload }> {
  const parsedRequest = EvidenceRequest.safeParse(body);
  if (!parsedRequest.success) {
    return { status: 400, payload: { ok: false, reasons: ['invalid_request'] } };
  }

  const raw = await transport(parsedRequest.data);
  const parsedSelection = EvidenceSelection.safeParse(raw);
  if (!parsedSelection.success) {
    return { status: 422, payload: { ok: false, reasons: ['invalid_selection'] } };
  }

  return { status: 200, payload: { ok: true, selection: parsedSelection.data } };
}

export function createProviderTransport(): ModelTransport {
  return async (request: EvidenceRequest): Promise<unknown> => {
    const credential = process.env.EVIDENCE_AGENT_CREDENTIAL;
    const baseAddress = process.env.MODEL_PROVIDER_BASE_ADDRESS;
    if (credential === undefined || credential.length === 0) {
      throw new Error('EVIDENCE_AGENT_CREDENTIAL is missing; refusing to guess a host');
    }
    if (baseAddress === undefined || baseAddress.length === 0) {
      throw new Error('MODEL_PROVIDER_BASE_ADDRESS is missing; refusing to guess a host');
    }

    const response = await fetch(baseAddress, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credential}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ projection: request.projection }),
    });

    return response.json() as Promise<unknown>;
  };
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();
  const result = await interpretEvidenceSelection(body, createProviderTransport());
  return Response.json(result.payload, { status: result.status });
}
