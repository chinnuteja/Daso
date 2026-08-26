import type { ExperimentTrial } from '../../core/schema/experimentTrial';
import { ChoiceButton } from '../components/ChoiceButton';

import styles from './screens.module.css';

export function InspectAnomalyScreen(props: {
  readonly prompt: string;
  readonly trials: readonly ExperimentTrial[];
  readonly onSelect: (trialId: ExperimentTrial['trialId']) => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      <ul className={styles.list}>
        {props.trials.map((trial, index) => (
          <li key={trial.trialId} className={styles.tile}>
            <p className={styles.eyebrow}>Throw {String(index + 1).padStart(2, '0')}</p>
            <p><strong>{trial.designName}</strong> — {trial.distanceM} m</p>
            {trial.obstruction ? <p className={styles.changeReason}>Touched something on the way.</p> : null}
            {trial.obstruction ? (
              <ChoiceButton emphasis="primary" onClick={() => props.onSelect(trial.trialId)}>
                This one looks different
              </ChoiceButton>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
