# Connected harbour — v0.3.0

## Implemented contract

One local single-player game, five parallel subject beginnings, persistent creations, actual cross-system consequences. The main entry is now the harbour, not the old subject map. No new framework or external runtime dependency was added.

The earlier Observatory branch is the baseline. Its page, CSS, stages, evidence and separate check draft remain. `mountObservatory` now returns a cleanup function so closing/reopening the embedded workbench cannot leave stale render timers behind. The old map and all ten activities are retained at `expedition.html` as directly accessible study desks.

## The loop

1. Choose any of three requests. None requires another request or subject achievement.
2. Work on any of five systems; each has its own three foundation explanations and separate examples.
3. Dispatch evaluates the current rendered page and the current Python program, then snapshots the world inputs.
4. Step or play through the actual consequences. Edits cancel unfinished results rather than crediting an older state.
5. A successful delivery changes the persistent harbour. Revisit, extend the page or reroute the same systems for another request.

The first request needs set B. The garden request needs A minus B. Opening night needs A union B. Required direction, route length and resulting discovery differ; the owned page, code, cables and signal remain. This is deliberately a small set of authored requests, not a procedural campaign or large assessment bank.

## What actually controls what

- **Sets:** four stable crate IDs, two inspectable membership properties, manual selection or actual set-operation routing. The overlap is not duplicated.
- **Programming:** supplied `pods` and `leak`; the learner's numeric `energy` output becomes battery energy, capped at 12. Loading costs one unit per crate, travelling one per segment. The correct expression is not required by string matching: any supported program produces its own real result. All prior programming tasks remain supported.
- **Digital systems:** selectable gate, live loaded/channel-clear inputs and all four truth-table rows. AND waits at a blocked channel; OR can incorrectly authorize departure and encounter the barrier. A lamp is driven by the circuit output, not a completion flag.
- **Computing:** scanner input goes through processing to display or storage. Switching off clears the working display; a stored copy can be recalled. A manifest can be valid yet stale. This is an explicit educational information-flow model, not a physical emulation of computer internals.
- **Web:** the same Observatory HTML/CSS is rendered with the existing restricted preview. Nova selects a visible link containing the requested `chart` or `garden` label, or uses the first visible paragraph. The reached content must contain exactly one recognized direction, `north` or `west`. Broken/duplicate destinations, hidden content and incorrect directions affect the physical delivery. These are published fictional reader rules, not implicit HTML semantics or general natural-language understanding.

A harbour “used” label means an interaction was made. A delivery means the current combined system worked for that request. Neither becomes independent learning evidence. Separate historical practice evidence is preserved unchanged.

## Files and continuity

`harbour-state.js` owns pure rules, versioned world state, journey stepping and validation. `harbour-content.js` owns original beginner teaching. `harbour-page-reader.js` inspects the actual document. `harbour-world.js` draws local canvas art and moving residents. `harbour.js` connects controls and shared state. The optional version-1 harbour field is validated inside the existing version-1 expedition save.

Older saves receive an empty harbour and retain earlier drafts, achievements, settings and the Observatory. Unknown future/corrupt data is rejected, not stripped. An unfinished journey keeps its cursor and resumes paused. Shared-save stale-tab guards reject newer-storage conflicts. Movement and typing use bounded coalesced save intervals; movement no longer indefinitely postpones persistence. Export/import and explicit reset remain available.

No private documents, source locations, account integrations or user profile data are part of the build. All scene art and teaching additions are original local code/text.

## Runtime change

The browser Pyodide/CDN path is replaced by a local CPython adapter, using the interpreter already required by the launcher. This makes normal play independent of runtime downloads. The HTTP server serves only approved game files and script modules; it does not serve Python source, repository files or private documents.

The code endpoint requires an unpredictable session token and validates Host, Origin, fetch metadata, content type and size. Child execution uses no shell, an empty temporary working directory, isolated Python startup and a minimal environment. There are AST, number, collection, output, step and wall-time limits; Unix additionally receives resource limits. Windows does not have the Unix resource module. A child is not a general OS sandbox. Only the documented teaching subset is enabled, and only the player's own code should be run. The parent service has no multiplayer or remote-access feature.

`python-worker.js` is now an unused compatibility notice, not another execution path. Do not reintroduce remote runtime fallback silently. Do not serve this application on a public interface.

## Acceptance and remaining work

See QA.md for actual test results and substitutions. Native browser navigation to localhost was blocked by environment policy, so full HTTP/browser integration and real localStorage across navigation/restart are still unverified. Headless Chromium did run the real DOM, canvas, computed styles, preview sandbox, controls and download generation. Real HTTP requests and disposable CPython children were separately exercised, including launcher restart on the same port.

Next: a novice playtest of the whole shared journey; confirm normal Windows startup/save/reload, Back/Forward, imports and Stop on the installed interpreter; repair teaching pace and unexplained dependencies; expand the same world through more substantial parallel learning. The three small requests are not sufficient breadth, transfer, retention or curriculum coverage. Do not replace expansion with another disconnected prototype.
