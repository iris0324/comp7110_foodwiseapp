# FoodWise v13.1 — Scoped Photo Capture / Modal QA

**Base:** v13. **Scope:** Food Management receipt capture; Ghost Buy product capture; Add Food modal button appearance. Other app features and existing browser data were not reset or intentionally modified.

## Root cause

In v13, `chooseImage()` and `chooseProductImage()` attempted QR decoding before keeping and displaying the photo. A missing/unsupported QR caused an early error; the image never reached the review page. This is a frontend control-flow defect, not a missing Supabase storage backend.

## Changed behavior

- Receipt and product paths receive and preview the image **before** any QR lookup; the QR scan then updates the review page separately.
- If the image has no supported QR code, the captured image and review controls stay available.
- Receipt review allows manual missing-item entries; the receipt image is auto-saved to the existing local IndexedDB media store as a draft (no new Save Draft button).
- Product review shows the photo and editable product details. Upon Add to Cart, the photo is written to the existing IndexedDB media store with the existing Cart save operation; the Cart can display the saved image after reload.
- HEIC/HEIF and image files with empty MIME information (but valid extensions) are accepted for preview decoding when the browser can actually decode them.
- Added native-capture shutter fallback for mobile browsers without a supported live camera stream.
- Prevented stale asynchronous camera permission requests from reattaching a stream after navigation.
- Add Food modal pink primary CTA: one fill, no persistent duplicate focus ring or 2px raised shadow. Kept the approved palette and accessible keyboard focus on intentional Tab navigation.

## Non-changes

- No new bulk clear button and no reset of any user-generated FoodWise records.
- No changes to Welcome, Story, Ghosty animation, pricing/Savings, account logic or other screens.
- No automatic product AI recognition or cloud upload was added.

## Verification

- Run `npm test`. Existing 61 automated checks plus 7 scoped photo regression checks.
- Additional static Chromium render inspection at 320, 375, 402 and 430px: receipt and product review layouts had no horizontal overflow; Add Food modal has no double/shadowed ring in its initial state.
- This execution environment prohibits automated navigation to localhost and file URLs (`ERR_BLOCKED_BY_ADMINISTRATOR`); therefore **end-to-end mobile photo acquisition is not claimed as passed**. A real phone test is still required after deployment.

## Real-device acceptance checklist

1. Open the deployed FoodWise URL in mobile Safari/Chrome or the in-app browser currently in use.
2. Enter as Guest; go to Food Management → Add food → Take Photo.
3. Take a photo **without** a recognized QR; verify that the image remains visible, along with Retake and Add missing item.
4. Try the same receipt from **Choose from Album**.
5. Try a recognized fixture QR. It should populate editable rows; original image remains visible.
6. Ghost Buy → Take Picture; take any product photo. Verify the photo and Review Item page remain visible regardless of QR recognition.
7. Fill in Name, Quantity, and AUD price, Add to Cart, and verify the photo stays with the Cart entry. Reload; enter through Welcome; verify the item photo still displays.
8. On the Add Food modal, check that the pink button is flat and single-bordered, not the previous raised double ring.
