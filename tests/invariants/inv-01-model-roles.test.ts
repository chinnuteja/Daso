import { describe, expect, it } from 'vitest';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-01 — only two model-driven roles (specification section 8).
 *
 * Model access is permitted at exactly two file paths (ruling R3). Phase 4 creates the
 * teaching route; the evidence route remains uncreated. The scan must still fail for a
 * model reference anywhere else.
 */

const TEACHING_ROUTE = 'src/app/api/agents/teaching/route.ts';
const EVIDENCE_ROUTE = 'src/app/api/agents/evidence/route.ts';

const FORBIDDEN_MODEL_REFERENCES: readonly { readonly label: string; readonly pattern: RegExp }[] =
  [
    { label: 'OpenAI SDK or host', pattern: /\bopenai\b/iu },
    { label: 'Anthropic SDK or host', pattern: /\banthropic\b/iu },
    { label: 'Google generative AI SDK or host', pattern: /generativelanguage|@google\/gen/iu },
    { label: 'Vercel AI SDK', pattern: /@ai-sdk\/|\bfrom\s+['"]ai['"]/u },
    { label: 'LangChain', pattern: /\blangchain\b/iu },
    { label: 'other hosted model vendors', pattern: /\b(cohere|replicate|mistral|huggingface)\b/iu },
    { label: 'chat completion endpoint', pattern: /\/v1\/(chat\/)?completions|\/v1\/messages/u },
    { label: 'API key reference', pattern: /[A-Z0-9_]*API_KEY\b/u },
    { label: 'credential read from the environment', pattern: /process\.env\.[A-Za-z0-9_]*(KEY|TOKEN|SECRET|CREDENTIAL)/u },
  ];

describe('INV-01 — only the Teaching Agent and the Evidence Agent may be model-driven (§8)', () => {
  const sources = listSourceFiles(SRC_ROOT);

  it('INV-01: src/** is non-empty, so the scan is meaningful', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('INV-01: exactly the teaching route exists; the evidence route does not', () => {
    const present = sources
      .map((file) => file.path)
      .filter((path) => path === TEACHING_ROUTE || path === EVIDENCE_ROUTE);

    expect(present).toEqual([TEACHING_ROUTE]);
  });

  it('INV-01: no file outside the teaching route references a model SDK, host or API key', () => {
    const offenders = sources
      .filter((file) => file.path !== TEACHING_ROUTE)
      .flatMap((file) =>
        FORBIDDEN_MODEL_REFERENCES.filter((forbidden) => forbidden.pattern.test(file.text)).map(
          (forbidden) => `${file.path} references ${forbidden.label}`,
        ),
      );

    expect(offenders).toEqual([]);
  });
});
