# QR-decoder dependency (v13.2)

The GitHub Pages workflow downloads and packages the official jsQR 1.4.0 browser distribution at `js/vendor/jsQR.js` plus its Apache-2.0 `LICENSE` on every deployment. It must be present in the published website to ensure iPhone scanning does not rely on runtime CDN requests. No third-party source has been fabricated or vendored without its license.

For local VS Code development with internet, the scanner also attempts to load jsQR 1.4.0 from jsDelivr or unpkg when the local script is absent. Offline local development requires downloading the same upstream distribution first. Browser BarcodeDetector and ZXing are independent fallbacks. 

Official source: https://github.com/cozmo/jsQR — Apache-2.0.
