import { CapabilityTeachingRouteRequest, ModelIntent, TeachingRequestV2 } from '../../../../core/capability';
import { TeachingMove, TeachingRequest } from '../../../../core/ports/teaching';

/**
 * Ruling R3's first permitted model file. The evidence route is the second and
 * final permitted path.
 *
 * The transport is a seam: tests stub it; production fetches the configured provider.
 * An unparsed model response never leaves this module.
 */

export type ModelTransport = (request: TeachingRequest) => Promise<unknown>;
export type CapabilityModelTransport = (request: TeachingRequestV2) => Promise<unknown>;

export type TeachingRoutePayload =
  | { readonly ok: true; readonly move: TeachingMove }
  | { readonly ok: false; readonly reasons: readonly string[] };

export type CapabilityTeachingRoutePayload =
  | { readonly ok: true; readonly intent: ModelIntent }
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

/**
 * The Draw path deliberately uses the existing teaching route. Its validated request carries
 * only child words and bounded availability facts -- never the drawing, its vectors, or IDs.
 */
export async function interpretCapabilityIntent(
  body: unknown,
  transport: CapabilityModelTransport,
): Promise<{ readonly status: number; readonly payload: CapabilityTeachingRoutePayload }> {
  const parsedEnvelope = CapabilityTeachingRouteRequest.safeParse(body);
  if (!parsedEnvelope.success) {
    return { status: 400, payload: { ok: false, reasons: ['invalid_capability_request'] } };
  }

  const raw = await transport(parsedEnvelope.data.request);
  const parsedIntent = ModelIntent.safeParse(raw);
  if (!parsedIntent.success) {
    return { status: 422, payload: { ok: false, reasons: ['invalid_capability_intent'] } };
  }
  return { status: 200, payload: { ok: true, intent: parsedIntent.data } };
}

async function postToConfiguredProvider(body: unknown): Promise<unknown> {
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
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`teaching provider returned ${response.status}`);
  return response.json() as Promise<unknown>;
}

export function createProviderTransport(): ModelTransport {
  return async (request: TeachingRequest): Promise<unknown> => {
    return postToConfiguredProvider({
      state: request.state,
      originalInput: request.originalInput,
    });
  };
}

export function createCapabilityProviderTransport(): CapabilityModelTransport {
  return async (request: TeachingRequestV2): Promise<unknown> => postToConfiguredProvider({
    protocol: 'capability_v2',
    childWords: request.childWords,
    contextDigest: request.contextDigest,
    context: request.context,
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reasons: ['invalid_json'] }, { status: 400 });
  }

  try {
    if (CapabilityTeachingRouteRequest.safeParse(body).success) {
      const result = await interpretCapabilityIntent(body, createCapabilityProviderTransport());
      return Response.json(result.payload, { status: result.status });
    }
    const result = await interpretTeachingMove(body, createProviderTransport());
    return Response.json(result.payload, { status: result.status });
  } catch {
    // A missing key, offline provider, or timeout does not turn into a fabricated suggestion.
    return Response.json({ ok: false, reasons: ['provider_unavailable'] }, { status: 503 });
  }
}
