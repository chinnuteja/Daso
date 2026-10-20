import type { ToolVersion } from '../schema/toolVersion';
import { CoachingPreferenceDraft, type CoachingScope } from '../schema/vocabulary';

export type PreferenceInterpretation =
  | { readonly understood: false; readonly clarification: string }
  | { readonly understood: true; readonly preference: CoachingPreferenceDraft };

export type WritingCoachResponse =
  | { readonly kind: 'story_question'; readonly text: string; readonly spellingDeferred: true }
  | { readonly kind: 'spelling_note'; readonly text: string; readonly spellingDeferred: false };

/** Narrow, deterministic interpretation for the founder prototype. No model is implied. */
export function interpretWritingPreference(
  words: string,
  scope: CoachingScope,
): PreferenceInterpretation {
  const normalized = words.toLowerCase();
  const namesSpelling = /spell|grammar|typo|correct/u.test(normalized);
  const namesIdeas = /idea|story|plot|character|invent|imagin/u.test(normalized);
  const namesOrder = /first|before|later|finish|draft/u.test(normalized);
  if (!namesSpelling || !namesIdeas || !namesOrder) {
    return {
      understood: false,
      clarification: 'Tell Kale both what to help with first and what to wait to check. For example: “Ask about my story first; fix spelling after I finish.”',
    };
  }
  return {
    understood: true,
    preference: CoachingPreferenceDraft.parse({
      preferenceId: 'ideas_before_spelling',
      activity: 'writing',
      while: 'drafting',
      firstMove: 'ask_about_story',
      defer: 'spelling_feedback',
      scope,
    }),
  };
}

/** Executable behavior from the compiled preference, not generated copy. */
export function respondToWritingDraft(
  version: ToolVersion | null,
  draft: string,
): WritingCoachResponse {
  if (version?.coachingPreference?.preferenceId === 'ideas_before_spelling') {
    return {
      kind: 'story_question',
      text: storyQuestion(draft),
      spellingDeferred: true,
    };
  }
  const likelyTypo = /\bscarred\b/iu.test(draft)
    ? '“scarred”'
    : /\bteh\b/iu.test(draft)
      ? '“teh”'
      : 'one word';
  return {
    kind: 'spelling_note',
    text: `I noticed ${likelyTypo} may need a spelling check. Want help fixing it?`,
    spellingDeferred: false,
  };
}

function storyQuestion(draft: string): string {
  if (/dragon/iu.test(draft)) return 'What is the dragon afraid might happen after leaving home?';
  if (/moon|star/iu.test(draft)) return 'What should the reader wonder about this journey next?';
  return 'What do you want the reader to feel in the next part of your story?';
}
