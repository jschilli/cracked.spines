# Cracked Spines Administration Acts

Three recurring workflows for maintaining the Cracked Spines book club website and database. Each workflow is composed of independent, scriptable operations orchestrated by agent skills.

**Repository:** `cracked.spines` — Nuxt 3 static site published to crackedspin.es via GitHub Pages
**Data store:** `books.json` — flat JSON array of book objects at the repo root
**Cover images:** `public/images/<ISBN>.jpg`
**Deployment:** Push to `main` triggers GitHub Actions → Nuxt static build → GitHub Pages

---

## Book Schema

```typescript
interface Book {
  id: string;                // Timestamp-based (e.g., "1755298564567")
  title: string;
  author: string;
  isbn: string;
  status: 'Read' | 'Candidate' | 'Relegated' | 'Selected';
  selectedForDate: string | null;  // ISO date (YYYY-MM-DD) or null
  createdAt: string;               // ISO datetime
  updatedAt: string;               // ISO datetime
  coverImage: string | null;       // Relative path: "images/<ISBN>.jpg"
  pages: number | null;
  goodreadsId: string | null;
  link: string;                    // Goodreads URL
  pollCount: number;               // Times this book has appeared in a poll
}
```

---

## Script Conventions

**These scripts are not for human use.** They are called by agent skills. Agent skills are responsible for gathering inputs, constructing correct arguments, and interpreting outputs.

**Runtime:** TypeScript via `tsx`. Bun is an acceptable alternative.

**Interface pattern:** Each script defines its input shape as a Zod schema internally. Scripts accept JSON input (via stdin, file path argument, or CLI arguments depending on the operation). All scripts write structured JSON to stdout on success. Agent skills construct the correct JSON inputs from conversation context, `books.json` reads, and user-provided information.

**Location:** `scripts/` directory at the repo root.

**Output convention:** All scripts return JSON to stdout:
```typescript
interface ScriptResult {
  success: boolean;
  data?: any;          // operation-specific payload
  error?: string;      // human-readable error when success is false
  warnings?: string[]; // non-fatal issues
}
```

**Exit codes:** `0` on success (even with warnings), `1` on fatal error.

---

## Atomic Operations

### op: scrape-goodreads

**Standalone script.** Knows nothing about `books.json` or the rest of the system. Takes a Goodreads URL, extracts book metadata, downloads the cover image, and returns structured JSON.

**Input:** CLI arguments: `<goodreads-url> <image-output-directory>`

**Process:**
1. Fetch the Goodreads page HTML
2. Parse the `<script type="application/ld+json">` block for structured book data
3. Extract: `title`, `author` (first author if array), `isbn`, `numberOfPages`
4. Decode HTML entities in title (`&apos;` → `'`, `&amp;` → `&`, etc.)
5. Extract `goodreadsId` from the URL pattern `/show/(\d+)`
6. Extract cover image URL from `<meta property="og:image" content="..."/>`
7. Download the cover image to `<image_output_dir>/<ISBN>.jpg`

**Output:** `ScriptResult` with `data` conforming to `ScrapeData`:

```typescript
interface ScrapeData {
  title: string;
  author: string;
  isbn: string | null;           // null if edition lacks ISBN
  pages: number | null;          // null if not listed
  goodreadsId: string | null;
  link: string;                  // the original input URL
  coverImagePath: string | null; // local path to downloaded image, null if download failed
}
```

**Example output:**
```json
{
  "success": true,
  "data": {
    "title": "The Rise and Fall of the Dinosaurs",
    "author": "Steve Brusatte",
    "isbn": "9780062490421",
    "pages": 404,
    "goodreadsId": "35820369",
    "link": "https://www.goodreads.com/book/show/35820369-the-rise-and-fall-of-the-dinosaurs",
    "coverImagePath": "public/images/9780062490421.jpg"
  }
}
```

