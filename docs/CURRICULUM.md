# Source-to-skill map — v0.1

Reviewed 28 September 2026. “Reviewed” below means the named sections were actually inspected, including rendered diagrams where relevant. It does not mean every textbook, ZIP archive or past assessment was reviewed.

Only original teaching explanations and exercises are distributed. The private source packs and their access URLs are deliberately excluded.

## Source register

**LA-01:** `Skupovi. Skupovi brojeva __ J.Krcum.pdf` (25 PDF pages), supplied in the Linearna algebra course folder. Selected review: pp. 1–7, with visual inspection of the set-operation diagrams on p. 3. Membership/subsets appear on p. 1; union, intersection, difference and complement on pp. 3–4; worked practice on p. 5. The remainder is not represented as implemented.

**UP-01:** Toma Rončević, *Uvod u programiranje*, 6 January 2016, supplied as `skripta.pdf` (138 PDF pages). Selected review: §2.3; §3.1–3.2; §3.4, including arithmetic, assignment, decisions and while-loop explanations. Printed page numbers differ from PDF indices by one. This is a **Python 2-era source**, explicitly acknowledged on printed p. 45. The game uses Python 3, not a verbatim executable transcription.

**WEB-01:** *HTML & CSS — Osnove izrade web stranica*, 13 October 2021, supplied as `Predavanje 13.10. (ppt).pdf` (25 PDF pages). Reviewed the document-structure, headings, links/anchors and CSS portions. The date identifies the source, not a claim that these are the current semester's scheduled lecture dates.

**Implementation cross-checks, not substitutes for the course packs:**

- Python 3 arithmetic and assignment: https://docs.python.org/3/tutorial/introduction.html
- Python 3 control flow: https://docs.python.org/3/tutorial/controlflow.html
- Pinned Pyodide worker API: https://pyodide.org/en/0.27.7/usage/webworker.html
- HTML iframe sandbox model: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe

## Traceable activities

| Stable activity ID | Source location | Learning target | Game action | Fresh check / checker |
|---|---|---|---|---|
| `set-union` | LA-01 p. 3; practice p. 5 | Include elements in either or both sets; no duplicate elements | Invite fireflies from two flowers | New sets, typed numerical answer; exact set equality |
| `set-intersection` | LA-01 p. 3; practice p. 5 | Require membership in both sets | Select shared fireflies | New sets; exact intersection |
| `set-difference` | LA-01 p. 3; practice p. 5 | Distinguish A minus B from B minus A | Exclude B's guests from A | New sets; directed difference |
| `set-complement` | LA-01 pp. 3–4; practice p. 5 | Take complement relative to the specified U | Select outsiders, including B-only members | Explicit U; typed complement |
| `py-energy` | UP-01 §2.3, printed pp. 29–32; §3.1–3.2, pp. 45–51 | Assign an arithmetic result based on inputs | Compute the moth's remaining energy | Multiple inputs including zero/one; fresh check changes unit rate |
| `py-decision` | UP-01 §3.4, printed pp. 56–61 | Boolean conjunction, decisions, strict inequality | Decide whether Pip flies | True/False output, equality boundary and uncharged case |
| `py-loop` | UP-01 §3.4, printed pp. 61–65 | Repetition, accumulator, counter update, termination | Budget a sequence of lanterns | New stops; zero/one cases; loop AST requirement plus output tests |
| `web-structure` | WEB-01 pp. 1–8 | Separate title from visible h1 and paragraph | Name the observatory's webpage | New title; actual DOM and visible elements |
| `web-links` | WEB-01 pp. 17–18 | Connect fragment href to a unique id | Give stars directions | New target ID; DOM link/target checks |
| `web-css` | WEB-01 pp. 19–24 | Reusable class selector, colour, padding | Light two paper beacons | New class/colour/spacing; computed styles on both elements |

Prerequisites are presented in the activity order: membership before set operations; expressions before decisions and loops; HTML structure before anchors and CSS. This is a compact prototype sequence, **not a claimed reproduction of the lecturer's weekly plan**.

## Intentional source adaptations

Python 2 source examples are not copied as modern Python. `print(...)` is used on export; Python 3 `/` and `//` differ; Python 2 `input` evaluation and `raw_input` are not taught. The current tasks use supplied variables, not input prompts, and explain that boundary. Python built-ins and numerical semantics are executed by a real interpreter rather than a homemade parser.

Anchor destinations use `id`, not obsolete/self-closing anchor examples. We teach quoted attributes and do not reproduce broad source claims such as “inline style always has highest priority”; the CSS cascade is more nuanced. The initial CSS task checks specific rendered properties rather than claiming comprehensive cascade instruction.

A loop syntax check plus successful examples does not prove a learner understands loops. Dead-code workarounds are possible in this single-player game. No anti-cheating or high-stakes grading claim is made.

## Explicit coverage gaps

**Linearna algebra:** the current release does not teach the full number-system sequence, complex numbers, determinants, matrices, linear systems, vectors, lines/planes, transformations, or MATLAB. The available teaching and assessment files for those still need review before their modules are built.

**Uvod u programiranje:** functions, strings, lists, tuples, dictionaries, broader debugging, programming design, and authentic past-assessment coverage are not complete. The supplied exam/kolokvij archive and detailed teaching plan are not represented as fully reviewed in this release.

**Osnove izrade web stranica:** later lectures, images/tables/forms, broader layout/responsiveness, web-design theory, search optimisation, and course project requirements are not complete. Only the named lecture's selected topics support this chapter.

**Digitalni sustavi:** no learning content until the available Moodle teaching pack is acquired and reviewed. The map location is visibly pending, not a generic logic-gate substitute.

**Uvod u računarstvo:** no learning content until the actual materials or sufficiently verified alternatives are reviewed. The official outline alone is not being passed off as the teaching pack.

## Evidence limitations and next assessment work

All set variations presently keep two elements in each Venn region, although the core checker handles empty sets correctly. Varied cardinalities, empty intersections, subset cases and symbolic expressions should be added before broader transfer is claimed. Fresh checks mostly change parameters; they are not yet a validated transfer assessment. Follow-up review is manual, not a complete spaced-practice scheduler. Later-check evidence uses a minimum 24-hour gap between successful fresh checks.

Next content work should inventory the remaining packs and archive contents privately, build a larger prerequisite graph, validate original questions against source-level difficulty, and obtain feedback on both enjoyment and transfer before expanding the semester.
