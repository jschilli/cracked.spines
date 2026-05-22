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

## Step 6: Generate Leaderboard + After-Meeting Email (Rich HTML)

**Default output format:** rich HTML, not plain text. Two artifacts written to the repo root:

1. `leaderboard-<YYYY>-<MM>.html` — standalone document version (full warm editorial aesthetic).
2. `email-<YYYY>-<MM>-results.html` — email-safe version (600px, inline styles, table layout) for paste-into-Gmail.

The `<MM>` is the **selection month** (the month the winning book gets read), not the current month. Example: a poll closing in May that picks the August book → `email-2026-08-results.html`.

The canonical templates live in `sample-emails.md` under **"## After meeting (rich HTML)"** and **"## Leaderboard (rich HTML)"**. Mimic them exactly — the design tokens, structure, and section order are deliberate.

### Required sections (email)

In order, top to bottom:
1. **Meta line** — `Cracked Spines · <Month Year> Poll · N ballots` (monospace, uppercase, gray)
2. **Headline** — terse, telegraphic. Pattern: `<Winner> takes <SelectionMonth>.` (serif, 32px)
3. **Deck** — one italic sentence framing what's notable about this round
4. **Intro prose** — 1–2 sentences, names winner with Borda total and margin
5. **Outcome callout** — ivory-2 background, clay left border, one-line summary listing winner / runner-up / relegated
6. **Leaderboard table** — all candidates, ranked, with Borda points. Winner row tinted olive. Tied ranks tinted clay on the rank number. Relegated rows tinted rust. Pills for `New`, `Winner`, `Tied`, `Relegated`
7. **Methodology footnote** — one monospace line: `Borda points = (13 − rank). Total <X> = <voters> × <max>` ✓
8. **Tiebreaker section** (only if there was a tie) — explain the head-to-head, show the secondary breakers in a 3-up grid, the decisive one tinted clay
9. **Next meeting callout** — ivory-2 background, **olive** left border (signals "logistics, good-to-know"). Must include:
   - Date (3rd Thursday of next month), time (5:30pm default), venue (CLJ clubhouse default)
   - **Discussion book**: the currently-Selected book whose `selectedForDate` matches the next meeting date — look it up from books.json. Format: `Discussing: <Title> — <Author>`
   - Candidate list link (`crackedspin.es/candidate`)
   - **Do not** include an RSVP request — that is not part of the cadence
10. **Sign-off** — `-Jeff` on its own line
11. **Footer** — monospace rule + `Cracked Spines · crackedspin.es`

### Aesthetic tokens (use exactly)

| Token | Value | Use |
|-------|-------|-----|
| `--ivory` | `#FAF9F5` | page background |
| `--ivory-2` | `#F4F1E8` | callout/table-header background |
| `--slate` | `#141413` | primary text |
| `--slate-2` | `#3A3A38` | secondary text |
| `--slate-3` | `#6B6B68` | meta / monospace text |
| `--clay` | `#D97757` | links, attention, ties, accent |
| `--oat` | `#E3DACC` | `New` pill background |
| `--olive` | `#788C5D` | winner, "good", next-meeting border |
| `--rust` | `#B04A3F` | relegated, "bad" |

Fonts: `Georgia, "Iowan Old Style", "Palatino Linotype", serif` for body/headlines; `"SF Mono", Menlo, Consolas, monospace` for meta, labels, ranks, Borda scores. No web fonts — they get stripped by email clients.

### Email-safety rules (email file only)

- All styles inline (no `<style>` block — Gmail strips them)
- Layout uses `<table role="presentation">` not flexbox/grid
- Width capped at 600px
- No background images, no SVG
- Test by opening the file in a browser, ⌘A / ⌘C, paste into Gmail compose — formatting should survive

### Leaderboard file (`leaderboard-<YYYY>-<MM>.html`)

Same content, different chrome: full-page layout (max 880px), can use a `<style>` block, breadcrumb at top, footer at bottom, hover states on table rows, print stylesheet. Use this as the "permanent record" version. The email is the disposable communication version.

### Inputs to look up

Before writing the email:
- **Discussion book for next meeting**: query books.json for the Selected book whose `selectedForDate` matches the next 3rd-Thursday date. If none matches, ask the user.
- **Ballot count**: count entries in the survey JSON
- **Tiebreaker outcome** (if applicable): compute Condorcet head-to-head first; fall through to first-place-votes if pairwise is tied (this fallback was formalized after the August 2026 poll, where River of Doubt and Against the Grain tied at both Borda and pairwise).

Present both files to the user. The leaderboard is for archival / linking. The email is for sending.

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
