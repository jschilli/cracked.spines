# Sample emails from book club

## Poll email

All,

The poll for April 2026 selection is here: https://app.opinionx.co/9ffebe8a-dc9f-4555-8018-cb5c6e47f01a

We are meeting at Kim Jurrel’s house (details forthcoming) this coming Thursday at 5:30pm

The current candidates are here: https://crackedspin.es/candidate

Please let Kim know if you’re coming or not (space planning) as you are able.

-jeff

## After meeting (rich HTML — canonical from August 2026 onward)

The after-meeting / poll-results email is now a rich HTML artifact, not plain text. The canonical reference file is `email-2026-08-results.html` at the repo root (and `leaderboard-2026-08.html` for the standalone document version). Use those as the template every cycle.

**Structure** (top to bottom):

1. Monospace meta line: `Cracked Spines · <Month Year> Poll · N ballots`
2. Serif headline, telegraphic: `<Winner> takes <SelectionMonth>.`
3. Italic deck — one sentence framing what's notable
4. Two-sentence intro naming winner + Borda total + margin
5. Outcome callout (ivory-2 bg, clay left border) — one-line winner / runner-up / relegated summary
6. Leaderboard table — all ranks, Borda points, pills for New/Winner/Tied/Relegated, color-coded rows (olive winner, clay ties, rust relegates)
7. Methodology footnote: `Borda points = (13 − rank). Total <X> = <voters> × <max> ✓`
8. **Tiebreaker section** — only if a tie occurred. Explain Condorcet head-to-head; if tied, show secondary breakers (first-place votes, mean rank, median rank) in a 3-up grid with the decisive one tinted clay
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
