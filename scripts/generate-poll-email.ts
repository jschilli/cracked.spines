import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { format } from 'date-fns';
import { readBooksJson } from './lib/book-io.js';
import { escapeHtml, fillTokens } from './lib/render.js';
import { renderCandidateRows, renderScheduleRows, staleSelections, upcomingMeetings } from './lib/poll-email.js';
import { failure, outputResult, success } from './lib/result.js';

interface Args {
  pollUrl: string;
  month: string;
  booksJson: string;
  venue: string;
  time: string;
  note: string;
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
  const args = {
    pollUrl: get('--poll-url'),
    month: get('--month'),
    booksJson: get('--books-json', 'books.json'),
    venue: get('--venue', 'the CLJ clubhouse'),
    time: get('--time', '5:30pm'),
    note: get('--note', ''),
    outDir: get('--out-dir', '.'),
    templates: get('--templates', 'templates'),
  };
  if (!/^\d{4}-\d{2}$/.test(args.month)) throw new Error(`--month must be YYYY-MM, got "${args.month}"`);
  if (!/^https?:\/\//.test(args.pollUrl)) throw new Error(`--poll-url must be an http(s) URL, got "${args.pollUrl}"`);
  return args;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const warnings: string[] = [];

    const books = await readBooksJson(args.booksJson);
    const candidates = books.filter(b => b.status === 'Candidate');
    if (candidates.length === 0) throw new Error('no Candidate books in books.json — nothing to put on a ballot');

    const meetings = upcomingMeetings(books);
    if (meetings.length === 0) throw new Error('no Selected book with a meeting date — cannot fill the on-deck schedule');

    const stale = staleSelections(books);
    if (stale.length) {
      warnings.push(
        `still Selected but older than the latest Read book — run Act 2 for these before sending: ${stale.join(', ')}`
      );
    }
    if (meetings.length < 3) warnings.push(`only ${meetings.length} meeting(s) scheduled; on-deck section is short`);

    const selectionMonth = format(new Date(args.month + '-01T00:00:00'), 'MMMM yyyy');

    const note = args.note
      ? `<tr><td style="padding:0 28px 24px;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#141413;">\n${escapeHtml(args.note)}\n</td></tr>\n`
      : '';

    const template = await readFile(join(args.templates, 'email-poll.html'), 'utf8');
    const email = fillTokens(template, {
      SELECTION_MONTH: selectionMonth,
      CANDIDATE_COUNT: String(candidates.length),
      POLL_URL: escapeHtml(args.pollUrl),
      MEETING_SHORT: meetings[0].dateLabel,
      MEETING_TIME: escapeHtml(args.time),
      VENUE: escapeHtml(args.venue),
      CANDIDATE_ROWS: renderCandidateRows(candidates),
      SCHEDULE_ROWS: renderScheduleRows(meetings),
      NOTE: note,
    });

    const emailPath = join(args.outDir, `email-${args.month}-poll.html`);
    await writeFile(emailPath, email);

    outputResult(
      success(
        {
          emailPath,
          selectionMonth,
          pollUrl: args.pollUrl,
          candidateCount: candidates.length,
          debuts: candidates.filter(b => b.pollCount === 0).map(b => b.title),
          onDeck: meetings.map(m => ({ date: m.date, title: m.title })),
        },
        warnings
      )
    );
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

main();
