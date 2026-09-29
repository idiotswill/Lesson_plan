# The Unfinished World
## Chapter 01 — The Lantern Archipelago

Sail a walnut boat between floating islands, persuade opinionated flowers to share their fireflies, teach Pip the mechanical moth some judgement, and build an observatory's tiny website.

**v0.2.1 is a playable first chapter, not a complete learning programme or a validated mastery assessment.** It contains ten activities, ten step-by-step walkthroughs and 27 smaller guided tasks.

## This update

Subject labels and skill notes now describe the game on its own. The teaching steps, experiments, rewards and saved-progress format remain in place. No new activities are added in this patch.

**Updating:** export your save as a precaution, stop the old server, replace the game files and run `Start.cmd` again. Existing version-1 saves, drafts and teaching checkpoints are accepted. Keep the same browser and localhost port, or import your backup; no progress reset is required.

## Play locally

You need Python 3 to serve the static files. No pip packages, Node.js installation, API keys or paid AI service are needed to play.

**Windows:** extract the download and double-click `Start.cmd`. Keep its command window open while playing.

**Linux/macOS:** run `sh Start.sh`, or:

```sh
python3 server.py
```

On Windows, use `py -3 server.py`. The default address is `http://127.0.0.1:8000/`; `--port 8001` selects an alternative. Do not open `index.html` directly through `file://`: native modules and workers need a server.

The files can also be served by a static host. Committing them does not automatically enable a website. Preserve the relative directory structure when publishing under a subpath.

## Explore

| Island | Subject | Activities |
|---|---|---|
| Firefly Glade | Sets & logic | Union, intersection, directed difference and complement |
| Clockwork Orchard | Python | Variables and arithmetic, Boolean decisions, loops and accumulation |
| Paper Observatory | HTML & CSS | Page structure, anchor links, reusable classes and styling |
| Sleeping Foundry | Logic circuits | Future chapter; not playable yet |
| Unwritten Archive | Computing | Future chapter; not playable yet |

Click the map or use WASD/arrow keys while it is focused. Enter visits a nearby island; destination buttons provide an alternative. Activities can be opened directly without a story gate. Complete each island's experiments for its lantern; all three lanterns unlock the lighthouse. Calm motion, optional sound, hints and worked solutions are included. No lives, streak penalties or time pressure.

## Learn before solving

Every experiment starts by explaining its notation or syntax, demonstrating a method and letting you try a smaller step with feedback. Sets begin with membership and braces. Python examples highlight one instruction at a time and show changing values. HTML begins with a small editable paragraph; CSS introduces selectors, properties, values and inner spacing separately.

The walkthrough opens automatically on the first visit. **Teach me step by step** replays it. You can skip, pause or resume, and reveal a small step when stuck. Guided practice alone creates no story reward or independent-learning evidence.

“In the world” includes teaching and an interactive experiment. “Without the scenery” presents a new parameterised problem without those aids. Journal labels distinguish supported practice, an in-world solution, a fresh check and a check passed at least 24 hours later.

These are **limited evidence, not mastery scores**. Fresh-check evidence requires success without in-app teaching, hints, revealed solutions or earlier failed submissions on that variation. Outside help cannot be detected. Broader learning transfer and sustained retention remain unverified.

## Saves and privacy

Browser saves contain progress, editor drafts, variants and teaching checkpoints. Export a JSON backup in **Save & settings**. Import and reset require confirmation; corrupt stored saves are not silently overwritten. Saves are specific to the browser origin, so changing ports or hosts requires export/import.

The world, math and web activities use the included static files. Python downloads **Pyodide 0.27.7** from jsDelivr on demand and runs actual Python 3 in a worker. Initial loading needs internet; offline availability is not guaranteed. There are no application analytics or code-upload endpoints. The CDN receives ordinary runtime asset requests. Third-party runtimes retain their own licences and notices.

Python execution has capped printed output, a line-event budget, a loading timeout, a five-second execution timeout and a Stop button. Each submission gets a fresh worker. **This is not a hardened sandbox for hostile code. Run only code you trust.**

HTML/CSS previews disable scripts, forms, remote resources and unsupported elements. Checks inspect the rendered document and computed styles, not full conformance or accessibility. Python and sanitised web exports are available.

## Tests

With Node 20 or newer, no npm dependencies are needed:

```sh
npm test
```

Check worked examples and the grading harness with `python tests/python_grader_test.py` (Python 3 plus Node, no pip packages). Displayed trace values are compared with actual CPython execution.

Browser acceptance tests require Playwright and Chromium:

```sh
python -m pip install playwright
python -m playwright install chromium
python server.py --no-browser
# In another terminal:
python tests/browser_test.py
```

Restricted environments can use `python tests/browser_test.py --offline-harness`. That mode runs the actual interface with an in-memory storage stand-in and a local CPython bridge. It does **not** verify CDN delivery, live Pyodide, real localStorage reloads or browser-worker isolation. Those substitutions are not part of the production runtime.

## Development notes

- [Skills, activity checks and coverage gaps](docs/CURRICULUM.md)
- [Architecture, safeguards and expansion](docs/DEVELOPMENT.md)
- [Test results and limitations](docs/QA.md)
