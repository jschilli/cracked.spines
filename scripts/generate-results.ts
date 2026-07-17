import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { format } from 'date-fns';
import { computePoll, matchBook, parseBallots, pollCloseDate, type Poll } from './lib/borda.js';
import { readBooksJson } from './lib/book-io.js';
import {
  escapeHtml,
  fillTokens,
  footnote,
  methodology,
  renderDocRows,
  renderDocTie,
  renderEmailRows,
  renderEmailTie,
  type MeetingInfo,
  type Prose,
  type RenderContext,
} from './lib/render.js';
import { failure, outputResult, success } from './lib/result.js';
import type { Book } from './lib/types.js';

interface Args {
  survey: string;
  booksJson: string;
  prose: string;
  outDir: string;
  templates: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string, fallback?: string) => {
    const i = argv.indexOf(flag);
    if (i === -1 || !argv[i + 1]) {
      if (fallback !== undefined) return fallback;
      throw new Error(`missing required flag ${flag}`);
    }
    return argv[i + 1];
  };
  return {
    survey: get('--survey'),
    booksJson: get('--books-json', 'books.json'),
    prose: get('--prose'),
    outDir: get('--out-dir', '.'),
    templates: get('--templates', 'templates'),
  };
}

const REQUIRED_PROSE: (keyof Prose)[] = ['headline', 'deck', 'intro', 'outcome'];

function validateProse(prose: Prose, poll: Poll): void {
  const missing = REQUIRED_PROSE.filter(k => !prose[k]);
  if (missing.length) throw new Error(`prose file missing required fields: ${missing.join(', ')}`);
  if (poll.ties.length > 0 && (!prose.tieIntro || !prose.tieVerdict)) {
    throw new Error('poll contains a tie, so prose must supply tieIntro and tieVerdict');
  }
}

/**
 * The Selected book whose meeting comes next — the one being discussed at the
 * meeting this email announces.
 */
