// MAIN-world shim — the software FIDO2 authenticator's front door. Injected at
// document_start (before Duo's bundle) so our override is the `get()` Duo calls.
//
// It intercepts `navigator.credentials.get` for Duo's rpId, ships the challenge
// to the service worker (via content.js) to be signed, and assembles a synthetic
// PublicKeyCredential from the returned components. The private key NEVER enters
// this world (the page is duosecurity.com). Anything that isn't a Duo ceremony
// falls through to the real `get()`, so other passkeys keep working.

(() => {
  const RP_ID = "duosecurity.com";
  const REQ = "DUO_AUTOPILOT_REQ";
  const RES = "DUO_AUTOPILOT_RES";

  const creds = navigator.credentials;
  if (!creds || typeof creds.get !== "function") return;
  const originalGet = creds.get.bind(creds);
  console.debug("[Duo Autopilot] inpage shim installed on", location.origin);

  // ── tiny base64 helpers (MAIN world — no module imports available) ──
  const toU8 = (buf) => {
    if (buf instanceof Uint8Array) return buf;
    if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
    if (ArrayBuffer.isView(buf)) return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    return new Uint8Array(buf);
  };
  const bytesToBase64 = (buf) => {
    const u = toU8(buf);
    let bin = "";
    for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
    return btoa(bin);
  };
  const base64ToBytes = (b64) => {
    const norm = String(b64).replace(/-/g, "+").replace(/_/g, "/");
    const padded = norm + "=".repeat((4 - (norm.length % 4)) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  const base64ToBase64url = (b64) =>
    String(b64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // ── request/response correlation over window.postMessage ──
  let nonceSeq = 0;
  const pending = new Map();
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const d = event.data;
    if (!d || d.type !== RES || typeof d.nonce !== "number") return;
    const resolve = pending.get(d.nonce);
    if (!resolve) return;
    pending.delete(d.nonce);
    resolve(d.response);
  });

  function requestAssertion(payload, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const nonce = ++nonceSeq;
      pending.set(nonce, resolve);
      window.postMessage({ type: REQ, nonce, request: payload }, window.location.origin);
      setTimeout(() => {
        if (pending.has(nonce)) {
          pending.delete(nonce);
          resolve({ ok: false, reason: "timeout" });
        }
      }, timeoutMs);
    });
  }

  // Default rpId per WebAuthn is the caller's effective registrable domain; on
  // *.duosecurity.com that is "duosecurity.com".
  function rpIdFromOptions(publicKey) {
    if (publicKey.rpId) return publicKey.rpId;
    return location.hostname.split(".").slice(-2).join(".");
  }

  navigator.credentials.get = async function (options) {
    try {
      const publicKey = options && options.publicKey;
      if (!publicKey || !publicKey.challenge) return originalGet(options);
      const rpId = rpIdFromOptions(publicKey);
      console.debug(
        "[Duo Autopilot] intercepted get() rpId=%s allowCredentials=%d",
        rpId,
        Array.isArray(publicKey.allowCredentials) ? publicKey.allowCredentials.length : 0,
      );
      if (rpId !== RP_ID) return originalGet(options); // not Duo — leave it alone

      const challenge = bytesToBase64(publicKey.challenge);
      const allowCredentials = Array.isArray(publicKey.allowCredentials)
        ? publicKey.allowCredentials.filter((c) => c && c.id).map((c) => bytesToBase64(c.id))
        : [];

      const res = await requestAssertion({
        rpId,
        origin: location.origin,
        challenge,
        allowCredentials,
      });

      // No matching credential, error, or timeout — defer to the real
      // authenticator so the user's other passkeys still work.
      if (!res || !res.ok) {
        console.debug("[Duo Autopilot] deferring to real get() (%s)", (res && res.reason) || "no-response");
        return originalGet(options);
      }
      console.debug("[Duo Autopilot] answered Duo WebAuthn ceremony (%s)", res.transport);

      const credentialIdBytes = base64ToBytes(res.credentialId);
      const cred = {
        id: base64ToBase64url(res.credentialId),
        rawId: credentialIdBytes.buffer,
        type: "public-key",
        authenticatorAttachment: res.transport === "usb" ? "cross-platform" : "platform",
        response: {
          clientDataJSON: base64ToBytes(res.clientDataJSON).buffer,
          authenticatorData: base64ToBytes(res.authenticatorData).buffer,
          signature: base64ToBytes(res.signature).buffer,
          userHandle: res.userHandle ? base64ToBytes(res.userHandle).buffer : null,
        },
        getClientExtensionResults: () => ({}),
      };
      // Make `instanceof` checks pass (BUILD_PLAN §6.6). Defensive — wrap in try
      // so a missing global never breaks the assertion.
      try {
        Object.setPrototypeOf(cred.response, AuthenticatorAssertionResponse.prototype);
      } catch (_) {}
      try {
        Object.setPrototypeOf(cred, PublicKeyCredential.prototype);
      } catch (_) {}
      return cred;
    } catch (_) {
      return originalGet(options);
    }
  };

  // CRM: Duo gates the security-key factor behind
  // isExternalCTAP2SecurityKeySupported(). Real Chrome usually supports it, but
  // force true defensively so CRM reliably offers/auto-fires the ceremony.
  try {
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isExternalCTAP2SecurityKeySupported = () => Promise.resolve(true);
    }
  } catch (_) {}
})();
