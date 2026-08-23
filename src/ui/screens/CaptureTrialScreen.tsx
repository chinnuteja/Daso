import type { FormEvent } from 'react';

import { disclosuresForSurface } from '../copy/disclosures';
import { ChoiceButton } from '../components/ChoiceButton';

import styles from './screens.module.css';

export function CaptureDisclosures() {
  const entries = disclosuresForSurface('in_product_capture_screen');
  return (
    <aside className={styles.disclosure}>
      <h2>What is simulated on this screen</h2>
      <dl>
        {entries.map((entry) => (
          <div key={entry.capability}>
            <dt>{entry.whatIsSimulated}</dt>
            <dd>{entry.whatIsReal}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export interface CaptureFields {
  readonly designName: string;
  readonly distanceM: number;
  readonly obstruction: boolean;
  readonly note?: string;
}

export function CaptureTrialScreen(props: {
  readonly prompt: string;
  readonly designs: readonly string[];
  readonly onRecord: (fields: CaptureFields) => void;
  readonly onFinish: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const designName = String(data.get('designName') ?? '');
    const distanceM = Number(data.get('distanceM'));
    const obstruction = data.get('obstruction') === 'on';
    const noteValue = String(data.get('note') ?? '').trim();
    props.onRecord({
      designName,
      distanceM,
      obstruction,
      ...(noteValue.length > 0 ? { note: noteValue } : {}),
    });
    event.currentTarget.reset();
  }

  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      <p className={styles.lede}>Go throw, then come back and write down what happened.</p>
      <CaptureDisclosures />
      <form className={styles.stack} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Plane
          <select name="designName" required>
            {props.designs.map((design) => (
              <option key={design} value={design}>
                {design}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Distance in metres
          <input name="distanceM" type="number" min={0} step="0.1" required />
        </label>
        <label className={`${styles.field} ${styles.hit}`}>
          <input name="obstruction" type="checkbox" />
          <span>Did it touch something?</span>
        </label>
        <p className={styles.muted}>
          Write the throw even if it touched something. The saved rule decides later whether it
          counts.
        </p>
        <label className={styles.field}>
          Optional note
          <input name="note" type="text" autoComplete="off" />
        </label>
        <ChoiceButton type="submit">Record this throw</ChoiceButton>
      </form>
      <ChoiceButton onClick={props.onFinish}>I have thrown enough</ChoiceButton>
    </div>
  );
}
