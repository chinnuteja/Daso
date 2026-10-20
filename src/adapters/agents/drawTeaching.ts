import { ModelIntent, TeachingRequestV2 } from '../../core/capability';

export class DrawTeachingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrawTeachingError';
  }
}

/** Posts only the already-minimized v2 request. Source drawing geometry stays in the browser. */
export function drawTeachingRequestBody(request: TeachingRequestV2): {
  readonly protocol: 'capability_v2';
  readonly request: TeachingRequestV2;
} {
  return { protocol: 'capability_v2', request: TeachingRequestV2.parse(request) };
}

export async function requestDrawInterpretation(
  request: TeachingRequestV2,
  fetchImpl: typeof fetch = fetch,
): Promise<ModelIntent> {
  try {
  const response = await fetchImpl('/api/agents/teaching', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(drawTeachingRequestBody(request)),
    signal: AbortSignal.timeout(25_000),
  });
  const payload: unknown = await response.json();
  if (!response.ok || payload === null || typeof payload !== 'object' || (payload as { ok?: unknown }).ok !== true) {
    throw new DrawTeachingError('Kale could not read those words right now. You can still review your own settings.');
  }
  return ModelIntent.parse((payload as { intent: unknown }).intent);
  } catch (caught) {
    if (caught instanceof DrawTeachingError) throw caught;
    throw new DrawTeachingError('Kale could not read those words right now. Your drawing is unchanged. You can choose the repeat yourself.');
  }
}

/** The same minimized transport is used by both capability kinds. */
export const requestCapabilityInterpretation = requestDrawInterpretation;
