import type { ReactNode } from 'react';

import styles from './SuggestionCard.module.css';

export function SuggestionCard(props: { readonly children: ReactNode }) {
  return (
    <article className={styles.card}>
      <p className={styles.label}>Daso suggests</p>
      {props.children}
    </article>
  );
}
