/**
 * Specification section 7.5. A closed enumeration: each member is a named denial.
 * Anything that is not an explicit allowance is denied, so an unenumerated request
 * fails closed rather than open.
 */
export const POLICY_BOUNDARIES = [
  'arbitrary_network',
  'unapproved_contacts',
  'background_microphone_or_camera',
  'continuous_location',
  'generated_native_code',
  'filesystem_outside_sandbox',
  'tool_to_tool_without_capability',
  'public_publishing',
  'undeclared_runner_model',
] as const;

export type PolicyBoundary = (typeof POLICY_BOUNDARIES)[number];

/** Intents the host actually permits a teaching session to express. */
export const POLICY_ALLOWANCES = [
  'propose_candidate_mutation',
  'ask_clarifying_question',
  'offer_alternatives',
  'explain',
  'record_trial_locally',
] as const;

export type PolicyAllowance = (typeof POLICY_ALLOWANCES)[number];
