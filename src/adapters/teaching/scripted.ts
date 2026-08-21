import { TeachingMove, TeachingRequest, type TeachingSource } from '../../core/ports/teaching';
import type { CandidateMutation } from '../../core/schema/mutation';

export const FLIGHT_LAB_TOOL_ID = 'mayas-flight-lab';
export const FLIGHT_LAB_VERSION_PLACEHOLDER = 'tool_version_001';

export const FLIGHT_LAB_GOAL = 'I want to find out which paper airplane is best.';

export const FLIGHT_LAB_CORRECTION =
  "That one shouldn't count because it hit the chair";

export const DISTANCE_METRIC_INPUT = 'I want to know which paper airplane flies the farthest';

export const CONSISTENCY_SUGGESTION =
  'Some planes fly far once and badly the next time. Should Flight Lab also compare which plane flies the same distance every time?';

export const DESIGN_NAME_INPUT = 'My planes are called Falcon, Dart and Glider';

export const DISTANCE_INPUT = 'I want to write down how many metres it went';

export const OBSTRUCTION_SUGGESTION =
  'Should Flight Lab also write down whether the plane touched something on the way?';

export const NOTE_INPUT = 'Maybe I should also write what happened each time';

export const BAD_DISTANCE_RULE_SUGGESTION =
  'Should Flight Lab stop counting throws that measure 8.9 metres?';

export const BAD_METRIC_REMOVAL_SUGGESTION =
  'Or should Flight Lab stop comparing distance altogether?';

export const EXCLUDE_OBSTRUCTED_MUTATION: CandidateMutation = {
  operation: 'add_rule',
  rule: {
    ruleId: 'exclude_obstructed_flight',
    when: { field: 'obstruction', equals: true },
    effect: { set: 'trial.valid', value: false },
  },
};

export const FLIGHT_LAB_TEACHING_SCRIPT: readonly TeachingMove[] = [
  {
    kind: 'clarifying_question',
    question: "Let's build a way to test that. What should 'best' mean?",
  },
  {
    kind: 'alternatives',
    prompt: 'What should Flight Lab write down for each throw?',
    options: [
      'The plane design',
      'How many metres it flew',
      'Whether it touched something',
    ],
  },
  {
    kind: 'clarifying_question',
    question: 'That throw looks different. Why should it not count?',
  },
  {
    kind: 'candidate_mutation',
    originalInput: FLIGHT_LAB_CORRECTION,
    mutation: EXCLUDE_OBSTRUCTED_MUTATION,
  },
];

/**
 * Phase 3's only TeachingSource: a deterministic, fixture-driven responder.
 * No model, no network, no randomness. Each call returns the next scripted move.
 */
export function createScriptedTeachingSource(
  script: readonly TeachingMove[] = FLIGHT_LAB_TEACHING_SCRIPT,
): TeachingSource {
  const moves = script.map((move) => TeachingMove.parse(move));
  let index = 0;

  return {
    interpret: async (request: TeachingRequest): Promise<TeachingMove> => {
      TeachingRequest.parse(request);
      const move = moves[index];
      if (move === undefined) {
        throw new Error('scripted teaching source has no remaining moves');
      }
      index += 1;
      return move;
    },
  };
}
