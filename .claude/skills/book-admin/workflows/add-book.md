# Workflow: Add Book (Act 3)

<process>

## Step 1: Gather Goodreads URLs

The user provides one or more Goodreads URLs, typically from a member's request email. Extract all URLs from their message.

## Step 2: Scrape and Add Each Book

For each Goodreads URL:

1. Run scrape-goodreads:
   ```
   npx tsx scripts/scrape-goodreads.ts "<url>" public/images
   ```

2. Check the result. If `success: false`, report the error and skip this URL.

3. If `success: true`, review warnings (missing ISBN, multiple authors, etc.) and report them to the user.

4. Pipe the `data` field (ScrapeData) to add-book:
   ```
   echo '<ScrapeData JSON>' | npx tsx scripts/add-book.ts --books-json books.json
   ```

5. If add-book reports a duplicate, inform the user and skip.

6. Stage the new cover image:
   ```
   git add public/images/<filename>
   ```

Repeat for all URLs. Report progress after each book.

## Step 3: QA Gate

Run diff-report:
```
npx tsx scripts/diff-report.ts --repo-path .
```

Evaluate against Act 3 checks:
- `totalBooksAfter >= totalBooksBefore` (no books removed)
- Only `booksAdded` entries, no `statusChanges` on existing books
- Every `booksAdded` entry has `hasAllFields: true`
- Every book in `booksAdded` with a non-null `coverImage` has a corresponding file in `newImageFiles`
- All new image files are staged (`newImageFiles` entries appear in `stagedImageFiles`)
- No `pollCountChanges` (we didn't touch poll counts)

Run verify-site:
```
npx tsx scripts/verify-site.ts --repo-path .
```

Confirm: `jsonValid`, 0 `schemaErrors`, 0 `missingImages`, `buildExitCode` 0.

If any check fails, report the issue and do not proceed to commit.

## Step 4: Commit and Push

Stage: `git add books.json`

Commit message: `Adding candidates`

Present the summary to the user:
- List of books added (title, author)
- Any warnings or skipped URLs
- QA and build results

Ask for confirmation before pushing.

After push, check deployment: `gh run list --limit 1`

</process>

<success_criteria>

This workflow is complete when:
- [ ] All valid Goodreads URLs scraped successfully
- [ ] Books added to books.json with cover images downloaded
- [ ] Duplicates detected and reported (not added)
- [ ] Diff-report passes all Act 3 QA checks
- [ ] Verify-site passes all checks
- [ ] Changes committed with `Adding candidates` and pushed

</success_criteria>
