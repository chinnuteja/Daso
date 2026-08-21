import { z } from 'zod';

import { ORCHESTRATOR_STATES, type OrchestratorState } from '../orchestrator/states';
import { CandidateMutation } from '../schema/mutation';
import { NonEmptyString } from '../schema/primitives';

/**
 * The Teaching Agent's permitted moves (specification section 7.3).
 *
 * Free text is not a member: it is not a channel through which behaviour can reach the
 * ledger. Phase 4 implements this port against a model; Phase 3 ships only a scripted
 * adapter so the journey is real while the two model-driven roles remain unbuilt.
 */
export const TeachingMove = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('clarifying_question'),
    question: NonEmptyString,
  }),
  z.strictObject({
    kind: z.literal('alternatives'),
    prompt: NonEmptyString,
    options: z.union([
      z.tuple([NonEmptyString, NonEmptyString]),
      z.tuple([NonEmptyString, NonEmptyString, NonEmptyString]),
    ]),
  }),
  z.strictObject({
    kind: z.literal('candidate_mutation'),
    originalInput: NonEmptyString,
    mutation: CandidateMutation,
  }),
  z.strictObject({
    kind: z.literal('explanation'),
    text: NonEmptyString,
  }),
]);
export type TeachingMove = z.infer<typeof TeachingMove>;

export const TeachingRequest = z.strictObject({
  state: z.enum(ORCHESTRATOR_STATES),
  originalInput: NonEmptyString,
});
export type TeachingRequest = z.infer<typeof TeachingRequest>;

export interface TeachingSource {
  interpret(request: TeachingRequest): Promise<TeachingMove>;
}

export type { OrchestratorState };
