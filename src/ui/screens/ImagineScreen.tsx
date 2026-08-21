import { ChoiceButton } from '../components/ChoiceButton';

import styles from './screens.module.css';

export function ImagineScreen(props: {
  readonly prompt: string;
  readonly goal: string;
  readonly onGoalStated: () => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      <div className={styles.actions}>
        <ChoiceButton onClick={props.onGoalStated}>{props.goal}</ChoiceButton>
      </div>
    </div>
  );
}
