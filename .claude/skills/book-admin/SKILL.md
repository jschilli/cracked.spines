---
name: book-admin
description: Orchestrates Cracked Spines book club administration workflows. Use when the user wants to prepare a poll, record a selection after a meeting, or add new books to the candidate list.
---

<objective>

Guides Claude through the three recurring book club admin workflows: poll preparation, post-meeting selection recording, and adding new candidate books. Each workflow calls scripts in `scripts/` that operate on `books.json` and `public/images/`, then validates changes before committing.

All scripts output structured JSON conforming to `ScriptResult` (see `admin-acts.md` for full spec). Scripts are run via `npx tsx scripts/<name>.ts`.

</objective>

<quick_start>

1. Determine which workflow applies based on user request
2. Gather required inputs (URLs, poll results, etc.)
3. Run scripts in sequence, checking each result before proceeding
4. Evaluate diff-report against QA rubric
5. Run verify-site to confirm build passes
6. Commit and push with the correct commit message convention

</quick_start>

<essential_principles>

### Script Invocation

All scripts live at `scripts/*.ts` and are run with `npx tsx`. Every script returns JSON to stdout:

```
{ "success": boolean, "data": ..., "error": "...", "warnings": [...] }
```

Exit code 0 = success (even with warnings). Exit code 1 = fatal error. Always check `success` before proceeding.

### QA Gate

Every workflow MUST run diff-report and verify-site before committing. Both must pass the QA rubric (defined in each workflow). Never skip QA.

### Data Safety

- Always work on the real `books.json` (the scripts are designed for this)
- Cover images go in `public/images/`
- Stage new image files with `git add` before committing
- Use 2-space indent + trailing newline for books.json (scripts handle this automatically)

### User Confirmation

Always show the user a summary of changes before committing and pushing. Include: what changed, the diff-report evaluation, and the verify-site result.

</essential_principles>

<intake>

**Which workflow do you need?**

1. Prepare poll (Act 1) - create monthly poll, increment counts, optionally add new books
2. Record selection (Act 2) - process poll results after a meeting
3. Add book (Act 3) - add new candidate books from Goodreads URLs

</intake>

<routing>

| Response | Workflow |
|----------|----------|
| 1, "poll", "prepare", "act 1" | `workflows/prepare-poll.md` |
| 2, "selection", "record", "results", "act 2", "meeting" | `workflows/record-selection.md` |
| 3, "add", "book", "candidate", "act 3", "goodreads" | `workflows/add-book.md` |

**After reading the workflow, follow it exactly.**

</routing>

<quick_reference>

### Script Commands

| Script | Invocation |
|--------|-----------|
| Scrape Goodreads | `npx tsx scripts/scrape-goodreads.ts <url> public/images` |
| Add book | `echo '<json>' \| npx tsx scripts/add-book.ts --books-json books.json` |
| List candidates | `npx tsx scripts/list-candidates.ts --books-json books.json` |
| Increment polls | `npx tsx scripts/increment-poll-counts.ts --books-json books.json` |
| Process poll results | `echo '<json>' \| npx tsx scripts/process-poll-results.ts` |
| Diff report | `npx tsx scripts/diff-report.ts --repo-path .` |
| Verify site | `npx tsx scripts/verify-site.ts --repo-path .` |

### Commit Conventions

| Act | Message |
|-----|---------|
| Act 1 (with new candidates) | `<Month> poll + new candidates` |
| Act 1 (poll counts only) | `Polled for <Month> Survey` |
| Act 2 | `<Month Year> selection, relegates` |
| Act 3 | `Adding candidates` |

</quick_reference>

<workflows_index>

| Workflow | Purpose |
|----------|---------|
| prepare-poll.md | Monthly poll preparation (Act 1) |
| record-selection.md | Post-meeting selection recording (Act 2) |
| add-book.md | Adding new candidate books (Act 3) |

</workflows_index>

<success_criteria>

A successful workflow execution:
- All script calls return `success: true`
- Diff-report passes all applicable QA rubric checks
- Verify-site shows: jsonValid, 0 schema errors, 0 missing images, build exit 0
- User has reviewed and approved the changes
- Commit uses the correct convention for the act
- Push triggers GitHub Actions deployment

</success_criteria>