**Failure modes and expected warnings:**
- Goodreads blocks the request → fatal error
- JSON-LD missing from page → fatal error
- ISBN absent → warning, `isbn` is `null`, image filename falls back to `<goodreadsId>.jpg`
- Cover image download fails → warning, `coverImagePath` is `null`
- HTML entities in title → decoded automatically, no warning
- Multiple authors → first author used, warning listing the others

### op: add-book

**Input:** JSON via stdin conforming to `ScrapeData` (the `data` field from `scrape-goodreads` output, or equivalent manually constructed JSON). Also requires `--books-json <path>` argument.

**Process:**
1. Validate the input against the `ScrapeData` Zod schema; abort if invalid
2. Read `books.json`
3. Check for duplicates (match on `isbn` or `goodreadsId` or exact `title`) — abort with error if found
4. Construct a new Book entry:
   - `id`: `Date.now().toString()`
   - `title`, `author`, `isbn`, `pages`, `goodreadsId`, `link`: from input
   - `status`: `"Candidate"`
   - `selectedForDate`: `null`
   - `pollCount`: `0`
   - `createdAt` / `updatedAt`: current ISO timestamp
   - `coverImage`: relative path derived from `coverImagePath` (e.g., `"images/9780062490421.jpg"`)
5. Append to the books array
6. Write `books.json` (2-space indent, trailing newline)

**Output:** `ScriptResult` with `data` containing the newly created `Book` object.

### op: process-poll-results

**Input:** JSON via stdin conforming to:

```typescript
interface PollResultsInput {
  rankedTitles: string[];  // ordered most votes → fewest, complete poll results
  booksJsonPath: string;
}
```

**Process:**
1. Read `books.json`
2. Match each title in `rankedTitles` to a Candidate book (case-insensitive title match). Warn on any titles that don't match a current Candidate (typo, already selected, etc.)
3. **Mark previous book as Read.** Find the `Selected` book with the earliest `selectedForDate` in the past. Set its `status` to `"Read"`, update `updatedAt`.
4. **Apply the top-10 rule:**
   - **Rank 1 — Selected.** Set `status` to `"Selected"`. Calculate `selectedForDate`:
     - Find the latest `selectedForDate` among all currently Selected books
     - Compute the 3rd Thursday of the *following* month
     - **3rd Thursday algorithm:** find the first Thursday of the month, add 14 days
     - If no Selected books exist, use the 3rd Thursday 3 months from today
     - If the calculated date is ambiguous or in the past, the script should include a warning and the agent skill should query the user
   - **Ranks 2–10 — Survive.** No status change. These remain as `Candidate`.
   - **Ranks 11+ — Relegated.** Set `status` to `"Relegated"`, update `updatedAt`.
   - **10 or fewer candidates total — no relegation.** If the ranked list has 10 or fewer entries, all non-winners survive. Nobody is relegated.
5. Warn if the result would leave more than 3 books in `Selected` status
6. Update `updatedAt` on all changed books
7. Write `books.json` (2-space indent, trailing newline)

**Output:** `ScriptResult` with `data` conforming to:

```typescript
interface PollResultsOutput {
  markedAsRead: { title: string } | null;
  selected: { title: string; selectedForDate: string };
  survived: string[];    // titles, ranks 2–10
  relegated: string[];   // titles, ranks 11+
}
```

### op: increment-poll-counts

**Input:** CLI argument: `--books-json <path>`

**Process:**
1. Read `books.json`
2. For every book where `status === "Candidate"`: increment `pollCount` by 1, update `updatedAt`
3. Write `books.json` (2-space indent, trailing newline)

**Output:** `ScriptResult` with `data` containing an array of `{ title: string; pollCount: number }` for each affected book.

### op: list-candidates

**Input:** CLI argument: `--books-json <path>`

**Process:**
1. Read `books.json`
2. Filter to `status === "Candidate"`
3. Format as `Title, Author` — one per line

