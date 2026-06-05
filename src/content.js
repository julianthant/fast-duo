// ISOLATED-world bridge. The MAIN-world shim (inpage.js) can't call
// chrome.runtime directly, so this relays its sign requests to the service
// worker and posts the response back. It carries only opaque base64 strings —
// no key material, no crypto. (Phase 2 adds SSO autofill + trust-click here.)

(() => {
  const REQ = "DUO_AUTOPILOT_REQ";
  const RES = "DUO_AUTOPILOT_RES";

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const d = event.data;
    if (!d || d.type !== REQ || typeof d.nonce !== "number") return;

    chrome.runtime.sendMessage({ type: "DUO_AUTOPILOT_SIGN", request: d.request }, (response) => {
      const err = chrome.runtime.lastError;
      window.postMessage(
        {
          type: RES,
          nonce: d.nonce,
          response: err ? { ok: false, reason: err.message } : response,
        },
        window.location.origin,
      );
    });
  });
})();
