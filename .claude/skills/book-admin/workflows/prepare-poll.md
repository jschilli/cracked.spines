# Workflow: Prepare Poll (Act 1)

<principles>

**Act 1 does not touch `pollCount`.** Poll counts are incremented in Act 2 (record-selection) as the first step so the live site reflects the current count *while the poll is still open*. If you find yourself about to run `increment-poll-counts.ts` here, stop — that belongs in Act 2.

**Act 1 produces three artifacts:**
1. Any new candidate books added (optional)
2. A plain candidate list (one per line) the user can paste into their polling service
3. A generated HTML poll announcement email (`email-<YYYY>-<MM>-poll.html`)

**If no new books were added, `books.json` is untouched** — the candidate list and email are derived from existing data. The generated email file is still committed (Step 5).

</principles>

<process>

## Step 1: Confirm the target month

Before anything else, confirm which month's poll this is (e.g. "July 2026 poll" = the poll whose winner will be discussed at the July meeting). Don't guess from the system date — the git history and the user's mental model of the club's cadence matter more. A quick `git log --oneline -5` will show the most recent `<Month Year> selection` commit; the next poll is the month after that.

State your assumption and let the user correct you: "I'm assuming this is the July 2026 poll — meeting Thursday July 16, 2026. Correct?"

## Step 2: Check for New Book Requests

Ask the user if there are any new Goodreads URLs to add as candidates before the poll. Members typically email these in with a short note; paste-in is the common input shape.

For each URL:

1. Run scrape-goodreads:
   ```
   npx tsx scripts/scrape-goodreads.ts "<url>" public/images
   ```
2. Check the result. Goodreads occasionally returns 503 — retry once or twice after a brief pause before reporting failure. If `success: true`, pipe the `data` field to add-book:
   ```
   echo '<ScrapeData JSON>' | npx tsx scripts/add-book.ts --books-json books.json
   ```
3. Stage the new cover image: `git add public/images/<isbn>.jpg`
4. Report any warnings to the user (missing ISBN, multiple authors, etc.)

**Missing ISBN edge case:** If Goodreads returns `isbn: null`, the book will still add but `diff-report`'s `hasAllFields` check will flag it. Before giving up, try a different edition URL for the same book — Goodreads hosts multiple editions per title and many have ISBNs where the default doesn't. Search `goodreads.com/book/show/<id>-<slug>` with a different ID if the user provides one, or ask the user to confirm a known-good ISBN and patch the entry manually (update `isbn`, `coverImage`, `goodreadsId`, `link`, then delete the old cover file).

If scrape fails after retry, report the error and ask the user how to proceed.

## Step 3: List Candidates

Run:
```
npx tsx scripts/list-candidates.ts --books-json books.json
```

Present the candidate list to the user as **plain lines — no leading numbers, no `-` bullets, no markers**. Whatever prefixes a line gets pasted into the polling service's ballot and has to be stripped by hand. Name newly-added candidates in a separate sentence after the list, not inline. Example:

```
The River of Doubt — Candice Millard
The Book Thief — Markus Zusak
Say Nothing — Patrick Radden Keefe
```

Wait for the user to create the poll on their polling service and paste the poll URL back.

## Step 4: QA Gate and Commit (only if new books were added)

If no new books were added in Step 2, skip to Step 5 — `books.json` is untouched, so there is nothing for diff-report to check. The generated email still gets committed there.

If new books were added:

Run diff-report:
```
npx tsx scripts/diff-report.ts --repo-path .
```

Evaluate the report against these checks:
- `totalBooksAfter >= totalBooksBefore` (no books removed)
- Every `booksAdded` entry has `hasAllFields: true` (if false, see the missing-ISBN edge case in Step 2)
- **No `pollCountChanges`** — counts are incremented in Act 2, not here
- If `booksAdded` is non-empty, `newImageFiles` is also non-empty and every new image is staged
- No unexpected `statusChanges`

Run verify-site:
```
npx tsx scripts/verify-site.ts --repo-path .
```

Confirm: `jsonValid`, 0 `schemaErrors`, 0 `missingImages`, `buildExitCode` 0.

If any check fails, report the issue and do not proceed to commit.

Stage and commit:
- `git add books.json public/images/`
- Commit message: `<Month> poll + new candidates`

Show the user the summary of changes and ask for confirmation before pushing.

After push, check deployment: `gh run list --limit 1`

## Step 5: Generate the Poll Email

The user should have already provided the poll URL (from Step 3). Ask for:
- Location override (only if the next meeting is not at the default CLJ clubhouse)
- Whether a one-line note is needed (an RSVP request is customary when the venue is someone's house, never for the clubhouse)

The email is a **generated HTML artifact — do not hand-write it and do not copy last month's file**:

```
npx tsx scripts/generate-poll-email.ts \
  --poll-url "<poll URL>" \
  --month <YYYY-MM> \
  --books-json books.json \
  --out-dir .
```

`--month` is the **selection month** confirmed in Step 1, as `YYYY-MM`. Add `--venue "<venue>"` and `--note "<sentence>"` if the answers above call for them; `--time` defaults to `5:30pm`.

This writes `email-<YYYY>-<MM>-poll.html`. Everything in it is derived from `books.json` — the candidate table, the New pills, and the on-deck schedule (next three `Selected` meetings with dates). Design changes belong in `templates/email-poll.html`, never in the generated output.

Check the result:
- `success: true` and no unfilled `{{TOKEN}}` in the output file
- Read any `warnings`. A stale-selection warning means a past meeting is still `Selected` — run Act 2 for it before sending, or the on-deck section advertises a meeting that already happened.
- The deck line names the correct next meeting date

Commit the generated file alongside any new candidates — the results emails are tracked the same way, and the archive is how past cycles get re-read:

- `git add email-<YYYY>-<MM>-poll.html`
- Commit message: `<Month> poll + new candidates` if Step 2 added books, otherwise `<Month Year> poll email`

To send: open it in a browser, ⌘A / ⌘C, paste into Gmail compose.

See `sample-emails.md` under "## Poll email" for the full structure and the legacy plain-text shape.

</process>

<success_criteria>

This workflow is complete when:
- [ ] Target month confirmed with the user
- [ ] All new books (if any) are added with cover images
- [ ] If new books added: diff-report passes QA (no pollCountChanges, all hasAllFields true), verify-site passes, changes committed and pushed
- [ ] Candidate list presented as plain lines (no numbers, bullets, or markers); new candidates named separately
- [ ] Poll email generated via `scripts/generate-poll-email.ts` (never hand-written), warnings reviewed, file handed to the user

</success_criteria>
