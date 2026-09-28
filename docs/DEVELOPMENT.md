# Development notes

## Structure

The app deliberately has no production bundler or npm dependencies. Static relative URLs support localhost and repository-subpath hosting.

- `index.html`, `styles.css`: accessible DOM controls, dialogs, responsive panels and original interface design.
- `src/world.js`: canvas artwork, sailing, island selection and the lighthouse state. An equivalent DOM destination list avoids making canvas interaction mandatory.
- `src/content.js`: stable lesson/island IDs, story, teaching copy, hints and source metadata.
- `src/core.js`: seeded generators, pure expected-answer logic, save validation and evidence labels.
- `src/app.js`: the application controller, editor drafts, modes, hints, export/import and feedback.
- `src/python.js`: worker lifetime, cancellation and timeouts.
- `src/python-worker.js`: pinned Pyodide boot plus an actual Python harness; a new worker per submission and fresh namespace per input case.
- `src/web-workshop.js`: bounded preview sanitisation, iframe policy and DOM/computed-style checks.
- `server.py`: Python-standard-library static localhost server. It does not execute the learner's code, accept uploads or serve arbitrary repository/private files.

## Extending a course

1. Review the real source section, examples and expected assessment difficulty. Update `CURRICULUM.md`; do not fabricate a citation from a filename.
2. Add a stable lesson ID and explicit prerequisites. Keep old IDs when content is reorganised so saves remain meaningful.
3. Implement the mechanic, original examples, conceptual feedback, edge cases and a materially different independent check.
4. Add unit tests with independently derived expected answers and a browser acceptance path.
5. Test both valid alternate answers and plausible misconceptions. A demonstration working once is not a reliable checker.
6. Re-evaluate learning evidence; do not grant mastery on story completion.

The existing three activity kinds are not a universal course engine. A new subject such as Digitalni sustavi needs a genuine circuit model and theory practice; C or Linux needs a separate execution environment. New course labels alone are not completed integrations.

## Saves

Schema version 1 stores a seed, completed lesson IDs, up to 1,000 evidence records, per-mode variants/hint and attempt counts, editor drafts, boat position, motion preference and ending state. Imports copy only known fields and enforce size/type bounds. Future versions need explicit migration and tests; never silently drop older progress or claim compatible imports without checking.

localStorage is origin-specific, not account-based or cloud-synchronised. Errors must remain visible. In the corrupt-save path, autosave is blocked until explicit reset/import to preserve the original stored value.

## Security boundaries

Python is user-controlled executable code, not text to eval in the main page. The worker cannot directly manipulate the DOM, but Pyodide is not a hardened malicious-code sandbox. Imports and the JS bridge are not comprehensively isolated. Memory exhaustion and hostile Python remain outside the guarantees. Do not add secrets, privileged APIs or private documents to this runtime. Five-second termination and line budgets primarily prevent accidental hangs.

Web previews allow a bounded set of structural HTML elements and attributes, no scripts or form submission, no remote assets, and a restrictive CSP inside a sandboxed iframe. Closing-style sequences in CSS are escaped before serialisation. `allow-same-origin` enables inspection; `allow-scripts` must NOT be added alongside it. Generated web exports use the bounded preview document.

Never commit source packs or personal records. `.gitignore` includes common course-document/archive formats and `private-materials/`. Do not make those files public merely to simplify development.

## Near-term work

1. Run the live Pyodide acceptance test on an unrestricted computer; then add pinned CI browser testing.
2. Playtest the first chapter with the learner. The present island-to-workbench flow is a first implementation, not proof of sustained fun.
3. Increase set-case diversity and improve independent checks beyond parameter changes.
4. Review remaining teaching materials and authentic assessment patterns privately, before expanding content.
5. Add Digitalni sustavi and Uvod u računarstvo after their sources are available.
6. Improve keyboard editor indentation/outdent, larger-screen typography options and screen-reader descriptions of mathematical diagrams.

Keep the project grounded in two observable outcomes: a game the learner wants to return to, and problems the learner can later solve without the game's help.