function findNextMeeting(books: Book[], after: string): { book: Book; date: string } {
  const upcoming = books
    .filter(b => b.status === 'Selected' && b.selectedForDate && b.selectedForDate > after)
    .sort((a, b) => a.selectedForDate!.localeCompare(b.selectedForDate!));
  if (upcoming.length === 0) {
    throw new Error(`no Selected book with a meeting date after ${after}; cannot fill the next-meeting callout`);
  }
  return { book: upcoming[0], date: upcoming[0].selectedForDate! };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const warnings: string[] = [];

    const survey = JSON.parse(await readFile(args.survey, 'utf8'));
    const prose: Prose = JSON.parse(await readFile(args.prose, 'utf8'));
    const books = await readBooksJson(args.booksJson);

    const ballots = parseBallots(survey);
    const poll = computePoll(ballots);
    validateProse(prose, poll);

    // Every ballot title must resolve to exactly one book, or we stop.
    const matched = poll.standings.map(s => ({ standing: s, book: matchBook(books, s.title) }));

    const winnerBook = matched[0].book;
    if (winnerBook.status !== 'Selected' || !winnerBook.selectedForDate) {
      throw new Error(
        `poll winner "${winnerBook.title}" is not Selected in books.json — run process-poll-results.ts first`
      );
    }

    const selectionDate = new Date(winnerBook.selectedForDate + 'T00:00:00');
    const selectionMonth = format(selectionDate, 'MMMM yyyy');
    const fileStamp = format(selectionDate, 'yyyy-MM');

    const pollDate = pollCloseDate(survey);
    const { book: discussionBook, date: meetingDate } = findNextMeeting(books, pollDate);

    const meeting: MeetingInfo = {
      dateLabel: format(new Date(meetingDate + 'T00:00:00'), 'EEEE, MMMM d'),
      time: '5:30pm',
      venue: 'CLJ clubhouse',
      discussionTitle: discussionBook.title,
      discussionAuthor: discussionBook.author.replace(/\s+/g, ' ').trim(),
    };

    const relegated = matched.filter(m => m.book.status === 'Relegated').map(m => m.standing.title);
    const debuts = matched.filter(m => m.book.pollCount <= 1).map(m => m.standing.title);

    const ctx: RenderContext = {
      poll,
      prose,
      meeting,
      selectionMonth,
      pollDate,
      relegated,
      debuts,
    };

    if (poll.ties.some(t => t.resolvedBy === 'unresolved')) {
      warnings.push('a tie could not be resolved by Condorcet or first-place votes — decide it by hand');
    }
    if (poll.standings[0].tiedWith.length > 0) {
      warnings.push('the winner is part of a tie — confirm the tiebreaker before sending');
    }

    const emailTemplate = await readFile(join(args.templates, 'email-results.html'), 'utf8');
    const docTemplate = await readFile(join(args.templates, 'leaderboard.html'), 'utf8');

    const discussionLead = prose.discussionLead
      ? `
<!-- Discussion lead -->
<tr><td style="padding:16px 28px 0;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3A3A38;">
${prose.discussionLead}
</td></tr>
`
      : '';

    const email = fillTokens(emailTemplate, {
      SELECTION_MONTH: selectionMonth,
      BALLOT_COUNT: String(poll.ballots.length),
      DISCUSSION_LEAD: discussionLead,
      HEADLINE: escapeHtml(prose.headline),
      DECK: prose.deck,
      INTRO: prose.intro,
      OUTCOME: prose.outcome,
      LEADERBOARD_ROWS: renderEmailRows(ctx),
      FOOTNOTE: footnote(poll),
      TIE_SECTION: renderEmailTie(ctx),
      MEETING_DATE: meeting.dateLabel,
      MEETING_TIME: meeting.time,
      MEETING_VENUE: meeting.venue,
      DISCUSSION_TITLE: escapeHtml(meeting.discussionTitle),
      DISCUSSION_AUTHOR: escapeHtml(meeting.discussionAuthor),
    });

    const notes = (prose.notes ?? [])
      .map(n => `  <p style="font-size:15px; color: var(--slate-2)">\n    ${n}\n  </p>`)
      .join('\n');

    const doc = fillTokens(docTemplate, {
      SELECTION_MONTH: selectionMonth,
      POLL_DATE: pollDate,
      BALLOT_COUNT: String(poll.ballots.length),
      DECK: prose.deck,
      OUTCOME: prose.outcome,
      LEADERBOARD_ROWS: renderDocRows(ctx),
      FOOTNOTE: footnote(poll).replace(/\s+/g, ' ').trim(),
      TIE_SECTION: renderDocTie(ctx),
      NOTES: notes ? `  <h2>Notes</h2>\n${notes}` : '',
      METHODOLOGY: methodology(ctx),
    });

    const emailPath = join(args.outDir, `email-${fileStamp}-results.html`);
    const docPath = join(args.outDir, `leaderboard-${fileStamp}.html`);
    await writeFile(emailPath, email);
    await writeFile(docPath, doc);

    outputResult(
      success(
        {
          emailPath,
          docPath,
          selectionMonth,
          ballots: poll.ballots.length,
          candidateCount: poll.candidateCount,
          totalPoints: poll.totalPoints,
          winner: { title: poll.standings[0].title, points: poll.standings[0].points },
          standings: poll.standings.map(s => ({ rank: s.rank, title: s.title, points: s.points, firstPlaceVotes: s.firstPlaceVotes })),
          ties: poll.ties.map(t => ({
            points: t.points,
            members: t.members.map(m => m.split(' — ')[0]),
            isCycle: t.isCycle,
            hasEvenSplit: t.hasEvenSplit,
            resolvedBy: t.resolvedBy,
          })),
          nextMeeting: { date: meetingDate, discussing: discussionBook.title },
        },
        warnings
      )
    );
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

main();
