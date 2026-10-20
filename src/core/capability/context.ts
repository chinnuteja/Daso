import { z } from 'zod';

import {
  CapabilityTeachingContext,
  type CapabilityProposal,
  type CapabilityTeachingContext as CapabilityTeachingContextType,
  ModelIntent,
} from './types';
import { Sha256Digest } from '../schema/primitives';

/** Only bounded, local facts are exposed to an interpretation model — never raw drawing pixels. */
export const ModelTeachingContext = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('draw_pattern'),
    selectedMark: z.literal('available'),
    guidePath: z.literal('available'),
  }),
  z.strictObject({
    kind: z.literal('flight_validity'),
    selectedTrial: z.strictObject({
      obstruction: z.boolean(),
      setupChanged: z.boolean(),
    }),
    hasCounterexample: z.boolean(),
  }),
]);
export type ModelTeachingContext = z.infer<typeof ModelTeachingContext>;

export const TeachingRequestV2 = z.strictObject({
  childWords: z.string().trim().min(1).max(800),
  contextDigest: Sha256Digest,
  context: ModelTeachingContext,
});
export type TeachingRequestV2 = z.infer<typeof TeachingRequestV2>;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`;
}

export async function digestCapabilityContext(
  context: CapabilityTeachingContextType,
): Promise<z.infer<typeof Sha256Digest>> {
  const bytes = new TextEncoder().encode(canonicalize(CapabilityTeachingContext.parse(context)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return Sha256Digest.parse(hex);
}

export function modelContextFromTrusted(
  context: CapabilityTeachingContextType,
): ModelTeachingContext {
  const parsed = CapabilityTeachingContext.parse(context);
  if (parsed.kind === 'draw_pattern') {
    return { kind: 'draw_pattern', selectedMark: 'available', guidePath: 'available' };
  }
  return {
    kind: 'flight_validity',
    selectedTrial: {
      obstruction: parsed.selectedTrial.obstruction,
      setupChanged: parsed.selectedTrial.setupChanged,
    },
    hasCounterexample: parsed.counterexampleTrialId !== null,
  };
}

export async function buildTeachingRequestV2(
  childWords: string,
  context: CapabilityTeachingContextType,
): Promise<TeachingRequestV2> {
  const parsedContext = CapabilityTeachingContext.parse(context);
  return TeachingRequestV2.parse({
    childWords,
    contextDigest: await digestCapabilityContext(parsedContext),
    context: modelContextFromTrusted(parsedContext),
  });
}

export type GroundingCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'kind_mismatch' | 'unsupported_context' };

/**
 * This is intentionally a local authority check. A schema-valid model object does not become
 * meaningful until it agrees with the selected artifact facts in trusted context.
 */
export function checkIntentGrounding(
  intent: unknown,
  context: CapabilityTeachingContextType,
): GroundingCheck {
  const parsedIntent = ModelIntent.parse(intent);
  const parsedContext = CapabilityTeachingContext.parse(context);
  if (parsedIntent.type === 'clarify') {
    return { ok: true };
  }
  if (parsedIntent.kind === 'flight_validity') {
    if (parsedContext.kind !== 'flight_validity') {
      return { ok: false, reason: 'kind_mismatch' };
    }
    if (!parsedContext.selectedTrial.obstruction) {
      return { ok: false, reason: 'unsupported_context' };
    }
    return { ok: true };
  }
  if (parsedContext.kind !== 'draw_pattern') {
    return { ok: false, reason: 'kind_mismatch' };
  }
  return { ok: true };
}

export function isCapabilityProposal(intent: ModelIntent): intent is CapabilityProposal {
  return intent.type === 'propose_capability';
}
