# Duo Autopilot

A standalone Manifest V3 Chrome and Safari extension with separate Duo accounts, exact key
matching, a toolbar popup, and guided personal enrollment. Runtime is plain local
JavaScript; no build or server is required.

## Your installation

Load `/Users/julianhein/Projects/duo-autopilot` from `chrome://extensions` using
Developer mode → Load unpacked. If it is already loaded, click Reload on its card,
then reopen Extension options and refresh any open Duo pages.

The private `bootstrap.json` assigns the two existing credentials to **juzaw** and
creates **jzaw** as an account awaiting setup. Existing browser data is migrated
once. Bootstrap credentials are never imported again after the new state exists,
so removing an account does not silently restore its keys.

Select **Set up jzaw**, open a Duo device-management page, authenticate with an
existing method, select that tab in Autopilot, and start capture. Add the chosen
device in Duo. The key is generated and linked locally. Finish in Duo and confirm
its success here, or complete a matching test login to activate it automatically.
Duo's WebAuthn registration username must match the account exactly. If Duo uses
an email address, edit the account to that exact name before retrying.

## Safari

Run `npm run package:safari:personal` for your private Safari app, including the
two existing keys for **juzaw** and the **jzaw** profile awaiting setup. Open
`dist/safari-personal/Duo Autopilot.app`, then enable it in Safari Settings.
This local build requires Allow unsigned extensions and permission for your Duo
site. See [SAFARI.md](SAFARI.md) for installation and clean distribution builds.

Chrome and Safari keep separate storage and counters; changes do not sync.

## Account matching

- Only HTTPS pages on duosecurity.com and its subdomains are eligible.
- The browser-provided sender origin must match the signed origin.
- Duo's credential allowlist is authoritative. A detected username can narrow it,
  never override it. Multiple matching accounts do not silently choose the first.
- An empty allowlist requires an exact detected account and a ready discoverable
  credential with a user handle. Missing or ambiguous identity falls through to
  the browser's normal authentication.
- Username detection reads visible username inputs and labeled lines such as
  `Username: juzaw`. Arbitrary page text and SSO pages on other domains are not read.
- Enrollment is explicitly armed for one account, tab, origin and ten-minute
  window. The registration username must match. A single capture disarms it.
- A captured key remains pending until the user confirms Duo accepted it or a
  later Duo request includes that exact ID. A signed assertion is not logged as
  proof that the application login succeeded.

Not every Duo page exposes a supported username field. Current routing has unit
and mocked-browser verification; current live Duo markup and new-account server
acceptance have not been verified. Site-specific layout changes may require a
small detector update. Organization policies may prevent software-key enrollment.

## Share with others

Run `npm run package`. Share **only** `dist/duo-autopilot-share.zip`, or give someone
the unpacked `dist/duo-autopilot` folder. The packaging allowlist includes runtime
files, icons, a clean bootstrap and installation instructions. It excludes your
keys, usernames, test profiles, screenshots and development dependencies.

Each person starts empty and enrolls their own key. See [INSTALL.md](INSTALL.md).
One-click installation and automatic updates require a Chrome Web Store listing
and approval; this project has not been submitted or published.

## Local storage and removal

Private keys remain in trusted extension contexts. Chrome 140+ uses
`chrome.storage.local` with `TRUSTED_CONTEXTS` access. Safari 18+ uses IndexedDB
owned by the extension background because Safari cannot restrict `storage.local`.
Safari migration verifies the private copy before deleting old shared storage;
conflicts or failed writes block startup without discarding either copy. Content scripts receive only per-request public
results and non-secret settings. Keys never appear in page scripts, UI responses,
activity history, or share archives. Your personal credential file is owner-readable
only, and both it and personal bootstrap are Git-ignored.

The master pause and per-account pause take effect on new requests. Removing an
account deletes its local keys; remove the corresponding device in Duo separately.
Enrollment needs an existing verification method. Keep that method available.
An unlocked profile can use its connected accounts. There is no encryption beyond
your browser/OS storage, no cloud sync, and no backup service. Use separate enrolled
keys per browser profile where possible; imported copies do not share counters.

## Development and verification

```
npm ci
npm run setup # creates clean bootstrap only if missing
npm test
npm run lint
npm run test:coverage
npm run package
```

Crypto tests generate throwaway keys. Core tests cover account isolation, allowlist
matching, ambiguity, tab/origin/expiry checks, one-shot capture, counters, storage
failure, migration, removal and imports. Browser smoke fixtures use intercepted
HTTPS responses and never contact Duo. Browser artifacts remain local under
`verification/`; `scripts/browser-flow.js` is run through playwright-cli with an
isolated persistent context and the extension loaded.

## Provenance

Based on `hr-automation-rebuild/duo-autopilot`, source checkout HEAD
`9018540f564e82be8db972d4509fe3e3386fdbba`. The original crypto implementation and
counter helper are preserved. This project does not modify or depend at runtime
on the HR repositories. Functional icons use Lucide; see THIRD_PARTY_NOTICES.md.

References: [Duo enrollment](https://guide.duo.com/universal-enrollment),
[Chrome installation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked),
[Chrome distribution](https://developer.chrome.com/docs/extensions/how-to/distribute),
[WebAuthn](https://www.w3.org/TR/webauthn-2/).
