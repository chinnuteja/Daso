import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT, SRC_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-52 — No model credential or host reaches the client (E.10).
 */

const TEACHING_ROUTE = 'src/app/api/agents/teaching/route.ts';
const EVIDENCE_ROUTE = 'src/app/api/agents/evidence/route.ts';
const PERMITTED_ROUTES = [TEACHING_ROUTE, EVIDENCE_ROUTE] as const;
const CREDENTIAL = /TEACHING_AGENT_CREDENTIAL|EVIDENCE_AGENT_CREDENTIAL|MODEL_PROVIDER_BASE_ADDRESS/u;
const KEY_SHAPED = /\bsk-[a-zA-Z0-9]{10,}\b/u;
const NEXT_PUBLIC_MODEL = /NEXT_PUBLIC_.*(MODEL|TEACH|OPENAI|ANTHROPIC|CREDENTIAL|API_KEY)/iu;

function walkFiles(root: string): readonly string[] {
  if (!existsSync(root)) {
    return [];
  }
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    const absolute = join(root, name);
    if (statSync(absolute).isDirectory()) {
      out.push(...walkFiles(absolute));
    } else {
      out.push(absolute);
    }
  }
  return out;
}

describe('INV-52 — no model credential or host reaches the client (E.10)', () => {
  it('INV-52: the credential is read only inside the two permitted route files', () => {
    const offenders = listSourceFiles(SRC_ROOT)
      .filter((file) => !PERMITTED_ROUTES.includes(file.path as (typeof PERMITTED_ROUTES)[number]))
      .filter((file) => /process\.env\.[A-Za-z0-9_]*(KEY|TOKEN|SECRET|CREDENTIAL)/u.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);

    const teaching = listSourceFiles(SRC_ROOT).find((file) => file.path === TEACHING_ROUTE);
    const evidence = listSourceFiles(SRC_ROOT).find((file) => file.path === EVIDENCE_ROUTE);
    expect(teaching?.text).toMatch(/process\.env\.TEACHING_AGENT_CREDENTIAL/u);
    expect(evidence?.text).toMatch(/process\.env\.EVIDENCE_AGENT_CREDENTIAL/u);
  });

  it('INV-52: no NEXT_PUBLIC_ model variable exists in .env.example or the source', () => {
    const envExample = readFileSync(join(REPO_ROOT, '.env.example'), 'utf8');
    expect(envExample).not.toMatch(/^NEXT_PUBLIC_/mu);
    expect(envExample).toMatch(/^TEACHING_AGENT_CREDENTIAL=/mu);

    const offenders = listSourceFiles(SRC_ROOT)
      .filter((file) => NEXT_PUBLIC_MODEL.test(file.text) || /NEXT_PUBLIC_/u.test(file.text))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it(
    'INV-52: built client chunks contain no model host and no key-shaped string',
    () => {
    const staticRoot = join(REPO_ROOT, '.next/static');
    const chunks = walkFiles(staticRoot).filter((path) => /\.(js|css)$/u.test(path));
    const offenders = chunks.flatMap((absolute) => {
      const text = readFileSync(absolute, 'utf8');
      const hits: string[] = [];
      if (CREDENTIAL.test(text)) {
        hits.push(`${absolute} contains a model credential or host name`);
      }
      if (KEY_SHAPED.test(text)) {
        hits.push(`${absolute} contains a key-shaped string`);
      }
      return hits;
    });
    expect(offenders).toEqual([]);
    },
    60_000,
  );
});
