# Verification — 0.3.0

Verified locally on September 7, 2026, using isolated full Chromium contexts.

| Check | Result |
| --- | --- |
| Existing cryptographic self-test | 43 passed, 0 failed |
| Account, service and username regression tests | 33 passed, 0 failed |
| ESLint recommended | Passed with no rule exemptions |
| Core coverage | 99.06% lines; 88.93% branches; 100% functions across imported core modules |
| Personal bootstrap | Both existing credentials assigned to juzaw; jzaw has no real credential yet |
| Browser enrollment fixture | Account creation, Duo tab selection, one-shot capture, pending state, assertion bridge and automatic activation passed |
| Clean share package | Fresh browser starts with zero accounts and keys; guided flow passes using throwaway keys |
| Toolbar popup | Connected account rendering and pause/resume passed |
| UI | Light/dark inspected; no overflow at 375, 768, 1024 and 1440 pixels |
| Contrast | Light body 13.74:1; light helper 5.84:1; light button 6.70:1; dark equivalents above 8.6:1 |
| Design detector | No findings |
| Browser console | No errors or warnings in verified contexts |
| Share archive | Exact 24-file allowlist; every decompressed entry checked for personal private keys and usernames; none found |
| Cleanup | Owned browsers closed and isolated profiles removed |

Core coverage does not represent UI-script coverage. Username extraction runs in
VM fixtures; the content-script, worker, page bridge and UI integration run in
browser fixtures. Browser screenshots and test output are local, ignored files
under `verification/`.

The fixture HTTPS host is fulfilled by Playwright routing. No Duo server was
contacted and no live account was enrolled. Current production Duo page layouts,
organization policy acceptance, and end-to-end real logins remain unverified.
The jzaw account still requires its owner's real enrollment through Duo.

Chrome Web Store publication is a separate deployment and has not occurred.
No changes were pushed or integrated into the HR repositories.