**Output:** `ScriptResult` with `data` containing `{ candidates: string[] }` where each string is `"Title, Author"`.

---

## QA Operations

### op: diff-report

**Purpose:** Automated pre-commit QA. Produces a structured report from `git diff` output that an agent skill evaluates against a rubric.

**Input:** CLI argument: `--repo-path <path>`

**Process:**
1. Run `git diff books.json` to capture all pending changes
2. Run `git status --porcelain public/images/` to identify new/modified image files
3. Parse the diff and produce a structured report

**Output:** `ScriptResult` with `data` conforming to:

```typescript
interface DiffReport {
  booksAdded: { title: string; status: string; hasAllFields: boolean }[];
  statusChanges: { title: string; from: string; to: string }[];
  pollCountChanges: { title: string; from: number; to: number }[];
  selectedForDateChanges: { title: string; date: string | null }[];
  otherFieldChanges: { title: string; field: string; from: any; to: any }[];
  totalBooksBefore: number;
  totalBooksAfter: number;
  newImageFiles: string[];
  stagedImageFiles: string[];  // images in git staging area
}
```

### Agent QA rubric

The agent skill evaluates the `DiffReport` against this checklist. Every item must pass before committing.

**Data integrity:**
- [ ] `totalBooksAfter >= totalBooksBefore` — no books were accidentally removed
- [ ] Every entry in `booksAdded` has `hasAllFields: true`
- [ ] Every `selectedForDate` in `selectedForDateChanges` falls on a Thursday
- [ ] Every `pollCountChange` incremented by exactly 1 (not +2, not reset to 0)
- [ ] `updatedAt` timestamps on changed books are current (within the last few minutes)

**Image files:**
- [ ] Every book in `booksAdded` with a non-null `coverImage` has a corresponding file in `newImageFiles`
- [ ] All new image files are staged (`newImageFiles` entries appear in `stagedImageFiles`)

**Act-specific checks:**
- *Act 1 (Poll Prep):* No `pollCountChanges` (counts are incremented in Act 2). If `booksAdded` is non-empty, `newImageFiles` is non-empty. If no new books, there should be no changes to commit.
- *Act 2 (Post-Meeting):* `pollCountChanges` count matches the number of Candidates (incremented by exactly 1). Exactly one `statusChange` of `Candidate → Selected`. At most one `statusChange` of `Selected → Read`. Any `Candidate → Relegated` changes correspond to ranks 11+ in the poll results.
- *Act 3 (Add Books):* Only `booksAdded` entries, no `statusChanges` on existing books.

### op: verify-site

**Input:** CLI argument: `--repo-path <path>`

**Process:**
1. Validate `books.json` is well-formed JSON and every entry conforms to the Book Zod schema
2. Check that every book with a non-null `coverImage` has a corresponding file in `public/images/`
3. Run `npx nuxt build --preset github_pages` and confirm it exits 0
4. Report any build errors or warnings

**Output:** `ScriptResult` with `data` conforming to:

```typescript
interface VerifySiteResult {
  jsonValid: boolean;
  schemaErrors: string[];         // per-book validation failures
  missingImages: string[];        // coverImage paths with no file
  buildExitCode: number;
  buildErrors: string[];          // stderr lines from build
}
```

The agent skill evaluates: `jsonValid && schemaErrors.length === 0 && missingImages.length === 0 && buildExitCode === 0`.

### Post-deploy verification

After push, the agent skill should check:
- [ ] GitHub Actions workflow completes successfully (`gh run list --limit 1`)
- [ ] https://crackedspin.es/candidate reflects the updated candidate list
- [ ] https://crackedspin.es/selected reflects any new selections
- [ ] Cover images load for newly added books

---

## Act 1: Poll Preparation

**When:** The 2nd Friday of each month (derived date).

**Purpose:** Create the monthly poll for the group to vote on the next book, and send the poll email.

### Workflow

