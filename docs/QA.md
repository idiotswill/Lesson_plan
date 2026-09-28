# QA record — v0.1 / 28 September 2026

## Executed successfully

`npm test`: **12 test groups passed**, including deterministic seeds, source-metadata coverage, set identities and boundary cases, generated sets over 500 seeds, answer parsing, save round-trips, malformed/oversize input protection, storage-error handling, evidence transitions, and Python reference-case generation over 100 seeds.

`node --check src/*.js` (one file at a time): all JavaScript source files parsed successfully.

`python tests/browser_test.py --offline-harness`: **8 browser acceptance groups passed**, using Chromium and the real interface code. They exercised all ten activities, wrong answers and correction, helped check labels, the Python harness and runaway-loop detection, actual HTML DOM/CSS checks, narrow preview, HTML/CSS injection probes, the ending, export/import/reset, pending course states, and 390px page layout. No uncaught application JavaScript errors were observed.

Screenshots were rendered and inspected for the exploration map and the set/Python/web workbenches. This is a visual spot-check, not a claim of exhaustive device/accessibility coverage.

## Important test-environment limitation

The development browser blocked navigation to localhost, and the environment could not retrieve the Pyodide CDN assets. Therefore browser tests used the explicitly named **offline harness**:

- Actual game source and CSS were injected into a test page; production files still use native ES modules.
- A test-only in-memory store replaced browser localStorage.
- A test-only worker bridge ran the same Python grading harness in local CPython.
- The shipped app does NOT include these test substitutions.

This demonstrates UI and grading behaviour, but **does not verify the Pyodide first-load path, browser-worker bootstrap, module loading over HTTP, cache/offline behaviour, or real localStorage across browser reloads**. Those must be tested on the player's machine or a suitable CI runner. Do not report this build as a fully live end-to-end browser/Pyodide pass.

The normal `python tests/browser_test.py` path exists for that live check, with `server.py` running in a separate terminal. It needs internet for Pyodide. The failure, loading and cancellation UI are implemented, but not every real network/browser failure has been reproduced.

## Still to verify

- Real Pyodide on Chrome/Edge and Firefox, including Stop during loading and execution.
- Actual persistence across reloads, private-browsing behaviour and cross-origin export/import.
- GitHub Pages deployment (static files are ready; publishing was not enabled by this commit).
- Keyboard-only and screen-reader usability beyond the included semantic controls.
- Authentic learning transfer, retention and enjoyment. No automated software test can establish those by itself.
