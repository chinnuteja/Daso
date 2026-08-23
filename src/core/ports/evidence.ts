import { z } from 'zod';

import { EvidenceProjection, EvidenceSelection } from '../evidence/schema';

export const EvidenceRequest = z.strictObject({
  projection: EvidenceProjection,
});
export type EvidenceRequest = z.infer<typeof EvidenceRequest>;

export type { EvidenceSelection };

export interface EvidenceSource {
  select(request: EvidenceRequest): Promise<EvidenceSelection>;
}
