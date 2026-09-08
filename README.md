# Duo Autopilot

Standalone Chrome extension for your UCSD Duo logins. No build or server required.
Your enrolled Duo credentials are included locally and automatically import when
Chrome first loads the extension. You still sign in with your usual SSO credentials;
this extension handles the Duo step.

## Install in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `/Users/julianhein/Projects/duo-autopilot`.
4. On the Duo Autopilot card, click **Details → Extension options**.
5. Confirm **Armed** and the imported credentials. Reload an already-open Duo page.

Keep this folder in place: Chrome loads the extension directly from it. Leave
Developer mode enabled. Installation reference:
https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked

## Controls and credentials

- **Autopilot** turns automatic approval on or off.
- **Trust this device** controls the automatic trust-device click.
- **Show toast** controls the on-page confirmation.
- **Import from packaged file** restores the credentials included in this folder.
- **Enroll via Duo** arms a one-time registration for a new factor.

The private credential file is `credentials/duo-webauthn.json`, with owner-only
permissions and a Git ignore rule. Chrome also stores imported credentials in its
local extension storage. Keep this folder private; it contains authentication keys.
To stop automatic approval, turn **Autopilot** off. Clearing stored credentials
alone is temporary while the packaged file remains: the worker can import it again
on restart.

The counter advances using the stored count and current time. Avoid simultaneous
logins using the same credentials in different browser profiles; their counters
are not shared. No SSO password or HR runtime database is required by this extension.

## Verification

Run `npm test` in this folder for the existing offline cryptographic self-test.
It uses throwaway credentials and does not contact Duo.

## Source

Copied from `/Users/julianhein/Projects/hr-automation-rebuild/duo-autopilot`
at source checkout HEAD `9018540f564e82be8db972d4509fe3e3386fdbba`.
Extension manifest and runtime source are unchanged. This folder is independent;
future rebuild changes will not automatically update it.
