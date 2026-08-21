/**
 * The project's equality primitive.
 *
 * Two values are the same domain value when their canonical JSON strings are identical.
 * Object keys are emitted in code-unit order (not locale order, which would make equality
 * depend on the device), numbers are emitted in a single fixed form, and anything that has no
 * stable JSON representation is rejected rather than silently dropped.
 */

export class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanonicalJsonError';
  }
}

export function canonicalJson(value: unknown): string {
  return write(value, []);
}

function write(value: unknown, path: readonly string[]): string {
  if (value === null) {
    return 'null';
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
      return JSON.stringify(value);
    case 'number':
      return writeNumber(value, path);
    case 'object':
      return Array.isArray(value)
        ? writeArray(value as readonly unknown[], path)
        : writeObject(value as Readonly<Record<string, unknown>>, path);
    default:
      throw new CanonicalJsonError(
        `value at ${describePath(path)} has no canonical JSON form: ${typeof value}`,
      );
  }
}

function writeNumber(value: number, path: readonly string[]): string {
  if (!Number.isFinite(value)) {
    throw new CanonicalJsonError(
      `number at ${describePath(path)} is not finite, so it has no canonical form`,
    );
  }
  // Collapse negative zero, which is a distinct number but the same domain value.
  return String(value === 0 ? 0 : value);
}

function writeArray(value: readonly unknown[], path: readonly string[]): string {
  const items = value.map((item, index) => write(item, [...path, String(index)]));
  return `[${items.join(',')}]`;
}

function writeObject(value: Readonly<Record<string, unknown>>, path: readonly string[]): string {
  const keys = Object.keys(value).sort(compareByCodeUnit);
  const members: string[] = [];

  for (const key of keys) {
    const member = value[key];
    if (member === undefined) {
      // `{ a: undefined }` and `{}` are the same domain value; JSON has no undefined.
      continue;
    }
    members.push(`${JSON.stringify(key)}:${write(member, [...path, key])}`);
  }

  return `{${members.join(',')}}`;
}

function compareByCodeUnit(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

function describePath(path: readonly string[]): string {
  return path.length === 0 ? '<root>' : path.join('.');
}
