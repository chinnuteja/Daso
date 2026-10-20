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

let failAfterForkWrite = false;

export function setFailAfterForkWrite(value: boolean): void {
  failAfterForkWrite = value;
}

export function shouldFailAfterForkWrite(): boolean {
  return failAfterForkWrite;
}

let failAfterDeleteWrite = false;

export function setFailAfterDeleteWrite(value: boolean): void {
  failAfterDeleteWrite = value;
}

export function shouldFailAfterDeleteWrite(): boolean {
  return failAfterDeleteWrite;
}

let failAfterCapabilityWrite = false;

/** Test-only: proves an approval never leaves a mark snapshot without its approval/version/pointer. */
export function setFailAfterCapabilityWrite(value: boolean): void {
  failAfterCapabilityWrite = value;
}

export function shouldFailAfterCapabilityWrite(): boolean {
  return failAfterCapabilityWrite;
}
