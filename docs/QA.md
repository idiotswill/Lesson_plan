# QA record — v0.2.1 / 29 September 2026

## Executed for this patch

- `npm test`: **20 test groups passed**. Existing problem, grading, evidence and save checks pass, together with two new presentation checks. The public metadata schema contains subject descriptions and skill notes only. The set-fixture test now uses an independently chosen irregular example, including negative and non-consecutive values and directed differences.
- `python tests/python_grader_test.py`: **5 tests passed**. All four worked Python demonstration sequences match real CPython execution. Other checks cover changed inputs, strict boundaries, zero stops, invalid syntax, missing loops and termination.
- `python tests/browser_test.py --offline-harness`: **10 acceptance groups passed**. The suite traversed all ten teaching paths and 27 guided tasks, including wrong answers, frame stepping, pause/resume and answer reveals. It also exercised all full experiments, rendered HTML and computed CSS, injection probes, the lighthouse ending, save export/import, pending destinations and the 390px layout. No uncaught application JavaScript errors were reported.

The map was rendered and visually inspected after changing the subject labels. JavaScript syntax checks and a full current-file text scan were also run. Lesson IDs, examples, grading rules and save schema remain unchanged; presentation text and an isolated test fixture were revised.

## Test boundaries

Browser acceptance used the explicitly named offline harness: actual UI scripts/styles, an in-memory storage stand-in, and a test-only local CPython bridge running the same grading harness. These substitutions are not production runtime features.

**Live Pyodide loading, CDN delivery, native module loading over HTTP, browser-worker isolation and real localStorage persistence across reloads were not verified by this run.** Do not report the offline suite as a live end-to-end runtime pass. The normal `python tests/browser_test.py` path is available for that check with the local server running and internet access.

Save-format round-trips, import validation and in-session resume are tested; they are not a substitute for a real-storage reload test. Visual inspection and the mobile-width assertion are not an exhaustive device or accessibility audit.

## Learning boundaries

Tests support the specified examples and software behaviour, not universal content correctness, learning transfer, enjoyment or sustained retention. Fresh checks mostly change parameters. A beginner still needs to try the teaching, explain the method and solve an unfamiliar problem without copying the recap.

## Earlier local test records

The v0.2 revision recorded 18 Node test groups, 5 Python tests and 10 offline browser acceptance groups. The v0.1 release recorded 12 Node groups and 8 offline browser groups. Both used the same documented browser-runtime limitations. Those historical results are not additional live-runtime verification.
