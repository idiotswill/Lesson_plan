# QA record — v0.3.0 / connected harbour

## Executed on 29 September 2026

- **53 Node test groups passed**: original content, evidence, saves, teaching and Observatory tests plus 21 new shared-harbour groups. Covered real set rules, circuit boundary cases, battery/travel costs, stale data, wrong destinations, request order, migration, future/corrupt versions, prototype stripping, journey resume/cancellation and stale-tab write protection.
- **5 Python grading tests passed**: all four old worked trace sequences checked against ordinary CPython, changed inputs, strict boundaries, zero stops, required loops and runaway programs. The active bounded local runtime replaces the previous worker-extracted harness.
- **13 real HTTP/local-process tests passed**: all actual entry files/modules; restricted file serving; Host/Origin/token/content-type checks; syntax/name errors, loops, alternate valid programs, UTF-8, forbidden APIs, bounded allocations/output, isolated runs, and stop/restart of the launcher on the same port with a new session token and working Python.
- **13 new Chromium harbour acceptance groups passed** using the explicit offline harness: five immediately available foundations; real HTML construction; two-way embedded Observatory edits; shared cargo/computer/Python/circuit; all three deliveries; wrong route, stale data and blocked-channel failures; actual computed visibility and preview sanitation; bad programs and Stop; journey restore/cancel; downloaded JSON contents and old-save migration; 390px layout and keyboard exit; corrupt/blocked/newer-storage protection. **No uncaught page errors.**
- **12 Observatory browser regression groups passed** with the existing offline harness.
- **10 earlier study-desk browser acceptance groups passed** with its updated offline harness, including all ten teaching paths and 27 small guided tasks, original experiments, traces, wrong answers, help evidence, preview injections, ending, exports/imports and narrow layout.

Desktop and 390px harbour screenshots were visually inspected. Testing found and fixed a movement-related save delay, a scheduled-preview/dispatch race, and an outdated result after Stop. Reopening the embedded workbench retains current edits without stale timers.

## What these runs do NOT establish

Chromium navigation to localhost returned `ERR_BLOCKED_BY_ADMINISTRATOR` in this environment. The new UI harness injects dependency-wrapped modules into a document and substitutes browser storage. Its fetch bridge makes real HTTP calls to the actual local service, which runs actual disposable CPython children; the browser-to-server transport itself is substituted. The old study-desk harness calls the bounded Python runtime directly; the Observatory harness needs no Python execution.

Therefore **native browser HTTP/ES-module loading, real localStorage across navigation/reloads, Back/Forward-cache lifecycle, and Windows/macOS launcher execution remain unverified**. The server restart test is real, but is not a browser save/reload test. JSON downloads were captured from headless Chromium; this is not a manual OS download-dialog test. CSS visibility checks and one mobile width are not an accessibility/device audit.

No live Pyodide or CDN test applies to v0.3.0: that runtime is no longer used. The new local runtime is explicitly restricted, not a hardened hostile-code sandbox. Unix resource limits do not prove Windows memory isolation.

## Reproduce

```sh
npm test
python tests/python_grader_test.py
python tests/local_server_test.py
python tests/harbour_browser_test.py --offline-harness --browser /usr/bin/chromium
python tests/observatory_browser_test.py --offline-harness --browser /usr/bin/chromium
python tests/browser_test.py --offline-harness
```

Omit `--offline-harness` for native verification in an unrestricted development browser. The harbour suite starts its own temporary loopback server; the older suites use the running launcher (the study-desk URL is `/expedition.html`). Test-only module bundling, storage doubles and bridges do not ship as runtime features.

## Learning boundary

Technical passing results do not prove teaching quality, enjoyment, transfer or subject readiness. This is five connected foundational systems and three authored requests, not full subject coverage. Broader topics and independent applications still need implementation and novice evaluation. Guided interaction is not independent evidence, and world rewards are not mastery scores.
