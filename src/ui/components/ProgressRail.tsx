import type { ProgressRailView } from '../copy/progressRail';

import styles from './ProgressRail.module.css';

export function ProgressRail(props: { readonly view: ProgressRailView }) {
  return (
    <nav className={styles.rail} aria-label="Teaching progress">
      <ol className={styles.steps}>
        {props.view.steps.map((step, index) => (
          <li
            key={step.label}
            className={`${styles.step} ${styles[step.status]}`}
            aria-current={step.status === 'current' ? 'step' : undefined}
          >
            <span className={styles.mark} aria-hidden="true">
              {step.status === 'complete' ? '✓' : String(index + 1)}
            </span>
            <span className={styles.label}>{step.label}</span>
          </li>
        ))}
      </ol>
      <p className={styles.next}>
        <span className={styles.nextLabel}>Next:</span> {props.view.nextAction}
      </p>
    </nav>
  );
}
