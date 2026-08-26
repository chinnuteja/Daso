import { ChoiceButton } from '../components/ChoiceButton';
import { SuggestionCard } from '../components/SuggestionCard';

import styles from './screens.module.css';

export function DefineMetricsScreen(props: {
  readonly prompt: string;
  readonly question: string | null;
  readonly canConfirm: boolean;
  readonly onChooseDistance: () => void;
  readonly onAcceptConsistency: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      {props.question !== null && <p>{props.question}</p>}
      <div className={styles.actions}>
        <ChoiceButton kind="child" onClick={props.onChooseDistance}>
          Distance — how far it flies
        </ChoiceButton>
      </div>
      <SuggestionCard>
        <p>Some planes fly far once and badly the next time. Compare how steadily they fly?</p>
        <ChoiceButton kind="suggest" onClick={props.onAcceptConsistency}>
          Yes — also compare consistency
        </ChoiceButton>
      </SuggestionCard>
      {!props.canConfirm ? (
        <p className={styles.muted}>Choose at least one way to compare the planes.</p>
      ) : null}
      <ChoiceButton emphasis="primary" onClick={props.onConfirm} disabled={!props.canConfirm}>
        That’s what “best” means
      </ChoiceButton>
    </div>
  );
}
