# Workflow: Prepare Poll (Act 1)

<process>

## Step 1: Check for New Book Requests

Ask the user if there are any new Goodreads URLs to add as candidates before the poll.

If yes, for each URL:

1. Run scrape-goodreads:
   ```
   npx tsx scripts/scrape-goodreads.ts "<url>" public/images
   ```
2. Check the result. If `success: true`, pipe the `data` field to add-book:
   ```
   echo '<ScrapeData JSON>' | npx tsx scripts/add-book.ts --books-json books.json
   ```
3. Stage the new cover image: `git add public/images/<isbn>.jpg`
4. Report any warnings to the user (missing ISBN, multiple authors, etc.)

If scrape fails, report the error and ask the user how to proceed.

## Step 2: List Candidates

Run:
```
npx tsx scripts/list-candidates.ts --books-json books.json
```

Present the candidate list to the user. They need this to create the poll on their polling service. Wait for them to provide the poll URL.

## Step 3: QA Gate and Commit (only if new books were added)

If new books were added in Step 1:

Run diff-report:
```
npx tsx scripts/diff-report.ts --repo-path .
```

Evaluate the report against these checks:
- `totalBooksAfter >= totalBooksBefore` (no books removed)
- Every `booksAdded` entry has `hasAllFields: true`
- No `pollCountChanges` (counts are incremented in Act 2)
- If `booksAdded` is non-empty, `newImageFiles` is also non-empty
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

If no new books were added, there is nothing to commit.

## Step 4: Generate Poll Email

The user should have already provided the poll URL (from Step 2). Ask for:
- Location override (optional, only needed for non-default venue)

Calculate dates:
- Meeting date: 3rd Thursday of current month

Generate the email using the template from `admin-acts.md` (Poll email template section). Present it for the user to copy.

</process>

<success_criteria>

This workflow is complete when:
- [ ] All new books (if any) are added with cover images
- [ ] If new books added: diff-report passes QA, verify-site passes, changes committed and pushed
- [ ] Poll email is generated with the poll URL and presented to the user

</success_criteria>
