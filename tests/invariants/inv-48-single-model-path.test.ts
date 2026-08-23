import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT, SRC_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-48 — Model access exists at exactly two file paths (§8, ruling R3).
 */

const TEACHING_ROUTE = 'src/app/api/agents/teaching/route.ts';
const EVIDENCE_ROUTE = 'src/app/api/agents/evidence/route.ts';

const FORBIDDEN: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'OpenAI SDK or host', pattern: /\bopenai\b/iu },
  { label: 'Anthropic SDK or host', pattern: /\banthropic\b/iu },
  { label: 'Vercel AI SDK', pattern: /@ai-sdk\/|\bfrom\s+['"]ai['"]/u },
  { label: 'API key reference', pattern: /[A-Z0-9_]*API_KEY\b/u },
  { label: 'credential read from the environment', pattern: /process\.env\.[A-Za-z0-9_]*(KEY|TOKEN|SECRET|CREDENTIAL)/u },
];

describe('INV-48 — model access exists at exactly two file paths (§8, R3)', () => {
  it('INV-48: the teaching and evidence routes exist, and no third route is added', () => {
    expect(existsSync(resolve(REPO_ROOT, TEACHING_ROUTE))).toBe(true);
    expect(existsSync(resolve(REPO_ROOT, EVIDENCE_ROUTE))).toBe(true);
    const routes = listSourceFiles(SRC_ROOT).filter((file) =>
      /^src\/app\/api\/agents\/[^/]+\/route\.ts$/u.test(file.path),
    );
    expect(routes.map((file) => file.path).sort()).toEqual([EVIDENCE_ROUTE, TEACHING_ROUTE].sort());
  });

  it('INV-48: no file outside the two permitted paths references a model SDK, host, or API key', () => {
    const offenders = listSourceFiles(SRC_ROOT)
      .filter((file) => file.path !== TEACHING_ROUTE && file.path !== EVIDENCE_ROUTE)
      .flatMap((file) =>
        FORBIDDEN.filter((forbidden) => forbidden.pattern.test(file.text)).map(
          (forbidden) => `${file.path} references ${forbidden.label}`,
        ),
      );
    expect(offenders).toEqual([]);
  });
});
