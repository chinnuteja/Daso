import type { AuthorshipSubject } from '../../core/inspection/authorshipView';

export function subjectCopy(subject: AuthorshipSubject): string {
  switch (subject.kind) {
    case 'metric':
      return subject.metric === 'median_distance'
        ? 'Distance'
        : subject.metric === 'median_load'
          ? 'Load'
          : 'Consistency';
    case 'input':
      return subject.input.replaceAll('_', ' ');
    case 'rule':
      return subject.ruleId.replaceAll('_', ' ');
    case 'coaching_preference':
      return 'Ideas before spelling';
    default: {
      const exhaustive: never = subject;
      return exhaustive;
    }
  }
}
