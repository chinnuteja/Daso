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

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'dots-studio/dots-3-note-preview:free';
const OPENROUTER_PROVIDER = 'atlas-cloud/fp8';
const CAPABILITY_SYSTEM_PROMPT = [
  'You interpret one child statement for a bounded learning tool.',
  'Return only a JSON object, with no Markdown, explanation, or reasoning.',
  'Allowed object A: {"type":"propose_capability","kind":"draw_pattern","operation":"repeat_selected_mark","spacing":"even"|"close"|"wide","sizeProfile":"constant"|"smaller_toward_end"}.',
  'Allowed object B: {"type":"clarify","unresolved":"selected_mark"|"guide_path"|"spacing"|"size_profile"|"reason","question":"one short question"}.',
  'When a child asks to repeat and does not name spacing, choose editable "even" spacing. When they ask for smaller toward the end, choose "smaller_toward_end".',
  'The supplied availability facts already guarantee that the selected mark and path exist; do not ask for either one.',
  'Never approve, save, replace artwork, infer pictured anatomy, create a new capability, or return any other key.',
].join('\n');

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

export function parseOpenRouterCapabilityResponse(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const choices = (raw as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return raw;
  const first = choices[0];
  if (first === null || typeof first !== 'object') return raw;
  const message = (first as { message?: unknown }).message;
  if (message === null || typeof message !== 'object') return raw;
  const content = (message as { content?: unknown }).content;
  if (typeof content !== 'string') return raw;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return raw;
  }
}

export function openRouterCapabilityRequestBody(request: TeachingRequestV2): Record<string, unknown> {
  return {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: CAPABILITY_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ childWords: request.childWords, context: request.context }) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
      // Reasoning tokens count toward this provider's cap; leave room for the final JSON object.
      max_tokens: 2048,
    provider: { only: [OPENROUTER_PROVIDER], allow_fallbacks: false },
    reasoning: { enabled: true },
  };
}

/**
 * This is the sole external step for Draw interpretation. The model receives no drawing or
 * identifiers: only the child sentence and the already-minimized availability facts.
 */
async function postToOpenRouter(request: TeachingRequestV2): Promise<unknown> {
  const credential = process.env.OPENROUTER_API_KEY;
  if (credential === undefined || credential.length === 0) {
    throw new Error('OPENROUTER_API_KEY is missing; refusing to call a provider');
  }
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${credential}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(openRouterCapabilityRequestBody(request)),
  });
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
  return parseOpenRouterCapabilityResponse(await response.json() as unknown);
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
  return async (request: TeachingRequestV2): Promise<unknown> => postToOpenRouter(request);
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
