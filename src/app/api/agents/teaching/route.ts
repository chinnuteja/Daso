import { TeachingMove, TeachingRequest } from '../../../../core/ports/teaching';

/**
 * Ruling R3's first permitted model file. The evidence route is the second and
 * final permitted path.
 *
 * The transport is a seam: tests stub it; production fetches the configured provider.
 * An unparsed model response never leaves this module.
 */

export type ModelTransport = (request: TeachingRequest) => Promise<unknown>;

export type TeachingRoutePayload =
  | { readonly ok: true; readonly move: TeachingMove }
  | { readonly ok: false; readonly reasons: readonly string[] };

export async function interpretTeachingMove(
  body: unknown,
  transport: ModelTransport,
): Promise<{ readonly status: number; readonly payload: TeachingRoutePayload }> {
  const parsedRequest = TeachingRequest.safeParse(body);
  if (!parsedRequest.success) {
    return { status: 400, payload: { ok: false, reasons: ['invalid_request'] } };
  }

  const raw = await transport(parsedRequest.data);
  const parsedMove = TeachingMove.safeParse(raw);
  if (!parsedMove.success) {
    return { status: 422, payload: { ok: false, reasons: ['invalid_move'] } };
  }

  return { status: 200, payload: { ok: true, move: parsedMove.data } };
}

export function createProviderTransport(): ModelTransport {
  return async (request: TeachingRequest): Promise<unknown> => {
    const credential = process.env.TEACHING_AGENT_CREDENTIAL;
    const baseAddress = process.env.MODEL_PROVIDER_BASE_ADDRESS;
    if (credential === undefined || credential.length === 0) {
      throw new Error('TEACHING_AGENT_CREDENTIAL is missing; refusing to guess a host');
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
      body: JSON.stringify({
        state: request.state,
        originalInput: request.originalInput,
      }),
    });

    return response.json() as Promise<unknown>;
  };
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();
  const result = await interpretTeachingMove(body, createProviderTransport());
  return Response.json(result.payload, { status: result.status });
}
