# Paper Observatory — visitor workshop

## Play this increment

Start the game using the existing launcher. On the map home screen, use **The Paper Observatory · Visitor workshop → Enter the workshop**. It opens `paper-observatory.html`, a route in the same application with the same expedition save. The old three web mini-exercises remain available and retain their progress; they are not the new workshop.

The five directly accessible stages build on **one persistent page**, rather than resetting the editor for each task:

1. **Paper:** browser versus source; opening tags, text, closing tags, elements, h1 and paragraphs. A label press writes real, escaped HTML and immediately shows what it created. Direct editing and undo are available.
2. **Document:** doctype, html, head/title versus body/h1, nesting, attributes and character encoding. A non-destructive helper wraps a fragment; the learner supplies the title.
3. **Paths:** link labels, href, a fragment identifier and a unique destination ID; headings and destination content. Nova and Orin follow the actual rendered links.
4. **Notices:** class attributes, selectors, declaration punctuation, CSS pixels, text size and inner spacing. Mira inspects computed styles, not a prescribed source string or exact colour.
5. **Opening night:** combine the document, both routes and a third notice that reuses the earlier class. Keep and export the result.

Definitions and a separate worked example remain available. Examples never overwrite the learner's draft. No lives, timers, unlock grind or score percentage are imposed. The visitor journey can be stepped, played, paused or shown in full. Editing invalidates an unfinished journey instead of awarding success for an old page.

## What the visitors actually do

These are transparent deterministic rules, not human readers or an AI usability review. Pip looks for the requested document structure, a tab title where required, one visible h1 and visible paragraph content. Nova chooses the first visible link whose label contains `chart`, follows its actual `href`, and looks for `north` at the resolved destination. Orin similarly uses `hours` and `dusk`. Their destinations must differ. A destination may be a section or a heading followed by its content. Broken links, duplicate IDs, case mismatches and wrong destinations produce different journey reports. Correct encoded fragment references are resolved.

Mira asks for at least 18px computed text size and 12px computed padding on all four sides of each `.notice`. These are fictional job requirements, **not a complete accessibility standard**. Alternative CSS values and units can meet them; later overriding rules affect the outcome. Common hidden-ancestor cases are checked, but this is not a comprehensive visibility, contrast, HTML-conformance or accessibility audit.

This is an initial playable learning sequence, not a complete web-development course. Images, forms, external assets, multipage sites, comprehensive layout/design work and broader projects remain outside this increment. Its enjoyment and teaching pace still need a novice playtest.

## Practice and evidence

The separate practice desk has original build, repair and garden-guide briefs. It has its own saved draft; switching back preserves the observatory. Replacing a practice draft requires confirmation. Opening teaching, a worked demonstration or the guided workshop while a check is active marks it supported. A failed submission makes later success on that attempt corrected practice. Reopening an already seen task is explicitly repeated practice, not a fresh independent check. Submitting records the attempt immediately, even if the learner leaves before reading the report.

Guided workshop milestones never become independent evidence. The original web mini-exercise evidence is not relabelled. The static practice tasks are not a secret assessment bank and cannot detect outside assistance. No retention or whole-course readiness claim is made.

## Persistence and safety

`core.js` validates an optional, versioned `observatory` field inside the existing version-1 save. Missing workshop data receives an empty workshop; existing lesson achievements, drafts, evidence and settings remain unchanged. Unknown future workshop versions block loading rather than being silently stripped. A per-loaded-state storage baseline prevents an old map tab or Back/Forward-restored page from overwriting a newer save. Conflicts require export/reload, not automatic merging. Intentional imports and resets remain explicit replacements. Both routes reload when restored from the Back/Forward cache.

Keep the same local origin/port when updating. Use the updated application to load new saves: older application code does not know the new optional field and may discard it. Export the game save before changing versions. Import remains in the map's existing Save & settings dialog.

The preview reuses the restricted HTML/CSS sanitizer, a script-disabled iframe and a restrictive content security policy. Fragment links are intercepted inside the preview to avoid navigation into the parent application. Scripts, forms, inline styles, images and remote resources are not supported. Put CSS in the CSS editor. A standalone page export includes the sanitized document and CSS; whole-save export includes both the workshop and existing expedition. Neither includes private materials or account integrations.

## Files

- `src/observatory-state.js`: pure progress validation and practice evidence.
- `src/observatory-content.js`: original novice teaching and visitor/practice briefs.
- `src/observatory-engine.js`: DOM, destination and computed-style inspection.
- `src/observatory.js`: workshop UI and stepwise journeys.
- `src/observatory-page.js`: shared-save bootstrap and conflict warnings.
- `paper-observatory.html`, `observatory.css`: route and scoped presentation.
- `index.html`: direct entry; original activities are not replaced.
- `src/core.js`: optional save-field validation and stale-write protection.

## Validation performed for this increment

**Passed: 24 Node tests** — 12 unchanged core regression tests and 12 new Observatory tests. **Passed: 12 Chromium UI acceptance groups** — beginner construction, separate demonstration, title/body distinction, route errors and alternate valid routes, computed CSS, all five stages, stale-report cancellation, keyboard Tab exit, sanitized iframe, export Blob contents, separate practice/evidence, saved-data rehydration, corrupt/blocked storage and a 390px layout. Desktop and narrow-layout screenshots were inspected.

The browser environment blocked ordinary URLs, including localhost. The successful browser run therefore used `--offline-harness`: dependency-ordered scripts injected into Chromium, substitute storage, real DOM/layout/iframes, and captured export Blobs. **This does not verify native ES-module loading over HTTP, native localStorage across real navigation/reload, Back/Forward-cache lifecycle, or the browser's download UI.** The native HTTP test entry point is included, but did not run successfully in that environment. The full original browser/Python/teaching suite was not rerun; no unrelated runtime completion is claimed.

Commands:

```sh
node --test tests/core.test.mjs tests/observatory.test.mjs
# Requires Python Playwright and its Chromium browser:
python tests/observatory_browser_test.py
# Explicit alternate Chromium executable:
python tests/observatory_browser_test.py --browser /path/to/chromium
# Restricted-environment fallback, NOT native integration verification:
python tests/observatory_browser_test.py --offline-harness --browser /path/to/chromium
```

## Next validation, before treating the chapter as finished

Run the native HTTP suite and manually test map → workshop → map, real reload, two tabs with conflicting edits, import/export and downloads on the normal launcher origin. Then have a beginner play from Paper without prior HTML knowledge: record the first unexplained concept, first confusing control and first point where the interaction feels like a form rather than a useful thing being built. Repair those before multiplying the format across more material. Expand the actual web curriculum after that feedback; do not equate five introductory stages with the complete subject.
