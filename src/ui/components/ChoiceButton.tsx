import type { ReactNode } from 'react';

import styles from './ChoiceButton.module.css';

export function ChoiceButton(props: {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit';
  readonly kind?: 'child' | 'suggest';
  readonly quiet?: boolean;
  readonly disabled?: boolean;
}) {
  const kindClass = props.kind === 'suggest' ? styles.suggest : styles.child;
  const quietClass = props.quiet === true ? styles.quiet : '';
  return (
    <button
      type={props.type ?? 'button'}
      className={`${styles.button} ${kindClass} ${quietClass}`.trim()}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}
