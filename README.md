# fast-duo

Duo Autopilot is a local software WebAuthn authenticator for your own Duo
account. The Manifest V3 extension answers matching Duo security-key requests
using keys enrolled through Duo. It runs in Chrome and Safari without a server,
cloud synchronization, or analytics.

This source is provided for inspection. **All rights reserved; no general
reuse permission is granted.** See [LICENSE](LICENSE) and the separate licenses
for bundled icons in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Own-account use

Use only your own Duo account, on your own machine. Never use another person's
account or share enrolled credentials. Enrollment requires an existing Duo
verification method and the organization's device-management permissions.

Automatic responses remove the interactive step of a second factor. Anyone
using your unlocked browser profile can authenticate with its connected keys.
Keep another Duo method available. Institutional acceptable-use rules may
prohibit this behavior even for your own account; that decision remains with
the account owner. This project is independent of Cisco Duo and any institution.

## Local installation

For the owner's installation, run:

```sh
npm ci
npm run package
```

The clean Chrome package is `dist/duo-autopilot-share.zip`. Its filename reflects
the packaging format, not a permission to redistribute it. It contains no
accounts or credentials. See [INSTALL.md](INSTALL.md) for the local setup flow.

Alternatively, `npm run setup` creates an empty, ignored `bootstrap.json` if
one is missing. Load the folder containing `manifest.json` from
`chrome://extensions` with Developer mode enabled. Reload the extension and any
open Duo pages after an update. Setup preserves an existing bootstrap.

Safari builds and local installation are described in [SAFARI.md](SAFARI.md).
Chrome and Safari keep independent keys and counters. No browser-store release
has been published.

## Matching and enrollment boundaries

- Content scripts and host permissions are limited to
  `https://*.duosecurity.com/*`. Other sign-in pages are not read.
- The browser-observed sender origin must match the ceremony's origin and Duo
  relying-party ID.
- Duo's requested credential IDs are authoritative. Exact primary or alternate
  usernames can narrow the match. Missing or conflicting identity defers to the
  browser's normal authenticator.
- With no requested IDs, a visible username and a ready discoverable credential
  with a user handle are required.
- Enrollment is opt-in. **Start capture** binds it to one account, tab, origin,
  and ten-minute window. The registration username must match the account.
  One successful capture disarms it, including concurrent requests.
- A new key stays pending until the owner confirms Duo accepted it or Duo
  requests that exact key. A signed assertion does not prove a completed login.

Alternate usernames share one account's key records and counters. They cannot
make a credential valid for an unrelated Duo identity. A separate key set needs
a separate account and enrollment.

## Storage and removal

Chrome 140+ restricts local extension storage to trusted contexts. Safari 18+
stores keys in the background's IndexedDB. Migration verifies the private copy
before removing old storage and preserves data on conflicting or failed writes.
Page scripts receive public ceremony results, never private keys.

Keys have no encryption beyond browser and OS storage. Personal bootstrap and
credential files are Git-ignored and excluded from clean packages. Removing an
account deletes its local keys; remove its device registration in Duo separately.
Pausing preserves keys and blocks new signing and enrollment requests.

Use separate enrolled keys per browser profile. Imported copies do not share
counters, and simultaneous use can cause counter conflicts.

## Development checks

```sh
npm test
npm run lint
npm run test:coverage
npm run package
```

Tests use throwaway keys and synthetic identities. Browser fixtures intercept
HTTPS responses and never contact Duo. See [VERIFICATION.md](VERIFICATION.md)
for the verification procedure and its limits. Live Duo layouts, account
acceptance, and organization policy remain outside those mocked checks.

References: [Duo enrollment](https://guide.duo.com/universal-enrollment),
[Chrome local installation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked),
[WebAuthn](https://www.w3.org/TR/webauthn-2/).
