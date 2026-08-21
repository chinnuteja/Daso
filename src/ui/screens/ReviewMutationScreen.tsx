import { ChoiceButton } from '../components/ChoiceButton';
import { SuggestionCard } from '../components/SuggestionCard';

import styles from './screens.module.css';

export function ReviewMutationScreen(props: {
  readonly prompt: string;
  readonly summary: string;
  readonly suggested: boolean;
  readonly refusal?: string;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}) {
  const body = (
    <>
      <p>{props.summary}</p>
      {props.refusal !== undefined ? <p className={styles.refusal}>{props.refusal}</p> : null}
      <div className={styles.actions}>
        <ChoiceButton kind="child" onClick={props.onApprove}>
          Yes — add this to the tool
        </ChoiceButton>
        <ChoiceButton onClick={props.onReject}>No — do not change the tool</ChoiceButton>
      </div>
    </>
  );

  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      {props.suggested ? <SuggestionCard>{body}</SuggestionCard> : body}
    </div>
  );
}
