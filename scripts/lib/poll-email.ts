import { format } from 'date-fns';
import { escapeHtml } from './render.js';
import type { Book } from './types.js';

/** A meeting already on the calendar: a Selected book and the night it is discussed. */
export interface ScheduledMeeting {
  date: string;
  dateLabel: string;
  title: string;
  author: string;
}

const cleanAuthor = (a: string) => a.replace(/\s+/g, ' ').trim();
const dateLabel = (iso: string) => format(new Date(iso + 'T00:00:00'), 'EEEE, MMMM d');

/**
 * The meetings already on the calendar, soonest first. `Selected` means chosen
 * but not yet discussed, so every one of these is upcoming by definition — if a
 * past meeting is still Selected, Act 2 was never run for it (see `staleSelections`).
 */
export function upcomingMeetings(books: Book[], limit = 3): ScheduledMeeting[] {
  return books
    .filter(b => b.status === 'Selected' && b.selectedForDate)
    .sort((a, b) => a.selectedForDate!.localeCompare(b.selectedForDate!))
    .slice(0, limit)
    .map(b => ({
      date: b.selectedForDate!,
      dateLabel: dateLabel(b.selectedForDate!),
      title: b.title,
      author: cleanAuthor(b.author),
    }));
}

/**
 * Selected books whose meeting predates the most recent Read book — i.e. a
 * meeting that has demonstrably happened but was never recorded. Returns titles.
 */
export function staleSelections(books: Book[]): string[] {
  const lastRead = books
    .filter(b => b.status === 'Read' && b.selectedForDate)
    .map(b => b.selectedForDate!)
    .sort()
    .pop();
  if (!lastRead) return [];
  return books
    .filter(b => b.status === 'Selected' && b.selectedForDate && b.selectedForDate < lastRead)
    .map(b => b.title);
}

const NEW_PILL =
  '<span style="display:inline-block;margin-left:8px;padding:1px 6px;background:#E3DACC;font-family:\'SF Mono\',Menlo,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#6B6B68;">New</span>';

/** One row per candidate: title, author, and a New pill for a first-time entry. */
export function renderCandidateRows(candidates: Book[]): string {
  return candidates
    .map((b, i) => {
      const border = i === 0 ? '' : 'border-top:1px solid rgba(20,20,19,0.08);';
      const pill = b.pollCount === 0 ? NEW_PILL : '';
      return `    <tr><td style="padding:10px 14px;${border}font-family:Georgia,serif;font-size:15px;line-height:1.45;color:#141413;">
      <strong>${escapeHtml(b.title)}</strong>${pill}<br>
      <span style="font-size:14px;color:#6B6B68;">${escapeHtml(cleanAuthor(b.author))}</span>
    </td></tr>`;
    })
    .join('\n');
}

/** One row per scheduled meeting. The soonest is emphasised — it is the next one. */
export function renderScheduleRows(meetings: ScheduledMeeting[]): string {
  return meetings
    .map((m, i) => {
      const weight = i === 0 ? 'font-weight:600;' : '';
      const pad = i === 0 ? '0 0 6px' : '0 0 6px';
      return `        <tr><td style="padding:${pad};font-family:Georgia,serif;font-size:15px;line-height:1.45;color:#141413;${weight}">
          <span style="font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#788C5D;">${m.dateLabel}</span><br>
          <em>${escapeHtml(m.title)}</em> — ${escapeHtml(m.author)}
        </td></tr>`;
    })
    .join('\n');
}
