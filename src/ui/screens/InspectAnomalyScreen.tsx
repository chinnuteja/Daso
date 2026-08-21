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
        {props.trials.map((trial) => (
          <li key={trial.trialId} className={styles.tile}>
            <p>
              {trial.designName} — {trial.distanceM} m
              {trial.obstruction ? ' — touched something' : ''}
            </p>
            {trial.obstruction ? (
              <ChoiceButton onClick={() => props.onSelect(trial.trialId)}>
                This one looks different
              </ChoiceButton>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
