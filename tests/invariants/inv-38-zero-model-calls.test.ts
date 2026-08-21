import { describe, expect, it } from 'vitest';

import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';
import { reachableFrom } from '../support/importGraph';

/**
 * INV-38 — amended in Phase 4: exactly two TeachingSource implementations exist, and
 * neither is reachable from Runner Mode. The durable property is that the runner and
 * the offline path reach no model.
 */

const FORBIDDEN_MODEL_REFERENCES: readonly { readonly label: string; readonly pattern: RegExp }[] =
  [
    { label: 'OpenAI SDK or host', pattern: /\bopenai\b/iu },
    { label: 'Anthropic SDK or host', pattern: /\banthropic\b/iu },
    { label: 'Google generative AI SDK or host', pattern: /generativelanguage|@google\/gen/iu },
    { label: 'Vercel AI SDK', pattern: /@ai-sdk\/|\bfrom\s+['"]ai['"]/u },
    { label: 'LangChain', pattern: /\blangchain\b/iu },
    { label: 'API key reference', pattern: /[A-Z0-9_]*API_KEY\b/u },
    { label: 'credential read from the environment', pattern: /process\.env\.[A-Za-z0-9_]*(KEY|TOKEN|SECRET|CREDENTIAL)/u },
  ];

describe('INV-38 — two TeachingSource implementations; Runner Mode reaches neither (§8)', () => {
  it('INV-38: Runner Mode reaches no model SDK, host, credential, or agents adapter', () => {
    const reachable = reachableFrom(['src/app/run/page.tsx']);
    expect(reachable.length).toBeGreaterThan(0);

    const offenders = reachable.flatMap((file) => {
      const hits = FORBIDDEN_MODEL_REFERENCES.filter((forbidden) =>
        forbidden.pattern.test(file.text),
      ).map((forbidden) => `${file.path} references ${forbidden.label}`);
      if (file.path.includes('adapters/agents') || /adapters\/agents/u.test(file.text)) {
        hits.push(`${file.path} references agents adapter`);
      }
      return hits;
    });
    expect(offenders).toEqual([]);
  });

  it('INV-38: journey may import the teaching client but not a model SDK or credential', () => {
    const reachable = reachableFrom(['src/app/journey/page.tsx']);
    expect(reachable.length).toBeGreaterThan(0);
    expect(reachable.some((file) => file.path === 'src/adapters/agents/teaching.ts')).toBe(true);

    const offenders = reachable.flatMap((file) =>
      FORBIDDEN_MODEL_REFERENCES.filter((forbidden) => forbidden.pattern.test(file.text)).map(
        (forbidden) => `${file.path} references ${forbidden.label}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('INV-38: exactly two TeachingSource implementations exist', () => {
    const adapters = listSourceFiles(SRC_ROOT).filter((file) =>
      file.path.startsWith('src/adapters/'),
    );
    const teaching = adapters.filter((file) => /\bTeachingSource\b/u.test(file.text));
    expect(teaching.map((file) => file.path).sort()).toEqual([
      'src/adapters/agents/teaching.ts',
      'src/adapters/teaching/scripted.ts',
    ]);
  });

  it('INV-38: neither TeachingSource implementation is reachable from Runner Mode', () => {
    const reachable = reachableFrom(['src/app/run/page.tsx']);
    const paths = reachable.map((file) => file.path);
    expect(paths).not.toContain('src/adapters/teaching/scripted.ts');
    expect(paths).not.toContain('src/adapters/agents/teaching.ts');
    expect(paths).not.toContain('src/core/ports/teaching.ts');
  });
});
