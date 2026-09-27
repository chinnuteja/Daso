import { z } from 'zod';

import { TeachingRequestV2 } from './context';

/** Transport envelope for the one existing teaching route; kept out of the UI/app layer. */
export const CapabilityTeachingRouteRequest = z.strictObject({
  protocol: z.literal('capability_v2'),
  request: TeachingRequestV2,
});
export type CapabilityTeachingRouteRequest = z.infer<typeof CapabilityTeachingRouteRequest>;
