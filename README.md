# The Unfinished World — v0.3.0
## A Harbour of Small Things

A local, single-player learning adventure. Five subjects are available together from their beginnings. The crates, information page, Python charger, departure circuit and manifest computer belong to **one shared harbour**, not five resettable exercises.

## Start here

You need an installed **Python 3.9 or newer** and a desktop browser. No pip/npm packages, account, internet connection, API key or online AI service is needed to play after those are installed.

- **Windows:** extract the complete game folder and double-click `Start.cmd`.
- **Linux/macOS:** run `sh Start.sh` from the extracted folder.
- Keep the launcher window open. Stop it with Ctrl+C when finished.

The default address is `http://127.0.0.1:8000/`. Do not open the HTML file directly or use a generic static server: this build also needs its local Python service. `python3 server.py --no-browser` starts without opening a browser. `--port 8001` selects another port, but that is a different browser-save location.

**Updating from v0.2.1 or the Observatory patch:** export your old save first, close old tabs and stop the old launcher. Use the complete new folder, keeping the same browser, host and port. Existing activity progress and the Observatory page are retained; import your backup when moving browsers. Older game builds do not understand the new harbour field: do not use them to save over newer work.

## Play a connected request

Walk or click between the five buildings, or use their workstation buttons. Every workstation has its own foundation explanations, separate worked examples and things to try. No subject is locked behind another.

Your reusable sorter moves actual crates onto Pip's tray. The computer scans those same crate IDs into a manifest; changing the cargo does not silently update the old data. The circuit evaluates the actual loaded/clear inputs. Your real Python output supplies the battery. Nova reads your actual saved HTML page to choose a route. A wrong route, stale manifest, unsuitable circuit, wrong cargo or empty battery produces a different journey.

The three requests can be attempted in any order. They reuse your work and create persistent changes in the harbour. Step, play or pause the journey; mistakes return cargo safely. There are no lives, deadlines, points or grind requirements.

The **full Observatory workbench** opens inside the harbour and edits the very same saved page. **Study desks** retains the earlier focused activities and checks. Guided use and world discoveries are not relabelled as mastery evidence.

## Local execution and privacy

Everything needed by the game is in the folder or the installed Python/browser. The launcher binds only to 127.0.0.1 and exposes no LAN service. No analytics, cloud saves, remote assets or runtime CDN are used. Progress is saved in this browser; export JSON backups from Save & settings.

Python now runs in disposable local CPython children, with a session token, same-origin checks, restricted syntax, bounded values/loops/output and a four-second process timeout. This is **real Python for a documented introductory subset**, not unrestricted Python and not a hardened hostile-code sandbox. Imports, attributes, file/network access, classes and arbitrary function calls are disabled. Run only your own code. The Stop button cancels the result; the child may take up to four seconds to exit. Export code for ordinary Python outside this workbench.

HTML previews disable scripts, remote assets, forms and unsupported elements. Visitor rules are explicit deterministic game rules, not AI text understanding or a full accessibility audit.

## Scope and verification

This is a connected introductory increment, **not the complete curriculum or a finished campaign**. Digital-systems and computing activities are small foundational models, not verified comprehensive subject coverage. Broader mathematics, programming, web design and combined projects remain to be developed.

See [Connected harbour implementation and limits](docs/CONNECTED_HARBOUR.md), [current QA](docs/QA.md), and [coverage](docs/CURRICULUM.md).

Developer tests (not needed to play):

```sh
npm test
python tests/python_grader_test.py
python tests/local_server_test.py
# With Playwright and Chromium installed:
python tests/harbour_browser_test.py
python tests/observatory_browser_test.py --browser /path/to/chromium
python tests/browser_test.py --url http://127.0.0.1:8000/expedition.html
```

Each browser suite also has `--offline-harness`. Its substitutions are described in the QA record; passing it is not proof of native browser HTTP loading, real-storage reload, Windows launchers or platform-wide compatibility.
