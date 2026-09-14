# Sample emails from book club

## Poll email (rich HTML — canonical from December 2026 onward)

The poll announcement is a rich HTML artifact, same family as the results email.

**Do not hand-write it and do not copy last month's file.** Generate it:

```
npx tsx scripts/generate-poll-email.ts \
  --poll-url <poll URL> \
  --month <YYYY-MM> \
  --books-json books.json \
  --out-dir .
```

`--month` is the **selection month** — the month the winner is read, not the current month. Writes `email-<YYYY>-<MM>-poll.html`. Optional flags: `--venue` (default `the CLJ clubhouse`), `--time` (default `5:30pm`), `--note` (one plain sentence appended before the sign-off, e.g. an RSVP request when the venue is someone's house).

- **Template** lives in `templates/email-poll.html`. Edit that to change the design — never the generated output.
- **No prose file.** Unlike the results email, everything is derived; the only hand-written text is the optional `--note`.
- **Derived from `books.json`**: the candidate list (every `Candidate`, in file order, with a New pill for `pollCount === 0`), the candidate count, and the on-deck schedule (the next three `Selected` books by `selectedForDate`). The generator warns if a `Selected` meeting predates the latest `Read` one — that means Act 2 was skipped for it.

**Structure** (top to bottom):

1. Monospace meta line: `Cracked Spines · <Month Year> Poll · N candidates`
2. Serif headline: `The <Month Year> poll is open.`
3. Italic deck naming the next meeting date
4. Ballot callout (ivory-2 bg, clay left border) — the poll link, nothing else competing with it
5. `§ On the ballot` — brief candidate table, title over author, oat New pill on debuts
6. Link to `crackedspin.es/candidate` for covers and detail
7. On-deck callout (ivory-2 bg, **olive** left border) — next three meetings with dates and books, soonest emphasised, then the standing time/venue line
8. Optional `--note` sentence
9. Sign-off: `-Jeff`
10. Monospace footer rule

Same aesthetic tokens, fonts, and email-safety rules as the results email (see below). To send: open in browser, ⌘A / ⌘C, paste into Gmail compose.

### Legacy plain-text poll email (pre-December 2026)

```
All,

The poll for April 2026 selection is here: https://app.opinionx.co/9ffebe8a-dc9f-4555-8018-cb5c6e47f01a

We are meeting at Kim Jurrel's house (details forthcoming) this coming Thursday at 5:30pm

The current candidates are here: https://crackedspin.es/candidate

Please let Kim know if you're coming or not (space planning) as you are able.

-jeff
```

## After meeting (rich HTML — canonical from August 2026 onward)

The after-meeting / poll-results email is a rich HTML artifact, not plain text.

**Do not hand-write it and do not copy last month's file.** Since October 2026 both artifacts are generated:

```
npx tsx scripts/generate-results.ts \
  --survey <survey-export.json> \
  --books-json books.json \
  --prose prose/<YYYY-MM>.json \
  --out-dir .
```

This writes `email-<YYYY>-<MM>-results.html` and `leaderboard-<YYYY>-<MM>.html`, where `<YYYY>-<MM>` is the **selection month** (taken from the winner's `selectedForDate`), not the current month.

- **Templates** live in `templates/email-results.html` and `templates/leaderboard.html`. Edit those to change the design — never the generated output.
- **Prose** lives in `prose/<YYYY-MM>.json` and is the only thing written by hand each cycle: `headline`, `deck`, `intro`, `outcome` (required), plus `tieIntro`/`tieVerdict` (required when there is a tie), `notes` (leaderboard only) and `discussionLead` (optional lead sentence about last month's book).
- **Everything else is derived** from the survey export and `books.json`: ballot count, Borda scores, ranks, tie analysis, pills, the methodology footnote, and the next-meeting callout. Do not type those by hand.

The generator refuses to run if the winner is not already `Selected` in `books.json`, so run `process-poll-results.ts` first (see `workflows/record-selection.md`).

**Structure** (top to bottom) — this is what the templates produce:

1. Monospace meta line: `Cracked Spines · <Month Year> Poll · N ballots`
2. Serif headline, telegraphic: `<Winner> takes <SelectionMonth>.`
3. Italic deck — one sentence framing what's notable
4. Two-sentence intro naming winner + Borda total + margin
5. Outcome callout (ivory-2 bg, clay left border) — one-line winner / runner-up / relegated summary
6. Leaderboard table — all ranks, Borda points, pills for New/Winner/Tied/Relegated, color-coded rows (olive winner, clay ties, rust relegates)
7. Methodology footnote: `Borda points = (N+1 − rank). Total <X> = <voters> × <max> ✓` — where N is the number of candidates **in that poll**. A 9-book poll reads `(10 − rank)`, a 12-book poll reads `(13 − rank)`. The generator derives this; never hardcode a literal.
8. **Tiebreaker section** — only if a tie occurred. Explain the Condorcet head-to-head; if pairwise cannot separate the books, show the fall-through to first-place votes with the decisive breaker tinted clay. **Do not present mean rank as a breaker** — Borda points are a linear function of rank, so mean rank ties whenever the score ties and can never break anything. (The September 2026 email framed a 4.43/4.43 mean-rank tie as meaningful; it was arithmetic.)
9. Next-meeting callout (ivory-2 bg, **olive** left border) — date, time, venue, **discussion book** (look up from books.json), candidate list link. **No RSVP request** — that is not part of the cadence
10. Sign-off: `-Jeff`
11. Monospace footer rule

**Aesthetic tokens** (warm editorial — same family as the site):
`--ivory #FAF9F5`, `--ivory-2 #F4F1E8`, `--slate #141413`, `--clay #D97757` (links/attention/ties), `--oat #E3DACC` (new-book pill), `--olive #788C5D` (winner/good), `--rust #B04A3F` (relegated/bad).

Fonts: Georgia / Iowan Old Style serif for body and headlines; SF Mono / Menlo monospace for meta, labels, ranks, Borda scores. No web fonts.

**Email-safety**: every style inline, `<table role="presentation">` for layout, width capped at 600px, no `<style>` block (Gmail strips it). To send: open file in browser, ⌘A / ⌘C, paste into Gmail compose.

**Voice**: still terse and Jeff-style. Headline is a single declarative sentence. Sign-off is `-Jeff`. If the previous month's book had a memorable discussion, a single sentence about it can lead before the headline — keep it short and lightly self-aware (see legacy plain-text sample below for tone).

### Legacy plain-text after-meeting (tone reference only — do not generate as the default)

> Happy holidays!
>
> We had a small but intense discussion of AI 2027 last week.  I suspect some left the discussion ready to up their "prepper" game while others await news from their AI Overlords.  I have no doubt that we all learned something - including a real world use case for the phrase "ignorance is bliss"
>
> With that said, we revealed the results of the March 2026 Poll - we'll travel from the near future to:
>
> Sixty-six million years ago, the Earth's most fearsome creatures vanished. Today they remain one of our planet's great mysteries. Now The Rise and Fall of the Dinosaurs reveals their extraordinary, 200-million-year-long story as never before.
>
> If you have any works to add to the candidate list, let me know (with a Goodreads link prior to 1/9/26.
>
> -jeff

Kept here purely as a **voice reference** for the headline / deck / intro prose. The HTML structure above replaces it as the actual deliverable.

## Add book(s) request

Jeff,
Here are a few books to add to the list.
[
](https://www.goodreads.com/book/show/42343.Blind_Man_s_Bluff)

https://www.goodreads.com/book/show/35820369-the-rise-and-fall-of-the-dinosaurs
https://www.goodreads.com/book/show/36442813-the-order-of-time

See you in a couple of weeks,
Duncan
