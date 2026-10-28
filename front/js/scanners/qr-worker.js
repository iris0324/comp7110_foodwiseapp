/* FoodWise local QR image decoding worker. The jsQR distribution is installed at
 * js/vendor/jsQR.js by the project's GitHub Pages workflow. No receipt photo is
 * sent to an external server. */
let initialized = false;
let failed = false;
self.onmessage = event => {
  const {id, pixels, width, height} = event.data || {};
  try {
    if (!initialized && !failed) {
      try { importScripts('../vendor/jsQR.js'); initialized = typeof self.jsQR === 'function'; }
      catch { failed = true; }
    }
    if (!initialized) { self.postMessage({id, status:'unavailable'}); return; }
    const result = self.jsQR(pixels, width, height, {inversionAttempts:'attemptBoth'});
    self.postMessage({id, status:result?.data?'found':'not_found', value:result?.data||''});
  } catch (error) {
    self.postMessage({id, status:'error', error:String(error?.message||error)});
  }
};
