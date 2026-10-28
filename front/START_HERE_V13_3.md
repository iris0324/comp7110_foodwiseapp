# FoodWise v13.3 — Receipt photo & QR recovery

## Exactly what changed

The v13.2 classroom receipt QR workflow could fail to take a photograph back from the iPhone camera sheet or stall while scanning. This targeted update fixes the two independent stages, without changing Welcome, Story, Savings, Ghosty, user data, or the selected palette.

1. Camera and album file inputs are **persistent HTML elements outside the `#app` re-rendering region**. Their file `change` events survive a screen render while the iPhone's native camera sheet is open.
2. The browser creates the image preview object URL **before any expensive decode**. Neither `Image.decode()` nor QR scanning needs to finish before the photo becomes visible.
3. On GitHub Pages, a separate Web Worker loads local `js/vendor/jsQR.js`. QR pixel processing cannot block the main UI thread. Browser BarcodeDetector is an optional independent on-device path.
4. Scanning searches the full receipt plus targeted **lower-receipt crops** and two rotations. Work is bounded and has a definitive failure state; no infinite “Reading…” screen.
5. A *real* QR value is required to match one of the eight pre-existing `data/receipts.json` classroom fixtures. Matching fills the complete item Review & Edit form immediately; optional Add Missing Item appears after scanning. Unknown/unreadable QR does not delete the photo.
6. The product-photo entry uses the same persistent file-input fix; the Ghost Buy review and manual editing logic are otherwise unchanged.

## GitHub public website update

Use the **GitHub patch ZIP** and place its `front/` contents under the existing `front/` folder, and its `.github/workflows/deploy-pages.yml` at the repository root (not inside `front`). Commit to `main`. The GitHub Actions Pages workflow **downloads jsQR 1.4.0 and its Apache-2.0 license at deployment time** and verifies the decoder exists before publishing. This is important: shipping only `js/vendor/README.md` results in the iPhone scanning being dependent on CDN network access.

After Actions shows a green check, verify the following public URL returns JavaScript, **not a 404**:

`https://iris0324.github.io/comp7110_foodwiseapp/js/vendor/jsQR.js`

Open the website in iPhone Safari. Test Food Management → Add food → Take Photo. After selecting a photo, a preview must appear. A sharp QR from `FW-R01` should produce five CLOES items. Confirmation is required before items reach My Food. If QR is too blurry, too small in the photo, or is not one of the eight known test receipts, the app should say it could not match the receipt **while retaining the photo**.

## VS Code usage

Open `FoodWise-Prototype` in VS Code and serve `index.html` using Live Server or `python3 -m http.server 5500`. Local Live Server can access jsQR over the supported CDN **if online**. For a fully offline local setup, place the official jsQR 1.4.0 browser distribution at `js/vendor/jsQR.js` and its Apache license at `js/vendor/jsQR.LICENSE.txt` (see `js/vendor/README.md`). The GitHub Pages deployment downloads these automatically.

## Verification and boundaries

- 79 Node tests pass (plus 8 real fixture QR images decoded using an independent computer-vision reader during this build).
- Source code contains no fake OCR: a photo of an arbitrary retailer's receipt **cannot be guaranteed** to contain item details in its QR. Supporting real-world unknown receipts later requires a verified receipt provider or OCR/AI extraction, often with a backend and explicit privacy handling.
- This environment cannot navigate a local website in an automated Chromium session due an administrator browser restriction and cannot run an actual iPhone camera. These tests do **not** constitute iPhone/Safari acceptance. Phone acceptance requires capturing and scanning a real fixture after the GitHub Pages deployment.
- The previous user's browser Food / Cart / History data are not cleared or modified by the update.
