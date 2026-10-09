# fast-duo

A local software WebAuthn authenticator for Duo, packaged as a Manifest V3
browser extension. After guided enrollment, it answers matching security-key
requests with keys stored in your browser profile.

The extension appears in the browser as **Duo Autopilot**. Its runtime is plain
JavaScript with no server, cloud synchronization, analytics, or external runtime
libraries. Chrome is the main setup path; Safari packaging is also included.

## Features

- **Guided enrollment:** select a Duo tab, explicitly start capture, and finish
  device registration in Duo. Capture is limited to one registration and expires
  after ten minutes.
- **Account-aware matching:** Duo's requested credential IDs determine which key
  can answer. Exact usernames resolve ambiguity; unknown or conflicting requests
  fall back to the browser's normal authenticator.
- **Alternate usernames:** link names that Duo already accepts for the same keys.
  Aliases share one account's credentials and counters.
- **Local controls:** inspect account status, pause all authentication or a single
  account, and remove local keys through settings or the toolbar popup.

## Get started

You need Chrome 140 or later, Node.js and npm for packaging, and access to your
own Duo account. Your organization must allow the chosen device type and
self-service device management. Keep an existing Duo verification method
available during enrollment.

Clone or download the source, then run from the project folder:

```sh
npm ci
npm run package
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select `dist/duo-autopilot`. Keep that folder in
   place. The clean package starts with no accounts or keys.
3. In the setup page, add your exact Duo username and an optional sign-in link.
4. Sign in normally. In Duo, open **Other options → Manage devices** and verify
   with an existing method.
5. In Autopilot, refresh the Duo tab list, select that tab and the device type,
   then choose **Start capture**.
6. In the selected Duo tab, add the device. Finish registration in Duo, then
   confirm it in Autopilot. A later login requesting that exact key also
   activates it automatically.

Use the toolbar icon to pause authentication or open settings. To link another
username to the same keys, open **Manage → Alternate usernames**. This requires
Duo to recognize those keys for both names.

See [INSTALL.md](INSTALL.md) for the complete enrollment flow and
[SAFARI.md](SAFARI.md) for Safari requirements and packaging. Chrome and Safari
keep independent storage and counters; use separately enrolled keys per browser
profile.

## Architecture and engineering choices

WebAuthn requests travel from a page hook through an isolated content script to
the extension background service. Signing happens in the background; page
scripts receive public ceremony results, never private keys.

| Component | Responsibility |
| --- | --- |
| [Page hook](src/inpage.js) and [content bridge](src/content.js) | Intercept Duo ceremonies and return WebAuthn responses across browser execution contexts. |
| [Account model](src/accounts.js) | Validate imports and resolve exact credential, account, and username matches. |
| [Service](src/service.js) | Coordinate enrollment, serialize state changes, and persist counters before releasing signed responses. |
| [Cryptography](src/crypto.js) | Generate P-256 keys and build registration and assertion data with the browser's Web Crypto API. |
| [Private storage](src/private-storage.js) | Restrict Chrome storage to trusted extension contexts and use background-owned IndexedDB on Safari. |

Content scripts and host permissions are scoped to
`https://*.duosecurity.com/*`. The background checks the browser-observed origin
against the requested origin and Duo relying-party ID. Enrollment is bound to
one account, tab, origin, and expiry; a successful capture disarms it even when
requests arrive concurrently.

A captured key remains pending until Duo's registration is confirmed or Duo
requests that exact credential. Storage migration verifies the private copy
before deleting old data and preserves both copies if a write fails or data
conflicts.

## Development and verification

```sh
npm test
npm run lint
npm run test:coverage
npm run package
```

Tests generate throwaway keys and use synthetic identities. They cover signature
verification, tamper rejection, account isolation, exact matching, concurrent
counter updates, one-shot enrollment, storage failures, and migration. Mocked
browser fixtures exercise enrollment, the WebAuthn bridge, and alias matching
without contacting a Duo server.

[VERIFICATION.md](VERIFICATION.md) describes the checks and how to run them.
Mocked checks do not establish live Duo server acceptance or compatibility with
every production page layout. Coverage of imported modules does not represent
complete UI coverage.

## Use and security

Use only your own Duo account on your own machine, where your organization's
rules permit software authenticators and automation. This is an independent
project with no Cisco Duo or institutional affiliation.

Automatic signing removes an interactive MFA step. Anyone using your unlocked
browser profile can authenticate with its connected keys. Keys rely on browser
and OS storage protection; there is no additional encryption, cloud backup, or
synchronization. Never share enrolled credentials or a personal installation
folder.

Pausing keeps your keys. Removing an account deletes its local keys; remove its
device registration in Duo separately. Keep another Duo method available before
removing the extension. Imported copies have independent counters and can cause
counter conflicts when used simultaneously.

## License

Licensed under the [MIT License](LICENSE). Bundled icons retain their separate
licenses in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
