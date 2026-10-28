# FoodWise v12 — Requirement-to-code verification and backend impact

Status definitions: **Modified/tested** = code changed, current-version domain tests and/or static Chromium rendering checked; **Retained** = previous version code kept with current-version tests (not a claim of complete real-device verification); **Requires real device** = not end-to-end verified; **Backend pending** = a genuine service is required. No item in this file asserts that a remote backend exists.

| ID | Screenshot/previous requirement | Code change | QA status |
|---|---|---|---|
| FE-104 | Past Records button text escapes outline; filters wrap awkwardly | `styles/cream-v12-qa.css` grid chips + full-width button | Static Chromium 320/375/402/430px no horizontal overflow |
| FE-105 | Create Account login wording cramped; subnav and preview copy | `js/ui/screens/auth.js` prompt separate from login CTA; v12 CSS | Static Chromium 320/375/402/430px no horizontal overflow |
| FE-106 | Food cannot be removed by user | `food_delete` domain command; explicit confirmation dialog and Food Detail action | Current-version domain tests; delete in one state transaction; after removal no Past Record |
| FE-107 | Other/category select text and arrow misaligned; purple focus ring | v12 CSS uniform select and pink focus | Static Chromium visual preview; device-native select requires device check |
| FE-108 | Start Ghost Buy image white/blank | v12 CSS removes `.hero-icon` invert filter; existing 2D SVG retained | Asset exists; static Chromium preview |
| FE-109 | Ghost Buy slogan/footer green copy | v12 CSS overrides green footer and decision styling | Static Chromium preview |
| FE-110 | Discard animation layers overlap; Ghosty too small | `js/ui/screens/story.js` upper large Ghosty handover scene + independent destination; v12 CSS; delayed result button | Current-version domain tests and static Chromium preview; tactile drag/device remains to verify |
| FE-111 | Chips item card and result Ghosty too small; Continue obscured | Larger item strip/ghost result illustration; extra bottom padding | Static Chromium 320/375/402/430px; physical scroll/fixed navigation check pending |
| FE-112 | Test data should be cleared by the user; no new button | No bulk-clear button introduced; `seed.js` already empty | Confirmed test state 0. The user's browser data was cleared by the user; the ZIP never touches it |
| FE-113 | Half or manually used amount not offered when quantity 1 | `story-v2.js` supports `amount:n`; `quantity_question` offers 0/half/all + manual `qty:n`; form submit validation | Current-version domain tests including fractions, over-quantity errors, previous-step branch reset |
| FE-114 | Share scene overlaps its label/heart with Ghosty | Disposition-specific icon, separate destination slot, large receiver, no absolute-position overlay | Current-version share tests and static Chromium preview; touch/action animation remains device test |

## Existing frontend contract retained from v11.1

- **Welcome**: first-use access to Create Account, Log In and Guest; old data does not auto-skip Welcome. The account forms are only UI pending backend services.
- **Food Management**: manual + receipt photo, Review & Edit, optional expiry date, Days Since Purchase, categories, star/sort, Used Up and Discarded, past records; no runtime seeded items. Product/receipt formats need backend and real-device validation.
- **Ghost Buy**: Cart only contains user-added items; name/quantity/price mandatory for checkout; camera route separate from manual; receipt snapshot; three route templates + custom; per-item progress; previous step; Result; decision choices; Buy Less final quantity; Savings and History use domain state.
- **Accessibility**: mouse/touch drag surface and button fallback; Reduce Motion and Story Animation preferences retained.
- **Palette**: exact approved colors `#FFF9F6`, `#F5DCE5`, `#F8E2D8`, `#F4E7ED`, `#DDA5B6`, `#75646D`, while preserving necessary error color.

## Validation completed

- `npm test`: **52 / 52** current-version tests passing.
- Static full-page HTML produced by the actual view-rendering functions and CSS was injected into Chromium for **auth, food, Ghost Buy, amount, Ghosty activity, completed activity, and result** at **320, 375, 402 and 430 px**: no document horizontal overflow. This is *not* equivalent to running full live app routing.
- The browser in this execution environment blocks local URL navigation; therefore end-to-end clicking through local IndexedDB with Chromium was **not possible**. Real phone touch/camera and real local storage persistence remain to be tested after opening on the user's device.
- Legacy archive tests: `test:v8-archive` **11 pass / 12 fail**; `test:legacy` **9 pass / 21 fail**. Those test flows target old incompatible interaction semantics; not silently counted as current-version successes. Review for migration separately.

## Backend dependencies and safety boundaries

| Frontend feature | Backend required | Contract |
|---|---|---|
| Login/Create Account/Password reset | Supabase Auth | Real session, Email/Google, verification and reset. Never fake successful login |
| Guest promotion | Supabase Auth and migration API | Explicit consent before merging local IndexedDB state; idempotent records and stable ownership |
| Cloud My Food and Past Records | Postgres tables `food_items`, `food_events` with RLS | Current user only; delete event/food atomically; do not confuse deletion with discard history |
| Receipt photo QR | Client QR decode + validated receipt provider/backend | QR may not hold line items; reject unverifiable formats; private photo lifecycle |
| Product photo recognition | Verified image recognition service via Edge Function | Return editable candidates; estimated price still must be confirmed by user |
| Cart and virtual checkout | `cart_items`, `virtual_checkouts`, `checkout_items` | Required price and quantity; immutable checkout snapshot; AUD integer cents |
| Ghost Buy story | `story_sessions`, `story_answers`, `story_results` | Route version, step revision, correct remaining quantity, branch invalidation, per-item progress |
| Final decision and Savings | `purchase_decisions` | Final quantity (`Buy Less`) and unit price determine savings; idempotent sum, history separate |
| Push reminders | push subscription table / scheduled Edge Function | Explicit permission, timezone, no duplicate notifications; don't claim service without it |
| Privacy/security | RLS, private Storage, server secrets, account deletion | Cross-account tests, no secret in JS, consent and retention policies |

See `docs/V10_BACKEND_CONTRACT.md` for comprehensive existing draft schema. These are **backend handoff specifications, not deployed services**.

## Not done / needs validation

1. Real Supabase Auth, RLS, cloud persistence and remote product recognition are not implemented in this ZIP.
2. Receipt QR recognizer's local vendor bundles are still not provisioned for every browser; implementation has a network fallback. Offline QR and non-fixture supermarket receipt parsing are not guaranteed.
3. Real iPhone/Android camera, drag-and-drop, accessibility, browser back, deep links, and storage migration require manual device verification.
4. The original v8 and legacy archived test contracts differ from the approved v11/v12 story engine; they remain red and were not rewritten to falsely pass.
5. A complete live screenshot-by-screenshot sign-off of all earlier 104 requirements has not been possible in the restricted execution environment. The previous 104-item baseline is retained at `docs/V10_REQUIREMENT_TRACE.md`, and v12 screenshot fixes above are additive.
