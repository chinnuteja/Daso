import type { AuthorshipAttribution } from '../../core/inspection/authorshipView';
import type { ReadingBand } from '../../core/schema/vocabulary';
import { attributionCopy } from '../copy/attribution';

import styles from './AuthorshipRow.module.css';

export interface AuthorshipRowProps {
  readonly attribution: AuthorshipAttribution;
  readonly subjectLabel: string;
  readonly readingBand: ReadingBand;
  readonly childName: string;
}

export function AuthorshipRow(props: AuthorshipRowProps) {
  const credit = attributionCopy(props.attribution, props.readingBand, props.childName);
  return (
    <li className={styles.row} data-attribution={props.attribution}>
      <span className={styles.subject}>{props.subjectLabel}</span>
      <span className={styles.credit}>{credit}</span>
    </li>
  );
}
