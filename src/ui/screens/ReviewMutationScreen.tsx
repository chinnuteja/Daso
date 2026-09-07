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
  const status = props.suggested
    ? 'Kale suggests this. It is not a rule until Maya approves it. Kale cannot approve it.'
    : 'Maya said this. It becomes a lasting rule only if Maya approves it.';
  const body = (
    <>
      <p className={styles.status}>{status}</p>
      <p>{props.summary}</p>
      {props.refusal !== undefined ? <p className={styles.refusal}>{props.refusal}</p> : null}
      <div className={styles.actions}>
        <ChoiceButton kind="child" emphasis="primary" onClick={props.onApprove}>
          Yes — add this to the tool
        </ChoiceButton>
        <ChoiceButton quiet onClick={props.onReject}>No — do not change the tool</ChoiceButton>
      </div>
    </>
  );

  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      {props.suggested ? <SuggestionCard>{body}</SuggestionCard> : <section className={styles.formCard}>{body}</section>}
    </div>
  );
}
