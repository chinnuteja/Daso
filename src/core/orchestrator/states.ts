/**
 * Specification section 7.2. Exactly these ten states, in this order.
 * An eleventh member is a specification change, not an implementation detail.
 */
export const ORCHESTRATOR_STATES = [
  'IMAGINE',
  'DEFINE_METRICS',
  'DEFINE_INPUTS',
  'PREDICT',
  'COLLECT_TRIALS',
  'INSPECT_ANOMALY',
  'PROPOSE_CORRECTION',
  'REVIEW_MUTATION',
  'COMPILE',
  'RUN',
] as const;

export type OrchestratorState = (typeof ORCHESTRATOR_STATES)[number];
