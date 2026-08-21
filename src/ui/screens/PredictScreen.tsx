import { ChoiceButton } from '../components/ChoiceButton';

import styles from './screens.module.css';

export function PredictScreen(props: {
  readonly prompt: string;
  readonly designs: readonly string[];
  readonly onPredict: (design: string) => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      <div className={styles.actions}>
        {props.designs.map((design) => (
          <ChoiceButton key={design} onClick={() => props.onPredict(design)}>
            I think {design} will do best
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}
