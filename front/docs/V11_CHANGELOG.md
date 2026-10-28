# FoodWise v11 — continuation after v10

This increment is based on the available v10 working folder plus v8/v9 references. It is **not** a promise that all F01–F104 items have passed real-device tests.

## Changes made after the 28-test v10 checkpoint

- `History → Edit Purchase Decision`: **Buy Less** now edits the **final quantity to purchase**, not the number to reduce. Domain conversion and validation happen only when saving; original planned qty is preserved. This uses the same semantics as the Story result's Buy Less form.
- Existing decisions with a price estimate display it read-only, avoiding accidental emptying of mandatory prices. Legacy v8/v9 entries which have no price offer a required correction field before saving the decision.
- Ghosty story interactions show distinct destination copy and choreography for save/share/discard; route-specific surfaces use only the approved six colors. Handover portion is derived from remaining food, not original checkout quantity.
- `docs/V10_BACKEND_CONTRACT.md`: complete explicit frontend/backend mapping and security/invariants; the VS Code start guide now links to a real file.
- Automated tests expanded with legacy outcome editing, quantity calculations, color regression, missing asset and file references, and basic packaging checks.

## Honest limitations

- `npm test` is executable without downloading packages and verifies business logic + selected HTML rendering. The sandbox's Chromium cannot access localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`); visual/browser E2E and real iOS/Android camera tests remain outstanding.
- Arbitrary product recognition, generic receipt OCR, Supabase Auth & RLS, remote push and offline-installed jsQR/ZXing are not implemented in this frontend-only ZIP. The scanner may fall back to browser BarcodeDetector or CDN when online, not guaranteed offline.
- Previously approved route labels, exact answer choices and illustrations must still be verified against the user's version history. Don't silently replace them with new options.
