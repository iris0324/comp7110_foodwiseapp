# FoodWise v13 — Changes, Math Contract and QA

**Scope:** Based on v12 frontend with the v12.1 per-launch Welcome gate. This release fixes the user's most recent reported Welcome, editable usage amount, pricing interpretation and Buy Less Savings mismatch. v12's FE-105–FE-114 layout/visual/food-delete/Ghosty work remains in the source and has not been removed.

## Exactly what changed

| Request | Implementation | Test/Status |
|---|---|---|
| Always start on Welcome | `js/app/onboarding.js`, `js/main.js`: gate state is only in running document; `boot()` resets route to `#welcome` on every reload, including old hashes and stored Guest. No data wipe. | Regression test passed; full live browser navigation not run due to local URL access policy. |
| User chooses account / login / Guest | All three Welcome actions visible; only clicking Guest enters Home in the offline prototype. | Render + gate tests passed. Supabase Auth is later backend work. |
| Arbitrary actual food usage | `js/ui/screens/story.js`: numerical entry with instant used/remainder preview. Quick choices None/Half/All are only shortcuts; no invented fractions. Input confirms through existing Story state machine, which rejects negative/over-total. | Domain + UI tests passed for 1.2/2, 0.3/1, invalid > total, both relevant story routes. |
| Buy Less 2→1 from $30 TOTAL | `js/domain/selectors.js`: shared `purchaseBreakdown` derives totals/remaining purchase and savings using precise integer cents. `savings-result` shows breakdown; My Savings and History use the same contribution. | Regression 2→1 = $15; 3→1 = $20; fractional qty; Dont Buy; Buy as Planned; history edit. |
| Price meaning unclear | New item price field explicitly distinguishes **all items together (total)** vs **one item (unit price)** and previews planned total. Default is **total** for newly added items; existing records preserve their price meaning. | Domain + UI tests passed. |
| Amount changes in Buy Less | Final quantity input has live cost/savings preview before submission and is validated against original quantity. | UI render + calculator tests. |
| Stale JS cache | Source ES module imports and entry script use `v=13.0` to avoid loading old v12 code after folder replacement. | Static check. |
| Previously reported FE-105–FE-114 | Create Account spacing, Past Records button, single-food deletion, category dropdown, Ghost Buy art, residual green decorations, Ghosty large handover and result art, user added data not reset. | Previous v12 QA tests remain in passing suite. |

## Exact money contract

- **Planned total**: `estimateCents` saved on checkout item — regardless of whether user entered total price or unit price.
- `savingsCents = roundHalfUp(plannedTotalCents × (originalQty − finalQty) ÷ originalQty)`; rounding is once, in integer AUD cents using BigInt scaled quantities.
- `finalCostCents = plannedTotalCents − savingsCents`.
- **Buy Less**: `0 < finalQty < originalQty`.
- **Don't Buy**: `finalQty = 0`, savings equal planned total.
- **Buy as Planned**: `finalQty = originalQty`, savings zero, no Savings Result page.
- **Do not add cumulative money when editing**: My Savings is calculated from the single currently effective completed decision per item.
- A legacy record whose $30 was explicitly marked **per unit** for two items remains a planned total of $60. It is not silently reinterpreted as $30. New screens show the difference before checkout.

## Validation performed

- **61/61 current primary Node tests passed** (`npm test`). Includes exact $30 total 2→1 $15 scenario.
- Static Chromium render inspection at **320 / 375 / 402 / 430px** for Welcome, manual usage, Story Result, final decision, Savings Result: no horizontal viewport overflow detected. See `docs/previews/`.
- **Not fully verified:** Interactive browser navigation on the live local server is blocked in this environment; phone camera & touch interactions require phone testing. Code and rendered pages were separately inspected.
- Superseded V8 archive tests: 11/23 pass, older legacy tests: 9/30 pass; these depend on previous data/route/field requirements and are not used to claim v13 regression status.

## Intentionally not added

- No bulk clear/reset test data button and **no clearing of the user's Chrome local storage**. The user already cleared their data manually.
- No demo food, cart item, receipt, story, history or savings seeded for a new Guest.
- No new arbitrary story routes, amounts or moralizing decisions.
- No fake backend signup, AI product recognition or push success states.

## Backend implication

Supabase must persist one **planned total estimated cost in AUD cents** per checked-out line, the original quantity and unit price/total origin, a separate **final purchase quantity** and the story's actual used quantity. Savings should be derived from completed decisions with idempotency/unique keys. Do not conflate virtual story usage and final purchase quantities. See `docs/V10_BACKEND_CONTRACT.md`.