```
[scrape-goodreads → add-book]  (0 or more, if pending requests exist)
       ↓
list-candidates  →  [create poll on external service — manual/TBD]
       ↓
diff-report  →  agent evaluates against QA rubric  (only if new books added)
       ↓
verify-site                                        (only if new books added)
       ↓
git commit & push  →  auto-deploy via GitHub Actions (only if new books added)
       ↓
generate email (poll template, using poll URL)  →  [send email — manual/TBD]
```

Note: `increment-poll-counts` is NOT part of this workflow. Poll counts are incremented at the start of Act 2 (Record Selection), so the website reflects the current count while the poll is live.

### Inputs the agent needs

| Input | Source |
|-------|--------|
| New book Goodreads URLs (if any) | Provided by user or from pending requests |
| Poll URL | From the polling service after poll is created |
| Location override (if any) | Provided by user; only needed when not meeting at CLJ clubhouse |

### Poll email template

Parameters: `month_year`, `poll_url`, `meeting_date` (derived: 3rd Thursday of current month), `location_override` (optional)

Default (CLJ clubhouse):

> All,
>
> The poll for **{month_year}** selection is here: {poll_url}
>
> We are meeting at the Camp Lake James clubhouse this coming Thursday ({meeting_date}) at 5:30pm
>
> The current candidates are here: https://crackedspin.es/candidate
>
> -jeff
>
> Pithy AI/Adjacent quote about the pleasures of information sharing and collaboration.

