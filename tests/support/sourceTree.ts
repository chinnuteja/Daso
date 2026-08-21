import { readFileSync, readdirSync } from 'node:fs';
import { join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Filesystem reading for the static-scan invariants (INV-01 through INV-04).
 *
 * These invariants are assertions about source text, so they read the source tree rather than
 * importing modules: a rule that only holds for code that happens to be imported is not an
 * architectural rule. Shared here because four invariant files need the same walk.
 */

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const SRC_ROOT = resolve(REPO_ROOT, 'src');
export const CORE_ROOT = resolve(SRC_ROOT, 'core');

export interface SourceFile {
  /** Repository-relative path with forward slashes, stable across platforms. */
  readonly path: string;
  readonly absolutePath: string;
  readonly text: string;
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx'] as const;
const SKIPPED_DIRECTORIES = ['node_modules', '.next', '.git'] as const;

export function listSourceFiles(root: string): readonly SourceFile[] {
  return collect(root).map((absolutePath) => ({
    path: toPosix(relative(REPO_ROOT, absolutePath)),
    absolutePath,
    text: readFileSync(absolutePath, 'utf8'),
  }));
}

function collect(directory: string): readonly string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.some((skipped) => skipped === entry.name)) {
        continue;
      }
      found.push(...collect(join(directory, entry.name)));
      continue;
    }
    if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      found.push(join(directory, entry.name));
    }
  }

  return found.sort();
}

/**
 * Every module specifier a file references, whether through `import ... from`, a bare
 * `import '...'`, `export ... from`, or `require('...')`.
 */
export function importSpecifiers(text: string): readonly string[] {
  const pattern = /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/gu;
  const found: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const specifier = match[1];
    if (specifier !== undefined) {
      found.push(specifier);
    }
  }

  return found;
}

/** Resolves a relative specifier against the importing file, for layer containment checks. */
export function resolveRelative(fromFile: string, specifier: string): string {
  return resolve(fromFile, '..', specifier);
}

export function toPosix(path: string): string {
  return path.split(sep).join(posix.sep);
}
