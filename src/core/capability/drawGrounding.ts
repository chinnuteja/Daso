import { TeachingRequestV2 } from './context';
import { ModelIntent, type CapabilityProposal } from './types';

export type DrawGroundingResult =
  | { readonly ok: true; readonly proposal: Extract<CapabilityProposal, { kind: 'draw_pattern' }>; readonly reasons: readonly string[] }
  | { readonly ok: false; readonly reason: 'clarify' | 'kind_mismatch' | 'unsupported_meaning'; readonly question: string };

const REPEAT_WORDS = /\b(repeat|copy|again|pattern)\b/iu;
const SMALLER_WORDS = /\b(smaller|shrink|shrinks|taper|tiny|tail)\b/iu;
const SAME_WORDS = /\b(same size|same-sized|same sized|equal size)\b/iu;
const CLOSE_WORDS = /\b(close|closer|tight|dense)\b/iu;
const WIDE_WORDS = /\b(wide|farther|further|spread)\b/iu;

/**
 * Schema validity is not enough. We bind a model proposal back to the child sentence and the
 * trusted fact that a mark and path exist; we never infer a pictured object or a region name.
 */
export function groundDrawInterpretation(request: unknown, intent: unknown): DrawGroundingResult {
  const parsedRequest = TeachingRequestV2.safeParse(request);
  const parsedIntent = ModelIntent.safeParse(intent);
  if (!parsedRequest.success || !parsedIntent.success || parsedRequest.data.context.kind !== 'draw_pattern') {
    return { ok: false, reason: 'kind_mismatch', question: 'Let’s check the mark and path before trying that again.' };
  }
  if (parsedIntent.data.type === 'clarify') {
    return { ok: false, reason: 'clarify', question: parsedIntent.data.question };
  }
  if (parsedIntent.data.kind !== 'draw_pattern') {
    return { ok: false, reason: 'kind_mismatch', question: 'This idea belongs to a different kind of tool.' };
  }
  const words = parsedRequest.data.childWords.toLowerCase();
  if (!REPEAT_WORDS.test(words)) {
    return { ok: false, reason: 'unsupported_meaning', question: 'Should your mark repeat along the path, or did you want something else?' };
  }
  if (parsedIntent.data.sizeProfile === 'smaller_toward_end' && !SMALLER_WORDS.test(words)) {
    return { ok: false, reason: 'unsupported_meaning', question: 'Should the repeats stay the same size, or get smaller toward the end?' };
  }
  if (parsedIntent.data.sizeProfile === 'constant' && SMALLER_WORDS.test(words) && !SAME_WORDS.test(words)) {
    return { ok: false, reason: 'unsupported_meaning', question: 'You mentioned getting smaller. Should the repeats shrink toward the end?' };
  }
  if (parsedIntent.data.spacing === 'close' && !CLOSE_WORDS.test(words)) {
    return { ok: false, reason: 'unsupported_meaning', question: 'Should the repeats be closer together, or evenly spaced?' };
  }
  if (parsedIntent.data.spacing === 'wide' && !WIDE_WORDS.test(words)) {
    return { ok: false, reason: 'unsupported_meaning', question: 'Should the repeats be farther apart, or evenly spaced?' };
  }
  return {
    ok: true,
    proposal: parsedIntent.data,
    reasons: [
      'Your words asked for a repeat.',
      ...(parsedIntent.data.sizeProfile === 'smaller_toward_end' ? ['Your words asked for it to get smaller toward the end.'] : []),
      ...(parsedIntent.data.spacing !== 'even' ? ['Your words named the spacing.'] : []),
    ],
  };
}
