import type { ReactNode } from 'react';
import Link from 'next/link';
import { DevelopmentAudit } from './DevelopmentAudit';

import styles from './TabletShell.module.css';

export function TabletShell(props: {
  readonly title: string;
  readonly children: ReactNode;
  readonly headerActions?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div id="kale-product">
      <header className={styles.header}>
        <div className={styles.identity}>
          <Link className={styles.mark} href="/" aria-label="Kale Memory Lab home">
            <span aria-hidden="true">k</span>
          </Link>
          <div>
            <p className={styles.eyebrow}>Child-made tools</p>
            <h1 className={styles.title}>{props.title}</h1>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Kale Memory Lab">
          <Link href="/draw">Draw</Link>
          <Link href="/flight">Flight Lab</Link>
          <Link href="/draw/library">My tools</Link>
          <Link href="/parent/tools">Parent view</Link>
          <details className={styles.more}><summary aria-label="Earlier experiments"><span className={styles.fullLabel}>Earlier experiments</span><span className={styles.shortLabel} aria-hidden="true">More</span></summary><div><Link href="/writing">Writing preference</Link><Link href="/lab">Bridge Bench</Link><Link href="/library">Earlier saved tools</Link></div></details>
        </nav>
        {props.headerActions}
      </header>
      <main className={styles.main}>{props.children}</main>
      </div>
      {process.env.NODE_ENV === 'development' ? <DevelopmentAudit /> : null}
    </div>
  );
}
