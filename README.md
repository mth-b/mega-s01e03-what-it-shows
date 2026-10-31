# kb — the support knowledge base

**kb** = knowledge base. What the support desk knows about how our products break, written
down where the code can keep it honest.

One desk takes reports for every product we run: `sched-prod` (calendar invites for about
300k people) and the rest. When something
goes wrong, the reports reach the desk first. This kb is how the desk triages them, what each
incident turned out to be, and why we decided what we decided.

## What's here

```
src/routes/kb/      the pages (.svx: Markdown with components)
  triage/           how the desk handles incoming reports
  incidents/        one page per big ticket
  decisions/        numbered decision records
src/lib/kb/         components and the logic they run
src/lib/layouts/    the frame every page shares
src/lib/data/       exports from the ticket system
```

## Conventions

- Words in the page, logic in `src/lib` (imported as `#lib/…`). A number that can be computed belongs in a component.
- Every page starts with frontmatter: `title`, `owner`, `status`, `reviewed`.
- A decision is never edited after it is accepted. A new record replaces it.
- A page you add is signed: its frontmatter carries your `signature` and it ends with `<RenderStamp {signature} />`, so the desk knows who wrote it.

## Owners

Support desk. Decision records: whoever signed them.

## S01E03 Review

The added page is `src/routes/kb/incidents/4471-review/+page.svx`.
It separates the exported parser and form-hint classifications, preserves
unresolved symptoms, and links the public tracking issues:

- [Parser: 379 classified reports](https://github.com/mth-b/mega-s01e03-what-it-shows/issues/1).
- [Form hint: 33 classified reports](https://github.com/mth-b/mega-s01e03-what-it-shows/issues/2).

`4471-review.html` is the static server-rendered review, generated from the
actual KB components. It includes their computed tables, timeline, and desk
reference. Explorer inputs are shown but do not hydrate in this static copy.

The original export supplied no application build configuration. To regenerate
the review, install `svelte@5`, `mdsvex@0.12`, and `typescript@5`, then run
`node render-review.mjs`. Dependencies and intermediate output are git-ignored.
The review incorporates the course engineering update: parser fixed, hint
not fixed because booking-v3 was retired. It is not an independent production test.

---

Exported 2026-10-04 from the `support` repo, `apps/kb/` → `src/`.
