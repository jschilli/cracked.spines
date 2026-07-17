import type { PairwiseResult, Poll, Standing, TieAnalysis } from './borda.js';
import { splitEntry } from './borda.js';

/** Prose written by hand each cycle. The generator never invents these. */
export interface Prose {
  /** Serif headline. Convention: "<Winner> takes <SelectionMonth>." */
  headline: string;
  /** One italic sentence framing what was notable. */
  deck: string;
  /** 1–2 sentences naming the winner, Borda total and margin. Inline HTML allowed. */
  intro: string;
  /** One-line winner / runner-up / relegated summary. Inline HTML allowed. */
  outcome: string;
  /** Optional sentence about the previous book's discussion, led above the headline. */
  discussionLead?: string;
  /** Prose for the tie section. Required when the poll contains a tie. */
  tieIntro?: string;
  tieVerdict?: string;
  /** Standalone-document-only closing notes. Inline HTML allowed. */
  notes?: string[];
}

export interface MeetingInfo {
  /** e.g. "Thursday, August 20" */
  dateLabel: string;
  time: string;
  venue: string;
  discussionTitle: string;
  discussionAuthor: string;
}

export interface RenderContext {
  poll: Poll;
  prose: Prose;
  meeting: MeetingInfo;
  /** e.g. "October 2026" — the month the winning book is read. */
  selectionMonth: string;
  /** ISO date the poll closed. */
  pollDate: string;
  /** Titles relegated this round, if any. */
  relegated: string[];
  /** Titles appearing in their first poll. */
  debuts: string[];
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replace {{TOKEN}} placeholders. Throws on any token the template declares but
 * the caller did not supply, and on any supplied token the template never uses —
 * a silent mismatch would ship a page with a literal {{TOKEN}} in it.
 */
export function fillTokens(template: string, tokens: Record<string, string>): string {
  const declared = new Set([...template.matchAll(/\{\{([A-Z_]+)\}\}/g)].map(m => m[1]));
  const supplied = new Set(Object.keys(tokens));

  const missing = [...declared].filter(t => !supplied.has(t));
  if (missing.length) throw new Error(`template needs tokens not supplied: ${missing.join(', ')}`);

  const unused = [...supplied].filter(t => !declared.has(t));
  if (unused.length) throw new Error(`tokens supplied but not in template: ${unused.join(', ')}`);

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, t) => tokens[t]);
}

/** The methodology footnote, derived from the field rather than hardcoded. */
export function footnote(poll: Poll): string {
  const n = poll.candidateCount;
  return `Borda points = (${n + 1} − rank).  Total ${poll.totalPoints} = ${poll.ballots.length} × ${poll.maxPointsPerBallot} ✓`;
}

function pillKind(s: Standing, ctx: RenderContext): 'winner' | 'tied' | 'relegated' | 'new' | null {
  if (s.rank === 1) return 'winner';
  if (ctx.relegated.includes(s.title)) return 'relegated';
  if (s.tiedWith.length > 0) return 'tied';
  if (ctx.debuts.includes(s.title)) return 'new';
  return null;
}

const PILL_LABEL: Record<string, string> = {
  winner: 'Winner',
  tied: 'Tied',
  relegated: 'Relegated',
  new: 'New',
};

const TOKENS = {
  slate: '#141413',
  slate2: '#3A3A38',
  slate3: '#6B6B68',
  ivory: '#FAF9F5',
  ivory2: '#F4F1E8',
  clay: '#D97757',
  oat: '#E3DACC',
  olive: '#788C5D',
  rust: '#B04A3F',
};

const PILL_STYLE: Record<string, string> = {
  winner: `background:${TOKENS.olive};color:${TOKENS.ivory};`,
  tied: `background:${TOKENS.clay};color:${TOKENS.ivory};`,
  relegated: `background:${TOKENS.rust};color:${TOKENS.ivory};`,
  new: `background:${TOKENS.oat};color:${TOKENS.slate2};`,
};

