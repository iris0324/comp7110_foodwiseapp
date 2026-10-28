# QR decoder vendor assets

For full offline / CDN-independent browser QR decoding, place the official verified upstream browser distributions at these paths:

- `jsQR.js` — jsQR 1.4.0, `dist/jsQR.js`, from https://github.com/cozmo/jsQR, Apache-2.0 license.
- `zxing.min.js` — `@zxing/library` 0.21.3 browser UMD build, from https://github.com/zxing-js/library, Apache-2.0 license.

This environment could not access npm/CDN during packaging, so no third-party code was fabricated. The scanner attempts these two local assets first, then their public CDN URLs; BarcodeDetector is the last fallback. For fully offline testing, add the vendor assets and verify licenses. Do not describe the QR fallback as fully offline before this step has passed.