With location override (e.g., winter months at a member's house):

> All,
>
> The poll for **{month_year}** selection is here: {poll_url}
>
> We are meeting at **{host_name}'s house** (details forthcoming) this coming Thursday ({meeting_date}) at 5:30pm
>
> The current candidates are here: https://crackedspin.es/candidate
>
> Please let {host_name} know if you're coming or not (space planning) as you are able.
>
> -jeff
>
> Pithy AI/Adjacent quote about the pleasures of information sharing and collaboration.

### Commit convention

- With new candidates: `<Month> poll + new candidates`
- Poll counts only: `Polled for <Month> Survey`

---

## Act 2: Post-Meeting Update

**When:** Shortly after the monthly book club meeting.

**Purpose:** Record the selected book, retire the one just discussed, relegate books that fell out of the top 10, and notify the group.

### Workflow

```
increment-poll-counts
       ↓
process-poll-results (ranked list from poll)
  → marks previous book as Read
  → selects rank 1
  → keeps ranks 2–10 as Candidates
  → relegates ranks 11+ (if more than 10 candidates)
       ↓
diff-report  →  agent evaluates against QA rubric
       ↓
verify-site
       ↓
git commit & push  →  auto-deploy via GitHub Actions
       ↓
generate email (after-meeting template)  →  [send email — manual/TBD]
```

Note: `increment-poll-counts` runs here (not in Act 1) so the website reflects the current count while the poll is live.

### Inputs the agent needs

| Input | Source |
|-------|--------|
| Ranked poll results | Provided by user — ordered list of titles, most votes first. This single input determines selection, survival, and relegation. |
| Discussion color commentary | Provided by user (1-2 sentences about the discussion) |
| Book blurb for email | Auto-fetched from the winning book's Goodreads `link`, or provided by user |
| Location override (if any) | Provided by user; only needed when not meeting at CLJ clubhouse |

### After-meeting email template

Parameters: `greeting`, `previous_book_title`, `discussion_commentary`, `month_year`, `transition_text`, `book_blurb`, `next_meeting_date` (derived: 3rd Thursday of next month), `next_poll_date` (derived: 2nd Friday of next month), `candidate_deadline` (derived: 2nd Thursday of next month), `location_override` (optional)

Default (CLJ clubhouse):

> {greeting}
>
> We had a {discussion_commentary} discussion of **{previous_book_title}** last week.
>
> With that said, we revealed the results of the {month_year} Poll — {transition_text}:
>
> {book_blurb}
>
> Reminder that we'll meet next on {next_meeting_date} at the Camp Lake James clubhouse at 5:30pm.
>
> I'll send the next poll on {next_poll_date}.
>
> If you have any works to add to the candidate list, let me know with a Goodreads link prior to {candidate_deadline}.
>
> -jeff

With location override:

> {greeting}
>
> We had a {discussion_commentary} discussion of **{previous_book_title}** last week.
>
> With that said, we revealed the results of the {month_year} Poll — {transition_text}:
>
> {book_blurb}
>
> Reminder that the {next_meeting_date} meeting will be hosted by **{host_name}** (at {host_location}). As you gain line of sight to your schedule and ability to attend, please let {host_name} know so we can plan on seating arrangements etc.
>
> I'll send the next poll on {next_poll_date}.
>
> If you have any works to add to the candidate list, let me know with a Goodreads link prior to {candidate_deadline}.
>
> -jeff

### Commit convention

`<Month Year> selection, relegates`

---

## Act 3: Process Book Addition Request

**When:** As needed, when a member sends Goodreads links for books they'd like to nominate.

**Purpose:** Add new books to the candidate pool so they appear on the website and in future polls.

### Typical request format

> Jeff,
> Here are a few books to add to the list.
>
> https://www.goodreads.com/book/show/12345-book-title
> https://www.goodreads.com/book/show/67890-another-book
>
> See you in a couple of weeks,
> [Member name]

### Workflow

```
[scrape-goodreads → add-book]  (1 or more, one per URL)
       ↓
diff-report  →  agent evaluates against QA rubric
       ↓
verify-site
       ↓
git commit & push  →  auto-deploy via GitHub Actions
```

### Inputs the agent needs

| Input | Source |
|-------|--------|
| Goodreads URLs | From the member's request email/message |

### Commit convention

`Adding candidates`

---

## Design Notes

- **Scripts are for agent consumption, not human use.** Agent skills construct inputs, call scripts, interpret structured JSON output, and evaluate QA rubrics. There is no interactive CLI.
- **The admin app (`cspines-admin`) is not part of these workflows.** Its algorithms are captured here as script specs.
- **Polling service is decoupled.** `list-candidates` produces a poll-ready list; how that list gets into a poll (OpinionX, Google Forms, or anything else) is a separate concern. The workflow just needs a poll URL back.
- **Email generation is decoupled from sending.** The agent renders email text by interpolating template parameters. Delivery (Gmail, copy-paste, API) is a separate concern.
- **Scripts live in the main repo** at `cracked.spines/scripts/`. They operate on `books.json` and `public/images/` via path arguments.
- **Monthly cadence** — three key dates each month, all derived:
  - **2nd Thursday:** Candidate submission deadline
  - **2nd Friday:** Poll goes out (Act 1)
  - **3rd Thursday:** Meeting at 5:30 PM
  - All use the same algorithm: find the first occurrence of the target weekday in the month, add 7 days (for 2nd) or 14 days (for 3rd).
- **Default venue is Camp Lake James clubhouse at 5:30 PM.** A location override (typically a member's house) is only needed during winter months. When no override is provided, templates use the default.
- **Relegation is deterministic.** The top-10 rule: rank 1 is selected, ranks 2–10 survive as Candidates, ranks 11+ are relegated. If there are 10 or fewer candidates, nobody is relegated. No human judgment required — the ranked poll results are the sole input.
- **`pollCount` is historical.** It records how many polls a book has appeared in. It does not drive relegation (the ranking does), but it's useful context on the website.
- **Max 3 Selected books** is a soft constraint. Scripts warn but do not hard-block.
- **Date ambiguity.** If a calculated `selectedForDate` is in the past or otherwise ambiguous, the script emits a warning and the agent skill queries the user for clarification.
- **Array order in `books.json` is unimportant.** New books are appended; no sorting is required.