/** Leaderboard rows for the email (inline styles, table layout). */
export function renderEmailRows(ctx: RenderContext): string {
  const rows = ctx.poll.standings.map((s, i) => {
    const last = i === ctx.poll.standings.length - 1;
    const kind = pillKind(s, ctx);
    const border = last ? '' : 'border-bottom:1px solid rgba(20,20,19,0.06);';

    const rowBg =
      s.rank === 1
        ? ` style="background:rgba(120,140,93,0.10);"`
        : ctx.relegated.includes(s.title)
          ? ` style="background:rgba(176,74,63,0.05);"`
          : '';

    const rankColor = s.rank === 1 ? TOKENS.olive : s.tiedWith.length ? TOKENS.clay : TOKENS.slate3;
    const rankWeight = s.rank === 1 ? 'font-weight:700;' : '';
    const scoreColor = s.rank === 1 ? TOKENS.olive : TOKENS.slate2;
    const scoreWeight = s.rank === 1 ? 'font-weight:700;' : '';
    const title = s.rank === 1 ? `<strong>${escapeHtml(s.title)}</strong>` : escapeHtml(s.title);

    const pill = kind
      ? ` <span style="display:inline-block;${PILL_STYLE[kind]}font-family:'SF Mono',monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;padding:2px 7px;margin-left:6px;border-radius:2px;">${PILL_LABEL[kind]}</span>`
      : '';

    return `    <tr${rowBg}>
      <td style="padding:11px 14px;font-family:'SF Mono',Menlo,monospace;font-size:13px;color:${rankColor};${rankWeight}${border}vertical-align:top;">${s.rank}</td>
      <td style="padding:11px 14px;font-family:Georgia,serif;font-size:15px;color:${TOKENS.slate};${border}">
        ${title}${pill}<br>
        <span style="color:${TOKENS.slate3};font-style:italic;font-size:14px;">${escapeHtml(s.author)}</span>
      </td>
      <td align="right" style="padding:11px 14px;font-family:'SF Mono',Menlo,monospace;font-size:14px;color:${scoreColor};${scoreWeight}${border}">${s.points}</td>
    </tr>`;
  });
  return rows.join('\n\n');
}

/** Leaderboard rows for the standalone document (CSS classes). */
export function renderDocRows(ctx: RenderContext): string {
  return ctx.poll.standings
    .map(s => {
      const kind = pillKind(s, ctx);
      const cls =
        s.rank === 1 ? ' class="winner"' : ctx.relegated.includes(s.title) ? ' class="relegate"' : s.tiedWith.length ? ' class="tied"' : '';
      const pill = kind ? ` <span class="pill ${kind}">${PILL_LABEL[kind]}</span>` : '';
      return `      <tr${cls}>
        <td class="rank">${s.rank}</td>
        <td class="title">${escapeHtml(s.title)}${pill}<br><span class="author">${escapeHtml(s.author)}</span></td>
        <td class="score">${s.points}</td>
      </tr>`;
    })
    .join('\n');
}

/** Short display name for a tie member inside prose and grids. */
function shortName(entry: string): string {
  return splitEntry(entry).title.split(':')[0];
}

/**
 * Order the head-to-head legs so a cycle reads as a loop (A beats B, B beats C,
 * C beats A) rather than in pair-enumeration order. Falls back to the natural
 * order when the members do not form a single clean loop.
 */
export function orderLegs(tie: TieAnalysis): PairwiseResult[] {
  if (!tie.isCycle) return tie.pairwise;

  const beats = new Map<string, PairwiseResult>();
  for (const p of tie.pairwise) {
    if (!p.winner) return tie.pairwise;
    if (beats.has(p.winner)) return tie.pairwise; // not a simple loop
    beats.set(p.winner, p);
  }
  if (beats.size !== tie.members.length) return tie.pairwise;

  const ordered: PairwiseResult[] = [];
  let current = tie.members[0];
  for (let i = 0; i < tie.members.length; i++) {
    const leg = beats.get(current);
    if (!leg) return tie.pairwise;
    ordered.push(leg);
    current = leg.winner === leg.a ? leg.b : leg.a;
  }
  return ordered.length === tie.pairwise.length ? ordered : tie.pairwise;
}

/** How the tie was blocked, in one clause — used for labels. */
function pairwiseVerdict(tie: TieAnalysis): string {
  if (tie.isCycle) return 'Cycle — indecisive';
  if (tie.hasEvenSplit) return 'Even split — indecisive';
  return 'Decisive';
}

/**
 * The tie section, or '' when the poll had no tie.
 * Mean rank is deliberately absent: it is a restatement of the Borda score and
 * ties whenever the score does, so it cannot serve as a breaker.
 */
export function renderEmailTie(ctx: RenderContext): string {
  const tie = ctx.poll.ties[0];
  if (!tie) return '';

  const ordered = orderLegs(tie);
  const legs = ordered
    .map((p, i) => {
      const winner = p.winner ? shortName(p.winner) : null;
      const loser = p.winner === p.a ? shortName(p.b) : shortName(p.a);
      const hi = Math.max(p.aWins, p.bWins);
      const lo = Math.min(p.aWins, p.bWins);
      const body = winner
        ? `<strong style="color:${TOKENS.clay};">${escapeHtml(winner)} ${hi}</strong> · ${escapeHtml(loser)} ${lo}`
        : `${escapeHtml(shortName(p.a))} ${p.aWins} · ${escapeHtml(shortName(p.b))} ${p.bWins}`;
      const rightBorder = i < ordered.length - 1 ? 'border-right:1px solid rgba(20,20,19,0.12);' : '';
      return `      <td width="${Math.floor(100 / ordered.length)}%" style="padding:14px 16px;background:rgba(217,119,87,0.08);${rightBorder}">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:${TOKENS.clay};margin-bottom:4px;">Head-to-head</div>
        <div style="font-family:Georgia,serif;font-size:15px;color:${TOKENS.slate};">${body}</div>
      </td>`;
    })
    .join('\n');

  return `<!-- Tiebreaker -->
<tr><td style="padding:0 28px 12px;font-family:Georgia,serif;font-size:20px;font-weight:600;color:${TOKENS.slate};">
<span style="color:${TOKENS.clay};">§</span> About that tie
</td></tr>

<tr><td style="padding:0 28px 16px;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:${TOKENS.slate};">
${ctx.prose.tieIntro ?? ''}
</td></tr>

<tr><td style="padding:0 28px 16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid rgba(20,20,19,0.12);">
    <tr>
${legs}
    </tr>
  </table>
</td></tr>

<tr><td style="padding:0 28px 28px;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:${TOKENS.slate};">
${ctx.prose.tieVerdict ?? ''}
</td></tr>`;
}

