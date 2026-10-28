# FoodWise Cream v12 — VS Code Frontend Prototype

## Open in VS Code
1. Unzip `FoodWise_Cream_v12_Frontend_VSCode.zip`.
2. VS Code → File → Open Folder → choose `FoodWise-Prototype`.
3. Recommended: use the **Live Server** extension on `index.html`, or run this from the project folder:

   ```bash
   python3 -m http.server 5500
   ```

4. Open `http://127.0.0.1:5500/index.html` in Chrome, Safari or a phone on an accessible local network.

Do **not** open `index.html` directly as `file://`: ES modules and IndexedDB typically require a normal web origin.

## Test

```bash
npm test
```

Runs 52 current-version automated checks (as of this package). `npm run test:v8-archive` and `npm run test:legacy` are **archived tests for older, incompatible story workflows**; they are retained for history and currently fail, so do not report them as passing.

## What's new in v12

- Approved Japanese Cream Patisserie six-colour palette retained, with no green promotional areas.
- Food category filters and Past Records button fit narrow mobile widths.
- Create Account login prompt and supporting copy separated and aligned.
- Food Detail has **Delete Food** with explicit confirmation, separate from Used Up / Discarded; no bulk data-clear button.
- Category select arrow and focus treatment corrected.
- Ghost Buy main bag illustration visible again (removed the old white-making CSS filter).
- Ghost Buy footer green words recoloured.
- Ghosty activity occupies the large upper panel, not a tiny overlapping image card. A user gives Ghosty the **remaining amount**; Ghosty then completes a distinct discard/share/save movement. Keyboard/touch alternative is available.
- Story Result displays larger item information and a larger Ghosty with the disposition illustration; extra page-bottom space prevents the bottom navigation obscuring the last button.
- Story Consumption Amount and Purchase Quantity now show Half for a single item and a validated manual amount input. No invented preset quarters or other fixed proportions.
- Story backtracking, buy-as-planned, buy-less actual final quantity, don't-buy, price-required Cart and Savings from v11.1 remain.
- Fresh Guest has no default user Food, Cart, History, Story, Receipt drafts or Savings. **No migration clears your existing genuine data.**

## Important constraints

- **Do not clear your browser's local data to install v12.** This update preserves user-owned local records; you have already cleared your test records separately.
- `Create Account`, `Log In`, password reset, Google SSO need a real Supabase backend; they are **not implemented** by this frontend ZIP. Guest mode works locally.
- QR fixtures for 8 receipt samples and 8 product IDs are local testing data only. Arbitrary supermarket receipt and product photos are **not guaranteed to be decoded** without verified format/provider integrations.
- Push notifications while the app is closed need backend/browser push-service support.
- Real device testing of camera permissions and touch drag is required; current automated tests and static Chromium rendering cannot certify these.
- This version has no bulk "clear test data" button and does not erase browser IndexedDB.

See `docs/V12_QA_AND_BACKEND_HANDOFF.md` for itemised status, limitations, and next backend tasks.
