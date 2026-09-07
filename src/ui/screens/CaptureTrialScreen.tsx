import type { FormEvent } from 'react';

import { disclosuresForSurface } from '../copy/disclosures';
import { ChoiceButton } from '../components/ChoiceButton';

import styles from './screens.module.css';

export function CaptureDisclosures() {
  const entries = disclosuresForSurface('in_product_capture_screen');
  return (
    <aside className={styles.disclosure}>
      <h2>Measured by you, not a camera</h2>
      <p>Kale stores only what you type and confirm after each real throw.</p>
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
      <div className={styles.experimentNote}>
        <span className={styles.noteIcon} aria-hidden="true">↗</span>
        <div>
          <strong>Throw first. Record second.</strong>
          <span>Go throw, then come back and write down what happened.</span>
        </div>
      </div>
      <form className={`${styles.stack} ${styles.formCard}`} onSubmit={handleSubmit}>
        <div className={styles.formHeading}>
          <div>
            <p className={styles.eyebrow}>New observation</p>
            <h2>What happened?</h2>
          </div>
          <p>One card for one real throw.</p>
        </div>
        <div className={styles.fieldGrid}>
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
            <input name="distanceM" type="number" min={0} step="0.1" inputMode="decimal" required />
          </label>
        </div>
        <label className={`${styles.field} ${styles.hit}`}>
          <input name="obstruction" type="checkbox" />
          <span>Did it touch something?</span>
        </label>
        <p className={styles.muted}>
          Record it even if it touched something. A saved rule decides later whether it counts.
        </p>
        <label className={styles.field}>
          Optional note
          <input name="note" type="text" autoComplete="off" />
        </label>
        <ChoiceButton type="submit" emphasis="primary">Record this throw</ChoiceButton>
      </form>
      <CaptureDisclosures />
      <ChoiceButton quiet onClick={props.onFinish}>I have thrown enough</ChoiceButton>
    </div>
  );
}
