import { EvidenceRequest, type EvidenceSource } from '../../core/ports/evidence';
import { EvidenceSelection } from '../../core/evidence';

export class EvidenceAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceAgentError';
  }
}

/**
 * Typed client for the frozen EvidenceSource port. It posts the projection and
 * nothing else. Credentials never leave the route; this module does not read them.
 */
export function createRemoteEvidenceSource(fetchImpl: typeof fetch = fetch): EvidenceSource {
  return {
    select: async (request: EvidenceRequest): Promise<EvidenceSelection> => {
      const outbound = evidenceRequestBody(request);
      const response = await fetchImpl('/api/agents/evidence', {
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
        throw new EvidenceAgentError('evidence route rejected the model response');
      }
      return EvidenceSelection.parse((payload as { selection: unknown }).selection);
    },
  };
}

export function evidenceRequestBody(request: EvidenceRequest): EvidenceRequest {
  return EvidenceRequest.parse({ projection: request.projection });
}
