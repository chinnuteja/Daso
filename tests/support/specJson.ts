import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { REPO_ROOT } from './sourceTree';

/** Loads a §9 fixture by filename so tests parse the file on disk, not a reconstructed object. */
export function loadSpecFixture(fileName: string): unknown {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, 'tests/fixtures/spec', fileName), 'utf8'));
}
