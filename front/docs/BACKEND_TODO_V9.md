# FoodWise v9 — Supabase / deployment handoff

**Phase boundary:** v9 is a frontend prototype with local IndexedDB data. The following is the next backend phase, not already implemented.

## Accounts and identity

- Supabase Auth: email/password signup and login, verified email, password reset, Google OAuth, session expiry, logout, proper error and recovery states.
- Guest: choose either Supabase anonymous users and account linking or a guarded local-to-account import flow. New accounts start empty. Never mix identities or implicitly merge an existing account's content with device guest data.
- Support authenticated/signed-in account linking and an explicit import-review experience for guest data when logging into a pre-existing account.
- Policy-approved privacy/terms pages; the operator must provide contact details, policies, jurisdiction, retention, service providers and rights before public signup.

## Suggested schema

All user-owned tables use a stable owner UUID and RLS policies for SELECT/INSERT/UPDATE/DELETE. Include timestamp metadata and database indexes for owner and parent relationship.

- `profiles`: user UUID, locale, created/updated timestamps (do not store passwords here).
- `food_items`: owner, name, category, quantity/units, added_at, nullable expiry_date, is_starred, status, source.
- `food_events`: owner, food_id, event type used_up/discarded/correction, prior/current amount, recorded_at.
- `receipt_imports`: owner, fixture/receipt fingerprint, status, imported_at, media path if retained; unique key scoped by owner for duplicate protection.
- `receipt_rows`: owner, receipt_id, user-corrected row fields.
- `ghost_cart_items`: owner, name, qty, **required** estimated unit price in AUD cents, notes, optional photo reference.
- `virtual_receipts` and `virtual_receipt_items`: owner, immutable checkout snapshot (name, qty, unit price, total cents), created_at.
- `story_sessions`: owner, receipt_item_id, route amount/quantity/time/custom, step, story revision, status, start/end times, Ghosty mood.
- `story_choices`, `story_outcomes`: owner, session, decisions and unit-conserving had/shared/saved/discarded/open values.
- `purchase_decisions`: owner, checkout item, original qty, final qty, decision type, original total cents, calculated savings cents, version, confirmed_at.
- `user_preferences`: near expiry days (1, 3, 5, 7), phone notification settings, storyAnimations, reduceMotion, storyGuidance.
- `push_subscriptions` + `notification_jobs`: only when Web Push is actually implemented.

## Business rules

- Prices are **required in Ghost Buy**; do not infer a missing price from a photo. AUD calculations use integer cents; original total = unit price × quantity.
- Don't Buy → saves original total; Buy Less → original total minus revised estimated cost; Buy as Planned → estimated savings 0, no mandatory savings page. A single indivisible item cannot be reduced to an invented fractional item; any smaller package needs user-entered new estimate.
- Aggregate My Savings from the latest effective finalized decisions. Never increment the total independently or double-count a revised/retaken story.
- The Story Result must reflect actual story choices, and food-outcome quantities must conserve the original amount. Saved/undecided food is not automatically thrown away.
- Ghost Buy virtual purchasing **never** creates Food Management items automatically.
- Expiry Date is nullable; no guessed dates or automatic discard. Days Since Purchase is currently calculated from the item added_at, not actual receipt purchase time.
- Preserve browser data during migration, and clearly separate old fixture/sample rows from user additions. The v9 frontend does not silently wipe the older local database.

## QR and photo recognition

- Food Management: capture full receipt photo → locate QR in pixels → use existing 8 test fixtures → review/edit → commit. Include `jsQR` + `ZXing-JS` official scripts in `js/vendor/` before relying on offline support; retain BarcodeDetector optionally.
- Test photo rotations, orientation, small QR, blur, HEIC/JPEG/PNG, retry/crop and permissions on iPhone Safari, iPhone Chrome and Android Chrome. Test duplicates and failed reads.
- Ghost Buy: ordinary item-only photography needs an authorized image-recognition API, safe credentials hidden on the backend, request caps, confidence/error reporting and manual price confirmation. The 8 QR product fixtures are testing only, never a storefront.

## Web Push

- HTTPS, service worker, push permission and subscriptions, server scheduled triggers, opt-out, user/food scoped filtering, timezone, de-duplication, unsupported-browser fallback and private message text.
- In-app expiry highlighting works whether phone notifications are On or Off.

## Release engineering & security

- Production HTTPS and QR destination, OAuth/callback and email template URLs, service keys kept server side, CORS/storage policies, abuse limits, backups, privacy review, account deletion/data export policy, and real device/browser tests.
- Distinguish frontend-only test completion from actual hosted/authenticated end-to-end acceptance. See `QA_REPORT_V9.md`.
