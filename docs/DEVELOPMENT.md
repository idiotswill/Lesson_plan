> Historical v0.2.1 record below. For the current connected harbour, local runtime, parallel tracks and test scope, see [CONNECTED_HARBOUR.md](CONNECTED_HARBOUR.md) and [QA.md](QA.md). The new foundational digital/computing models are not comprehensive verified subject coverage.

# Development

## Structure

The application uses static HTML, CSS and native JavaScript modules. `server.py` serves files locally; it does not execute submitted code.

- `src/content.js`: stable activity/island IDs, subject descriptions, story, explanations and hints.
- `src/core.js`: deterministic problems, checking helpers, saves and learning-evidence rules.
- `src/world.js`: procedural map, boat movement, islands and visual rewards.
- `src/app.js`: interface orchestration, workspaces, settings, journal and exports.
- `src/teaching-content.js` and `src/teaching.js`: teaching steps, demonstrations, guided actions and feedback.
- `src/python.js` and `src/python-worker.js`: bounded runtime lifecycle and Python execution.
- `src/web-workshop.js`: sanitised HTML/CSS previews and rendered checks.

## Adding activities

Establish the skill, prerequisites and expected difficulty before inventing a challenge. Record implemented coverage and limitations in `CURRICULUM.md`. Introduce every required notation or API before asking for independent work.

Keep old activity IDs stable so existing saves remain meaningful. Add explanations, a worked sequence, smaller guided actions, original examples, useful wrong-answer feedback and a genuinely different independent check. Test plausible misconceptions and alternative valid solutions, not only one expected answer.

New topics may need new mechanics. Logic circuits require a real circuit model and theory practice; C and Linux require appropriate execution environments. A renamed destination is not an integration.

Use newly written explanations, examples and assets or content with verified reuse permission. Preserve required third-party licence and attribution notices. Do not publish private documents, credentials or personal records; `.gitignore` excludes common document/archive formats and `private-materials/`.

## Saves

Schema version 1 stores stable IDs, a seed, up to 1,000 evidence records, per-mode variants and assistance counts, editor drafts, teaching checkpoints, boat position, motion preference and ending state. Imports accept only known fields and enforce type/size bounds.

Future schema changes require explicit migration and tests. Never silently drop older progress. Browser storage is origin-specific, not account-based or cloud-synchronised. Changing ports or hosts needs export/import. A corrupt stored save blocks autosave until explicit reset/import, preserving the original value.

## Execution boundaries

Python runs in a worker, not in the main page or local HTTP server. A fresh worker, timeouts, a Stop button, capped output and a line-event budget primarily limit accidental hangs. This is not a hardened sandbox for hostile code: imports, the JavaScript bridge and memory exhaustion are not comprehensively isolated. Keep secrets and privileged APIs out of the runtime.

HTML previews allow a bounded set of structural elements and attributes. Scripts, forms and remote assets are disabled. A restrictive content security policy applies in a sandboxed iframe. `allow-same-origin` enables checking; do not add `allow-scripts` alongside it. Closing-style sequences are escaped and exports use the bounded preview document.

## Teaching contract

The challenge is hidden while guidance is open. Skip and replay are explicit choices. Guidance never writes story completion or skill evidence. Opening guidance marks the current attempt as supported, including in check mode; a fresh variation resets support for that attempt.

Worked frames are fixed demonstrations, not a pretend interpreter. The Python tests compare them with actual CPython execution. Supported warm-ups are not competence results. When teaching fails, improve the explanation and practice sequence before adding more islands.

## Next work

Run live Pyodide/browser-storage checks on an unrestricted machine, strengthen independent checks and set diversity, playtest the novice flow, and improve accessibility. Larger topic expansions should follow those checks rather than replace them.
