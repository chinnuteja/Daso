import type { AuthorshipSubject } from '../../core/inspection/authorshipView';

export function subjectCopy(subject: AuthorshipSubject): string {
  switch (subject.kind) {
    case 'metric':
      return subject.metric === 'median_distance' ? 'Distance' : 'Consistency';
    case 'input':
      return subject.input.replaceAll('_', ' ');
    case 'rule':
      return subject.ruleId.replaceAll('_', ' ');
    default: {
      const exhaustive: never = subject;
      return exhaustive;
    }
  }
}
