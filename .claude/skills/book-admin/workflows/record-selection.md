# Workflow: Record Selection (Act 2)

<process>

## Step 1: Increment Poll Counts

Run:
```
npx tsx scripts/increment-poll-counts.ts --books-json books.json
```

This runs first so the website reflects the current count while the poll was live. Report the updated counts.

## Step 2: Gather Inputs

Ask the user for:
1. **Ranked poll results** - ordered list of titles, most votes first. This is the primary input.
2. **Discussion commentary** - 1-2 sentences about the discussion of the previous book
3. **Location override** (optional) - only if next meeting is not at CLJ clubhouse

## Step 3: Process Poll Results

Write the ranked titles and books.json path to a temp file, then pipe to the script:

```
echo '{"rankedTitles": [...], "booksJsonPath": "books.json"}' | npx tsx scripts/process-poll-results.ts
```

The input JSON must conform to `PollResultsInput`:
- `rankedTitles`: array of strings, ordered most votes to fewest
- `booksJsonPath`: path to books.json (use `"books.json"`)

Review the output:
- `markedAsRead`: which book was marked as Read (the previously Selected book whose meeting date has passed)
- `selected`: the new selection with its `selectedForDate`
- `survived`: titles that remain as Candidates (ranks 2-10)
- `relegated`: titles relegated (ranks 11+, only if >10 candidates)
- `warnings`: check for date-in-past warnings or >3 Selected warnings

If `selectedForDate` is flagged as ambiguous or in the past, ask the user to confirm or provide the correct date.

Report all changes to the user.

## Step 4: QA Gate

Run diff-report:
```
npx tsx scripts/diff-report.ts --repo-path .
```

Evaluate against Act 2 checks:
- `totalBooksAfter >= totalBooksBefore` (no books removed)
- `pollCountChanges` count matches the number of Candidates, each incremented by exactly 1
- Exactly one `statusChange` of `Candidate -> Selected`
- At most one `statusChange` of `Selected -> Read`
- Any `Candidate -> Relegated` changes correspond to ranks 11+ in the poll results
- Every `selectedForDate` in `selectedForDateChanges` falls on a Thursday
- `updatedAt` timestamps on changed books are current (within the last few minutes)

Run verify-site:
```
npx tsx scripts/verify-site.ts --repo-path .
```

Confirm: `jsonValid`, 0 `schemaErrors`, 0 `missingImages`, `buildExitCode` 0.

If any check fails, report the issue and do not proceed to commit.

## Step 5: Commit and Push

Stage: `git add books.json`

Commit message: `<Month Year> selection, relegates`

Present the summary to the user:
- Book marked as Read
- New selection and its meeting date
- Any relegated books
- Poll count increments
- QA and build results

Ask for confirmation before pushing.

After push, check deployment: `gh run list --limit 1`

## Step 6: Generate After-Meeting Email

Fetch the book blurb: read the winning book's `link` (Goodreads URL) and extract a description, or ask the user to provide one.

Calculate derived dates:
- Next meeting date: 3rd Thursday of next month
- Next poll date: 2nd Friday of next month
- Candidate deadline: 2nd Thursday of next month

Generate the email using the template from `admin-acts.md` (After-meeting email template section). Fill in:
- `previous_book_title`: the book marked as Read
- `discussion_commentary`: from user input
- `month_year`: current month/year for the poll
- `book_blurb`: from Goodreads or user
- Derived dates above
- Location info (default CLJ clubhouse or override)

Present the email for the user to copy.

</process>

<success_criteria>

This workflow is complete when:
- [ ] Poll counts incremented for all candidates
- [ ] Previous book marked as Read
- [ ] New book selected with correct selectedForDate (falls on a Thursday)
- [ ] Ranks 11+ relegated (if applicable)
- [ ] Diff-report passes all Act 2 QA checks
- [ ] Verify-site passes all checks
- [ ] Changes committed with `<Month Year> selection, relegates` and pushed
- [ ] After-meeting email generated for the user

</success_criteria>
