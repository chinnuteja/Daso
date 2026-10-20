export const GUIDE_SESSION_KEY = 'kale-memory-lab-guide-seen';
export const OPEN_GUIDE_EVENT = 'kale-memory-lab:open-guide';

export function guideWasSeen(): boolean {
  try {
    return sessionStorage.getItem(GUIDE_SESSION_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function rememberGuideSeen(seen: boolean): void {
  try {
    if (seen) sessionStorage.setItem(GUIDE_SESSION_KEY, 'yes');
    else sessionStorage.removeItem(GUIDE_SESSION_KEY);
  } catch {
    // The experience still works when a browser refuses session storage.
  }
}
