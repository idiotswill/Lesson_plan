# The Unfinished World
## Chapter 01 — The Lantern Archipelago

A small, single-player learning adventure: sail a walnut boat between floating islands, persuade opinionated flowers to share their fireflies, teach Pip the mechanical moth some judgement, and rebuild an observatory's tiny website.

**v0.2 is a playable first chapter, not a complete semester or a validated mastery programme.** Ten original activities are mapped to selected sections of three supplied course packs. No Moodle files, student records, credentials, or private Drive links are committed here.

## v0.2 — learn before solving

The first version was too close to a practice tool: short definitions followed by whole problems. This update adds **ten guided teaching paths** before the existing experiments. They introduce the notation/syntax, demonstrate the method, ask for a small action with explanatory feedback, and then hand over the full problem.

Sets begin with membership and braces, not an unexplained union symbol. Python demonstrations highlight one instruction at a time and show the changing values. HTML has worked previews and a small editable paragraph before the full-page task. CSS distinguishes selectors, properties, values, and the extra padding rule.

The walkthrough opens automatically the first time you enter each activity. **Teach me step by step** replays it. You can skip it or pause and resume. Revealing a small step is allowed; watching or completing a walkthrough creates no story reward or independent-learning evidence.

**Updating from v0.1:** export your save as a precaution, replace the game files, and start again with `Start.cmd`. Existing version-1 saves, drafts and progress are accepted; no reset is needed. Keep the same browser and localhost port, or import your backup. This update improves teaching but has not yet been validated for learning transfer.

## Play locally

You need Python 3 to serve the static game files. No pip packages, Node.js installation, API keys, or paid AI service are needed to play.

**Windows:** download/extract the repository, then double-click `Start.cmd`. It starts a localhost server and opens your browser. Keep the command window open while playing.

**Linux/macOS:** run `sh Start.sh`, or:

```sh
python3 server.py
```

On Windows the equivalent command is `py -3 server.py`. The default address is `http://127.0.0.1:8000/`. An alternative port is available with `--port 8001`. Do not open `index.html` directly through `file://`; ES modules and workers need a server.

The game is also static-hosting ready. For GitHub Pages, publish **main / root** in the repository's Pages settings. Hosting is not automatically enabled by committing these files. Keep the relative directory structure intact; it works under a repository subpath.

## What is playable

| Island | Course | Implemented activities |
|---|---|---|
| Firefly Glade | Linearna algebra | Union, intersection, directed difference, complement relative to a universal set |
| Clockwork Orchard | Uvod u programiranje | Variables/arithmetic, Boolean decisions and boundaries, loops and accumulation |
| Paper Observatory | Osnove izrade web stranica | HTML title/headings/paragraphs, links and anchor targets, reusable CSS classes |
| Sleeping Foundry | Digitalni sustavi | Pending actual teaching materials; no fabricated lesson content |
| Unwritten Archive | Uvod u računarstvo | Pending actual teaching materials; no fabricated lesson content |

Sail by clicking the map or using WASD/arrow keys while the map is focused. Enter visits a nearby island. The destination buttons provide an alternative. All first-chapter activities can be opened directly; there is no story gate blocking a subject you need to practise.

Each course lantern needs its activities completed. All three lanterns unlock the lighthouse ending. Calm motion, optional sound, hints and worked solutions are included. No lives, streak penalties, or time pressure.

## Learning and progress

“In the world” begins with guided instruction and small supported exercises, followed by an interactive experiment. “Without the scenery” presents a new parameterised problem without those teaching aids. Field-journal labels distinguish supported practice, an in-world solution, a fresh check and a check passed at least 24 hours later.

These labels are **limited evidence, not mastery scores**. Fresh-check evidence requires success without in-app guided teaching, hints, revealed solutions or earlier failed submissions on that variation. The app cannot detect external help. The set generator currently has a fixed region-size pattern; broader transfer and authentic exam-style coverage remain future work.

Browser saves include progress, current editor drafts, problem variants and optional teaching checkpoints. Export JSON backups in **Save & settings**. Importing or resetting requires confirmation. A corrupt stored save is not silently overwritten. Saves are specific to the browser origin: changing ports or moving to GitHub Pages requires export/import.

## Runtime and privacy

The world, mathematics and web activities use only the repository's static files. Python tasks download **Pyodide 0.27.7** from jsDelivr on demand and execute actual Python 3 in a dedicated worker. The initial runtime download requires internet; cached/offline Python is not guaranteed. There are no application analytics or code-upload endpoints. The CDN sees normal asset requests.

The 2016 programming script uses Python 2. This game's executable examples deliberately use Python 3; see [the source map](docs/CURRICULUM.md) for the adaptation and coverage boundaries.

Python execution has a line-event budget, capped printed output, a loading timeout, a five-second execution timeout, and a Stop button. A fresh worker is created for every submission. **This is not a hardened sandbox for hostile code. Run only code you trust.**

HTML/CSS previews disable scripts, forms, remote resources and unsupported elements. The checker examines the rendered DOM and computed styles. This is a bounded workbench, not a full HTML conformance or accessibility checker. Code export is available; web export uses the sanitised preview document.

## Tests

Pure game/assessment logic (Node 20+; no npm dependencies):

```sh
npm test
```

Worked Python examples and the grading harness can also be checked with `python tests/python_grader_test.py` (Python 3 plus Node; no pip packages). This compares the displayed teaching trace frames with actual CPython execution, not merely another copy of the expected formula.

Browser acceptance tests require Python Playwright and its Chromium browser:

```sh
python -m pip install playwright
python -m playwright install chromium
python server.py --no-browser
# In another terminal:
python tests/browser_test.py
```

A restricted environment can run `python tests/browser_test.py --offline-harness`. That mode tests the actual UI using an in-memory storage stand-in and a local CPython bridge. **It does not verify Pyodide, CDN delivery, real localStorage reloads or browser-worker isolation.** Read [QA.md](docs/QA.md) for precisely what was tested in this build and what remains unverified.

## Continue development

- [Source-to-skill map and unimplemented coverage](docs/CURRICULUM.md)
- [Architecture, expansion contract and next work](docs/DEVELOPMENT.md)
- [Test results and limitations](docs/QA.md)

Original game code, writing and procedural artwork are included. The university materials are references only and remain outside the repository. No claim of university endorsement or guaranteed academic results is made.
