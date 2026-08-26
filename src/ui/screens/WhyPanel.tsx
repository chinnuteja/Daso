import type { AuthorshipExplanationEntry } from '../../core/inspection/authorshipView';
import type { ReadingBand } from '../../core/schema/vocabulary';
import { subjectCopy } from '../copy/subjects';
import { AuthorshipRow } from '../components/AuthorshipRow';

import styles from './screens.module.css';

export function WhyPanel(props: {
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly readingBand: ReadingBand;
  readonly childName: string;
}) {
  return (
    <section className={styles.supportCard}>
      <p className={styles.eyebrow}>Authorship, not magic</p>
      <h2 className={styles.sectionTitle}>Why this tool does this</h2>
      <ul className={styles.list}>
        {props.explanation.map((entry) => (
          <AuthorshipRow
            key={entry.eventId}
            attribution={entry.attribution}
            subjectLabel={subjectCopy(entry.subject)}
            readingBand={props.readingBand}
            childName={props.childName}
          />
        ))}
      </ul>
    </section>
  );
}