/** The tie section for the standalone document, with the full ballot table. */
export function renderDocTie(ctx: RenderContext): string {
  const tie = ctx.poll.ties[0];
  if (!tie) return '';

  const legs = orderLegs(tie)
    .map((p, i) => {
      const winner = p.winner ? shortName(p.winner) : null;
      const loser = p.winner === p.a ? shortName(p.b) : shortName(p.a);
      const hi = Math.max(p.aWins, p.bWins);
      const lo = Math.min(p.aWins, p.bWins);
      const val = winner
        ? `<strong>${escapeHtml(winner)} ${hi}</strong> · ${escapeHtml(loser)} ${lo}`
        : `${escapeHtml(shortName(p.a))} ${p.aWins} · ${escapeHtml(shortName(p.b))} ${p.bWins}`;
      return `      <div class="leg">
        <div class="label">Leg ${i + 1}</div>
        <div class="val">${val}</div>
      </div>`;
    })
    .join('\n');

  const heads = tie.members.map(m => `<th class="num">${escapeHtml(shortName(m))}</th>`).join('');
  const ballotRows = ctx.poll.ballots
    .map(b => {
      const cells = tie.members.map(m => `<td>${b.ranking.indexOf(m) + 1}</td>`).join('');
      return `        <tr><td>${escapeHtml(b.voterId.slice(0, 4))}</td>${cells}</tr>`;
    })
    .join('\n');

  const fpv = tie.members.map(m => `${escapeHtml(shortName(m))} ${tie.firstPlaceVotes[m]}`).join(' · ');
  const fpvDecisive = tie.resolvedBy === 'first-place-votes';

  return `  <h2>${tie.members.length > 2 ? `The ${numberWord(tie.members.length)}-way tie at ${tie.points}` : `The tie at ${tie.points}`}</h2>

  <div class="tiebreak">
    <h3>${tie.members.map(m => escapeHtml(shortName(m))).join(' vs. ')} <span class="verdict">All at ${tie.points} pts</span></h3>
    <p>${ctx.prose.tieIntro ?? ''}</p>

    <div class="cycle">
${legs}
    </div>

    <p style="margin-top:20px">The ballot-level ranks behind it:</p>

    <table class="h2h-table">
      <thead>
        <tr><th>Ballot</th>${heads}</tr>
      </thead>
      <tbody>
${ballotRows}
      </tbody>
    </table>

    <div class="breakers">
      <div class="breaker${tie.resolvedBy === 'condorcet' ? ' decisive' : ''}">
        <div class="label">Head-to-head</div>
        <div class="val">${pairwiseVerdict(tie)}</div>
      </div>
      <div class="breaker${fpvDecisive ? ' decisive' : ''}">
        <div class="label">First-place votes</div>
        <div class="val">${fpvDecisive ? `<strong>${fpv}</strong>` : fpv}</div>
      </div>
    </div>

    <p style="margin-top:20px">${ctx.prose.tieVerdict ?? ''}</p>
  </div>`;
}

function numberWord(n: number): string {
  return ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);
}

/** Methodology paragraph for the standalone document, derived from the field. */
export function methodology(ctx: RenderContext): string {
  const n = ctx.poll.candidateCount;
  const tie = ctx.poll.ties[0];
  const tail = tie
    ? `This round produced a tie at ${tie.points} points, resolved by ${tie.resolvedBy.replace(/-/g, ' ')}.`
    : 'No tie occurred at the top of this round, so no tiebreaker was applied to the selection.';
  return `Borda count with ${n} candidates: 1st place = ${n} points, last place = 1 point. ${ctx.poll.ballots.length} forced-rank ballots collected via survey. Ties resolve per the club's <em>Polling Methodology</em> memo (formalized after the February 2026 tie): Condorcet head-to-head first, then first-place votes if pairwise cannot separate the books. ${tail}`;
}
