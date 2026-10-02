'use client';

import { useState } from 'react';

/** Explicit development-only control. Local DOM audit; nothing is uploaded. */
export function DevelopmentAudit() {
  const [report, setReport] = useState('Not run'), [busy, setBusy] = useState(false);
  async function audit() {
    setBusy(true);
    try {
      const axe = (await import('axe-core')).default;
      const results = await axe.run('#kale-product', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
      setReport(JSON.stringify({ engine: axe.version, url: window.location.pathname, violations: results.violations.map((item) => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })), passes: results.passes.length, incomplete: results.incomplete.map((item) => ({ id: item.id, impact: item.impact, targets: item.nodes.map((node) => node.target) })) }, null, 2));
    } catch { setReport('Audit could not finish. This is not a passing report.'); }
    finally { setBusy(false); }
  }
  if (process.env.NODE_ENV !== 'development') return null;
  return <details style={{ marginTop: '2rem', borderTop: '1px solid #c8cdc5', paddingTop: '1rem' }}><summary>Development accessibility check</summary><p>This checks only the currently visible product state. It does not replace keyboard or human testing. Nothing is uploaded.</p><button type="button" disabled={busy} onClick={() => { void audit(); }} style={{ minHeight: 44 }}>{busy ? 'Checking accessibility…' : 'Run local accessibility check'}</button><pre aria-label="Accessibility audit result" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '.75rem' }}>{report}</pre></details>;
}
