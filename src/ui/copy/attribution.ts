import type { AuthorshipAttribution } from '../../core/inspection/authorshipView';
import type { ReadingBand } from '../../core/schema/vocabulary';

const COPY: Record<
  AuthorshipAttribution,
  Record<ReadingBand, (childName: string) => string>
> = {
  child_chosen: {
    emerging: () => 'You chose this.',
    developing: (childName) => `${childName} chose this.`,
    fluent: (childName) => `Chosen by ${childName}.`,
  },
  ai_suggested_child_accepted: {
    emerging: () => 'Daso suggested this. You said yes.',
    developing: (childName) => `Daso suggested this. ${childName} said yes.`,
    fluent: (childName) => `Suggested by Daso, accepted by ${childName}.`,
  },
  child_taught: {
    emerging: () => 'You taught this rule.',
    developing: (childName) => `${childName} taught this rule.`,
    fluent: (childName) => `Taught by ${childName}.`,
  },
};

export function attributionCopy(
  attribution: AuthorshipAttribution,
  readingBand: ReadingBand,
  childName: string,
): string {
  return COPY[attribution][readingBand](childName);
}
