# QA record — v0.2 / 29 September 2026

## Executed for this revision

- `npm test`: **18 test groups passed** (12 existing plus 6 teaching/content/save groups).
- `python tests/python_grader_test.py`: **5 tests passed**. All four Python demonstration sequences, including every frame of the accumulator loop, match actual CPython execution. Checks also cover alternative inputs, the strict wind boundary, zero stops, wrong formulas, syntax errors and non-terminating loops.
- `python tests/browser_test.py --offline-harness`: **10 acceptance groups passed**. The new groups traverse **all 10 teaching paths and all 27 guided tasks**, try incorrect/blank answers, inspect rendered HTML, advance every demonstration, resume a paused guide, reveal a stuck step, and verify that no story/independent-learning credit is created by guided practice. Existing full-chapter regression groups still pass.

Teaching views for sets, loop tracing and editable HTML were rendered and visually inspected. The browser suite also checks the 390px overall page width. This is not an exhaustive accessibility/device audit.

A separate live-localhost smoke test was attempted. Chromium returned **net::ERR_BLOCKED_BY_ADMINISTRATOR** before loading the app. Therefore native HTTP module loading, real browser localStorage reloads and live Pyodide remain unverified in this environment. Save migration/round-trips and in-session guide resume are tested, but must not be represented as a real-storage reload pass.

The production app, not the test harness, still uses native ES modules, browser localStorage and the pinned Pyodide worker. Walkthroughs themselves require no Python download. The test bridge is not shipped as a runtime fallback.

## Teaching accuracy versus learning effectiveness

The set checker is compared against the supplied LA-01 p. 5 worked exercise. Python demonstration states are independently replayed in CPython. Web examples use the actual preview DOM, and the existing challenge checks use computed CSS. These tests support the specified examples and behaviours; they do not prove that all course content is correct or that the game teaches effectively. Fresh checks remain simple parameter changes, not a validated transfer instrument.

Next human check: can a beginner start the first activity, explain the method, and solve a new small problem without copying the recap? That remains unverified. No claim of guaranteed mastery or exam readiness is made.

---

## Previous release record

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
