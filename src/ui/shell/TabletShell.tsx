import type { ReactNode } from 'react';
import Link from 'next/link';

import styles from './TabletShell.module.css';

export function TabletShell(props: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{props.title}</h1>
        <nav className={styles.nav} aria-label="Teach Daso">
          <Link href="/">Home</Link>
          <Link href="/journey">Teach</Link>
          <Link href="/run">Run</Link>
        </nav>
      </header>
      {props.children}
    </div>
  );
}
