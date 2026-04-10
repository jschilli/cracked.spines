# Workflow: Prepare Poll (Act 1)

<principles>

**Act 1 does not touch `pollCount`.** Poll counts are incremented in Act 2 (record-selection) as the first step so the live site reflects the current count *while the poll is still open*. If you find yourself about to run `increment-poll-counts.ts` here, stop — that belongs in Act 2.

**Act 1 produces three artifacts:**
1. Any new candidate books added (optional)
2. A bulleted candidate list the user can paste into their polling service
3. A poll announcement email referencing the live poll URL

**If no new books were added, nothing is committed.** The candidate list and email are generated from existing data.

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

Present the candidate list to the user as a **bulleted list — no leading numbers**. Numbered lists confuse the polling service's rank-order ballot setup (the user has to re-number them manually). Mark newly-added candidates with *(new)*. Example:

```
- The River of Doubt — Candice Millard
- The Book Thief — Markus Zusak
- Say Nothing — Patrick Radden Keefe *(new)*
```

Wait for the user to create the poll on their polling service and paste the poll URL back.

## Step 4: QA Gate and Commit (only if new books were added)

If no new books were added in Step 2, skip to Step 5 — there's nothing to commit.

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
- Location override (optional, only if the next meeting is not at the default CLJ clubhouse)

Calculate dates:
- Meeting date: 3rd Thursday of the target month (e.g. July 2026 meeting → Thursday July 16, 2026)

The canonical email pattern lives in `sample-emails.md` at the repo root under "## Poll email". Read that file and mimic the voice, structure, and sign-off exactly — Jeff signs with `-Jeff`, the venue line is cadence-sensitive, and the tone is terse. The typical shape is:

```
All,

The poll for <Month Year> selection is here: <poll URL>

We are meeting at <venue> this coming Thursday at 5:30pm.

The current candidates are here: https://crackedspin.es/candidate

-Jeff
```

Present the email for the user to copy.

</process>

<success_criteria>

This workflow is complete when:
- [ ] Target month confirmed with the user
- [ ] All new books (if any) are added with cover images
- [ ] If new books added: diff-report passes QA (no pollCountChanges, all hasAllFields true), verify-site passes, changes committed and pushed
- [ ] Candidate list presented as bullets (no numbers), with *(new)* markers
- [ ] Poll email generated mimicking `sample-emails.md`, with the poll URL and presented to the user

</success_criteria>
