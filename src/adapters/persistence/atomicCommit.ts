/**
 * Test-only switch so INV-57 can abort a compilation commit after the version row is
 * written. Production callers never set this.
 */
let failAfterVersionWrite = false;

export function setFailAfterVersionWrite(value: boolean): void {
  failAfterVersionWrite = value;
}

export function shouldFailAfterVersionWrite(): boolean {
  return failAfterVersionWrite;
}
