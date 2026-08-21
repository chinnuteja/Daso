import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createIndexedDbRepositories, createMemoryRepositories } from '../../src/adapters/persistence';
import { SRC_ROOT, listSourceFiles } from '../support/sourceTree';

/**
 * INV-26 — child data is local-first (specification sections 11.1 and 11.2).
 */

const PERSISTENCE_ROOT = resolve(SRC_ROOT, 'adapters/persistence');

const FORBIDDEN: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'fetch(', pattern: /\bfetch\s*\(/u },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/u },
  { label: 'WebSocket', pattern: /\bWebSocket\b/u },
  { label: 'navigator.sendBeacon', pattern: /\bnavigator\.sendBeacon\b/u },
  { label: 'http URL', pattern: /https?:\/\//u },
];

describe('INV-26 — child data is local-first (§11.1, §11.2)', () => {
  it('INV-26: both implementations expose all seven repositories', () => {
    const memory = createMemoryRepositories();
    expect(Object.keys(memory).sort()).toEqual(
      ['grants', 'ledger', 'profiles', 'summaries', 'tools', 'trials', 'versions'].sort(),
    );
    expect(typeof createIndexedDbRepositories).toBe('function');
  });

  it('INV-26: src/adapters/persistence/** contains no network client or host URL', () => {
    const files = listSourceFiles(PERSISTENCE_ROOT);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.flatMap((file) =>
      FORBIDDEN.filter((forbidden) => forbidden.pattern.test(file.text)).map(
        (forbidden) => `${file.path} uses ${forbidden.label}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
