// Guest entry gate: authenticated sessions explicitly grant access at boot.
// Guest permission exists only in this running document; it is never restored
// from localStorage, sessionStorage, URL hashes, or existing food records.
// No saved Food, Cart, History, Story, or Savings data is deleted by this gate.
export const ONBOARDING_KEY = 'fw-onboarding-v11-1'; // legacy marker; ignored
export const PUBLIC_ENTRY_PAGES = new Set([
  'welcome', 'create-account', 'login', 'verify-email',
  'forgot-password','reset-password', 'guest-info', 'terms', 'privacy'
]);
export function initialPage() { return 'welcome'; }
export function entryPage(page, guestEnteredThisLaunch = false) {
  if (guestEnteredThisLaunch !== true && !PUBLIC_ENTRY_PAGES.has(page)) return 'welcome';
  return page;
}
