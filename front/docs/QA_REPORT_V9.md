# FoodWise v9 — honest QA summary

## Verified in this packaging session

- Node.js test suite: **19 / 19 passed** using `npm test`. Covers core version-9 domain behavior, new-user empty seed, required Ghost Buy price, receipt review gating, camera/manual screen separation, various screen output checks, Story outcome accounting and estimated savings.
- Programmatic branching matrix: **329 story scenario combinations** checked as part of the test suite for quantity conservation and state transitions.
- Static JS syntax checks are executed at packaging; no browser screenshot verification was claimed.
- Existing Ghosty assets and newly filled 2D SVG nav icons were included in the project assets.

## NOT verified in this environment

- A real interactive Chromium/Safari session: local browser navigation was blocked by the test runtime's network rules, so a full click-through visual/layout test was **not possible** here.
- Actual iPhone Safari / Chrome and Android Chrome photographs, native camera permission, frame capture, HEIC conversion, QR extraction from a real printed photo.
- `jsQR` / `ZXing-JS` CDN accessibility on the hosted destination: scripts are not bundled locally in the ZIP. Official vendor packages must be provisioned and tested in hosting (see `js/vendor/README.md`).
- Real product image recognition for arbitrary non-QR food pictures, Supabase account signup/email/Google authentication, cross-device sync, and reliable background push notifications: these need backend services.
- End-to-end website QR entrance and mobile keyboard and native locale formatting in real devices.
- Production Terms of Service/Privacy Policy legal approval.

## Release blocking smoke test

1. In a fresh profile, My Food/Cart/History are empty and My Savings shows AUD $0.00.
2. Switch English and Chinese; check EVERY dynamic text, error, form, date display and modal.
3. Food Management: manual add/edit, star/expiry sorting, mark used/discarded and Past Records. Ensure no seeded food.
4. Food Management: Add Food has 2 main options. Take Photo opens a camera UI with album link; photo recognition enters Review & Edit only after success; no Save Draft button; all 8 fixture receipts and duplicate guard.
5. Ghost Buy: Take Picture opens camera directly; Add an Item opens only a manual form; name, quantity and price required; all other rows belong to the user.
6. Ghost Buy: checkout/receipt page design has no stray green divider; price and total consistent.
7. For each Story route, use one and multiple items, different answers and Ghosty interactions. Confirm routes differ, Ghosty moods change, and food outcomes conserve quantities. Revisit/return transitions.
8. Try Don't Buy and Buy Less on a known unit price; check amount and My Savings history. Buy as Planned is neutrally completed; no mandatory Savings page. Revisit/revise decisions and check no double count.
9. Test guest onboarding and informational legal pages. DO NOT claim real account creation/login works until Supabase Auth is connected.
10. Check original Ghosty is preserved where requested, while feature cards/bottom nav use only filled 2D icons. Compare all pages to Peach Jam warm palette and Tone on Tone food colors.

## Historic notes

v8 test suites remain in `tests/` for archaeology, but their assumptions include old story interactions and are deliberately **not** the current acceptance standard. New validation is `npm test`.
