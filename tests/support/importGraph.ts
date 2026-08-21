import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import {
  REPO_ROOT,
  SRC_ROOT,
  importSpecifiers,
  listSourceFiles,
  resolveRelative,
  toPosix,
  type SourceFile,
} from './sourceTree';

/**
 * Transitive relative imports under src/, starting from the given repository-relative
 * entry files. External packages are ignored; they are not part of this repository's
 * import graph.
 */
export function reachableFrom(entryPaths: readonly string[]): readonly SourceFile[] {
  const all = listSourceFiles(SRC_ROOT);
  const byPath = new Map(all.map((file) => [file.path, file]));
  const seen = new Set<string>();
  const queue = [...entryPaths];

  while (queue.length > 0) {
    const path = queue.pop();
    if (path === undefined || seen.has(path)) {
      continue;
    }
    const file = byPath.get(path);
    if (file === undefined) {
      continue;
    }
    seen.add(path);
    for (const specifier of importSpecifiers(file.text)) {
      const resolved = resolveSpecifier(file.absolutePath, specifier);
      if (resolved !== null) {
        queue.push(resolved);
      }
    }
  }

  return [...seen]
    .sort()
    .map((path) => byPath.get(path))
    .filter((file): file is SourceFile => file !== undefined);
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return existingSrcModule(resolve(SRC_ROOT, specifier.slice(2)));
  }
  if (!specifier.startsWith('.')) {
    return null;
  }
  return existingSrcModule(resolveRelative(fromFile, specifier));
}

function existingSrcModule(absoluteWithoutExt: string): string | null {
  const candidates = [
    absoluteWithoutExt,
    `${absoluteWithoutExt}.ts`,
    `${absoluteWithoutExt}.tsx`,
    resolve(absoluteWithoutExt, 'index.ts'),
    resolve(absoluteWithoutExt, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && (candidate.endsWith('.ts') || candidate.endsWith('.tsx'))) {
      return toPosix(relative(REPO_ROOT, candidate));
    }
  }
  return null;
}
