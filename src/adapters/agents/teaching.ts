import { TeachingMove, TeachingRequest, type TeachingSource } from '../../core/ports/teaching';

export class TeachingAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeachingAgentError';
  }
}

/**
 * Typed client for the frozen TeachingSource port. It posts the two request fields
 * and nothing else. Credentials never leave the route; this module does not read them.
 */
export function createRemoteTeachingSource(
  fetchImpl: typeof fetch = fetch,
): TeachingSource {
  return {
    interpret: async (request: TeachingRequest): Promise<TeachingMove> => {
      const parsed = TeachingRequest.parse(request);
      const outbound = { state: parsed.state, originalInput: parsed.originalInput };
      const response = await fetchImpl('/api/agents/teaching', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(outbound),
      });
      const payload: unknown = await response.json();
      if (
        payload === null ||
        typeof payload !== 'object' ||
        (payload as { ok?: unknown }).ok !== true
      ) {
        throw new TeachingAgentError('teaching route rejected the model response');
      }
      return TeachingMove.parse((payload as { move: unknown }).move);
    },
  };
}

export function teachingRequestBody(request: TeachingRequest): {
  readonly state: TeachingRequest['state'];
  readonly originalInput: string;
} {
  const parsed = TeachingRequest.parse(request);
  return { state: parsed.state, originalInput: parsed.originalInput };
}
