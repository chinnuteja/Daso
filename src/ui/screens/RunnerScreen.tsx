import type { AuthorshipExplanationEntry } from '../../core/inspection/authorshipView';
import type { ExperimentTrial } from '../../core/schema/experimentTrial';
import type { ReadingBand } from '../../core/schema/vocabulary';
import { WhyPanel } from './WhyPanel';

import styles from './screens.module.css';

export function RunnerScreen(props: {
  readonly title: string;
  readonly trials: readonly ExperimentTrial[];
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly readingBand: ReadingBand;
  readonly childName: string;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.title}</p>
      <p className={styles.muted}>
        Runner Mode has no teaching chat. It shows the observations you already recorded.
      </p>
      <ul className={styles.list}>
        {props.trials.map((trial) => (
          <li key={trial.trialId} className={styles.tile}>
            {trial.designName}: {trial.distanceM} m
            {trial.obstruction ? ' — path blocked' : ''}
            {trial.note !== undefined ? ` — ${trial.note}` : ''}
          </li>
        ))}
      </ul>
      <WhyPanel
        explanation={props.explanation}
        readingBand={props.readingBand}
        childName={props.childName}
      />
    </div>
  );
}
