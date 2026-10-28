# FoodWise v13 Frontend Prototype — Open in VS Code

## 1. Launch

1. Extract `FoodWise_Cream_v13_Frontend_VSCode.zip`.
2. In VS Code choose **File → Open Folder**, select `FoodWise-Prototype`.
3. Use **Live Server → Open with Live Server** on `index.html`, or in VS Code Terminal:

   ```bash
   python3 -m http.server 5500
   ```

4. Open `http://127.0.0.1:5500/index.html`.

Do not use `file://` to open `index.html`, because the app uses ES modules and browser storage.

**IMPORTANT:** All starts/reloads in this prototype (even with `#home` or `#story/...` in the URL) begin at **Welcome to FoodWise**. Choose **Continue as Guest**, **Create Account**, or **Log In** yourself. The actual account actions are not connected to Supabase yet. Going back to Welcome or reloading does **not** delete your local food/cart/history.

## 2. Verify the exact reported issues

- Welcome: visit index.html, enter Guest, reload — Welcome must appear again.
- Manual usage: Ghost Buy → Add an Item → quantity 2 → Story → Consumption Amount / Purchase Quantity → enter `1.2`; expected usage `1.2`, remainder for Ghosty `0.8`.
- Saving math: New Cart item quantity **2**, price **AUD $30** and set **All items together (total price)** → Complete Virtual Checkout → finish Story → **Buy Less** → final quantity **1**. Savings Result must state **planned total AUD $30, final cost AUD $15, savings AUD $15**.
- Alternatively enter **unit price AUD $15**, quantity 2, and select **One item (unit price)**. The checkout total and savings are the same.
- History, My Savings, Story Result use the same saved decision.
- Food Management: a user-created food can be deleted individually from Food Detail. No reset/clear-test-data button is added.
- Colors: approved cream/pink palette; all major screens and Ghosty preserved.

## 3. Tests

```bash
npm test
```

The current primary suite includes regression tests for Welcome, custom use amount, saved prices, quantity reductions, Ghosty handover, deletion, and previous steps. Older archived test scripts from superseded V8 feature designs are still packaged for comparison; they conflict with the current design and are **not** included in the current passing suite.

## 4. Backend limitations

This is a **frontend prototype with IndexedDB**. Real Supabase signup/login, Google OAuth, server persistence, arbitrary product-photo AI recognition, and scheduled browser push notifications are **not enabled**. Receipt QR support is format-dependent; test fixtures are not general production receipts. Full device camera/drag behavior requires hands-on phone testing.

See `docs/V13_CHANGELOG_QA.md` and `docs/V10_BACKEND_CONTRACT.md` for details. Images in `docs/previews/` are visual previews, not evidence that a live server was tested.
