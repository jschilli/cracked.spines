import type { Book } from './types.js';

/** One voter's forced-rank ballot. `ranking[0]` is their first choice. */
export interface Ballot {
  voterId: string;
  ranking: string[];
}

/** A book's standing in the poll. */
export interface Standing {
  /** Display title as it appeared on the ballot (author suffix stripped). */
  title: string;
  author: string;
  points: number;
  firstPlaceVotes: number;
  meanRank: number;
  /** Competition rank: ties share the lower number, next rank skips (1,2,3,3,3,6). */
  rank: number;
  /** Other titles on the same points, if any. */
  tiedWith: string[];
}

export interface PairwiseResult {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  /** Winner, or null when voters split evenly. */
  winner: string | null;
}

export type TieResolution = 'condorcet' | 'first-place-votes' | 'unresolved';

export interface TieAnalysis {
  points: number;
  members: string[];
  pairwise: PairwiseResult[];
  /**
   * True when every pair produced a decisive winner but they still form a
   * rock-paper-scissors loop (October 2026: three books, every margin 6–5).
   * Distinct from a flat pairwise tie, where a pair split evenly and nobody
   * won (August 2026: 4–4). Both block Condorcet; they read differently.
   */
  isCycle: boolean;
  /** True when at least one pair split evenly with no winner. */
  hasEvenSplit: boolean;
  firstPlaceVotes: Record<string, number>;
  /**
   * Ordering the club methodology produces: Condorcet head-to-head first, falling
   * through to first-place votes when pairwise cannot separate the members.
   * Null when neither breaker separates them.
   */
  resolvedOrder: string[] | null;
  resolvedBy: TieResolution;
}

export interface Poll {
  ballots: Ballot[];
  standings: Standing[];
  /** Number of candidates on each ballot. */
  candidateCount: number;
  /** Sum of every book's points. Equals ballots × maxPointsPerBallot. */
  totalPoints: number;
  /** Points a single ballot distributes: N + (N-1) + ... + 1. */
  maxPointsPerBallot: number;
  /** Tie groups with more than one member, richest first. */
  ties: TieAnalysis[];
}

const AUTHOR_SEP = ' — '; // space em-dash space

/**
 * Borda points for a 1-indexed rank in a field of `candidateCount`.
 * First place scores N, last place scores 1.
 *
 * The club memo has historically written this as a literal for one specific
 * field size (e.g. "13 − rank" for a 12-book poll). It is a function of N.
 */
export function bordaPoints(rank: number, candidateCount: number): number {
  if (rank < 1 || rank > candidateCount) {
    throw new Error(`rank ${rank} out of range for ${candidateCount} candidates`);
  }
  return candidateCount + 1 - rank;
}

/** Total points one ballot distributes across the field. */
export function maxPointsPerBallot(candidateCount: number): number {
  return (candidateCount * (candidateCount + 1)) / 2;
}

/** Split a ballot entry ("Title — Author") into its parts. */
export function splitEntry(entry: string): { title: string; author: string } {
  const i = entry.lastIndexOf(AUTHOR_SEP);
  if (i === -1) return { title: entry.trim(), author: '' };
  return {
    title: entry.slice(0, i).trim(),
    author: entry.slice(i + AUTHOR_SEP.length).trim(),
  };
}

/**
 * Read ballots out of an OpinionX survey export.
 * Drops incomplete and disqualified responses.
 */
export function parseBallots(rows: unknown): Ballot[] {
  if (!Array.isArray(rows)) throw new Error('survey export is not an array');

  const ballots: Ballot[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    if (row.Completed === false || row.Disqualified === true) continue;

    const key = Object.keys(row).find(k => Array.isArray(row[k]));
    if (!key) throw new Error(`no ranked-choice array found in response ${String(row['User External ID'])}`);

    ballots.push({
      voterId: String(row['User External ID'] ?? ''),
      // OpinionX started prefixing each ranked entry with a "- " bullet in the
      // November 2026 export; strip it so titles match books.json.
      ranking: (row[key] as string[]).map(s => s.trim().replace(/^[-*\u2022]\s+/, '')),
    });
  }

  if (ballots.length === 0) throw new Error('survey export contains no usable ballots');
  return ballots;
}

/**
 * The date the poll closed: the latest response timestamp in the export.
 * Taken from the data rather than the clock so a re-run reproduces the artifact.
 */
export function pollCloseDate(rows: unknown): string {
  if (!Array.isArray(rows)) throw new Error('survey export is not an array');
  const stamps = (rows as Record<string, unknown>[])
    .filter(r => r.Completed !== false && r.Disqualified !== true)
    .map(r => String(r['Ended At'] ?? r['Started At'] ?? ''))
    .filter(Boolean)
    .map(s => s.slice(0, 10))
    .sort();
  if (stamps.length === 0) throw new Error('survey export has no response timestamps');
  return stamps[stamps.length - 1];
}

/**
 * Check every ballot ranked the same field. Returns the problems found rather
 * than throwing, so a caller can surface them all at once.
 */
export function validateBallots(ballots: Ballot[]): string[] {
  const errors: string[] = [];
  const reference = [...ballots[0].ranking].sort();

  for (const b of ballots) {
    if (new Set(b.ranking).size !== b.ranking.length) {
      errors.push(`ballot ${b.voterId} ranks a title more than once`);
    }
    const sorted = [...b.ranking].sort();
    if (sorted.length !== reference.length || sorted.some((t, i) => t !== reference[i])) {
      errors.push(`ballot ${b.voterId} ranks a different field than ballot ${ballots[0].voterId}`);
    }
  }
  return errors;
}

/** How many voters preferred `a` over `b`, and how many the reverse. */
export function pairwise(ballots: Ballot[], a: string, b: string): PairwiseResult {
  let aWins = 0;
  let bWins = 0;
  for (const ballot of ballots) {
    const ia = ballot.ranking.indexOf(a);
    const ib = ballot.ranking.indexOf(b);
    if (ia === -1 || ib === -1) continue;
    if (ia < ib) aWins++;
    else bWins++;
  }
  return { a, b, aWins, bWins, winner: aWins > bWins ? a : bWins > aWins ? b : null };
}

/**
 * Resolve a set of books tied on points, per club methodology:
 * Condorcet head-to-head first, then first-place votes if pairwise cannot separate them.
 *
 * Deliberately omits mean rank. Mean rank is a linear restatement of the Borda
 * score (points = N+1 − rank), so it ties whenever the score does and can never
 * break a Borda tie.
 */
export function analyzeTie(ballots: Ballot[], members: string[], points: number): TieAnalysis {
  const pairs: PairwiseResult[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      pairs.push(pairwise(ballots, members[i], members[j]));
    }
  }

  const firstPlaceVotes: Record<string, number> = {};
  for (const m of members) {
    firstPlaceVotes[m] = ballots.filter(b => b.ranking[0] === m).length;
  }

  // Condorcet: order by head-to-head wins against the other tied members.
  // A strict order exists only when every member has a distinct win count.
  const winCount = new Map<string, number>();
  for (const m of members) {
    winCount.set(m, pairs.filter(p => p.winner === m).length);
  }
  const counts = [...winCount.values()];
  const condorcetDecisive = new Set(counts).size === counts.length;

  const hasEvenSplit = pairs.some(p => p.winner === null);
  const isCycle = !condorcetDecisive && !hasEvenSplit;

  const base = { points, members, pairwise: pairs, isCycle, hasEvenSplit, firstPlaceVotes };

  if (condorcetDecisive) {
    const order = [...members].sort((x, y) => winCount.get(y)! - winCount.get(x)!);
    return { ...base, resolvedOrder: order, resolvedBy: 'condorcet' };
  }

  // Fall through to first-place votes.
  const fpvCounts = members.map(m => firstPlaceVotes[m]);
  if (new Set(fpvCounts).size === fpvCounts.length) {
    const order = [...members].sort((x, y) => firstPlaceVotes[y] - firstPlaceVotes[x]);
    return { ...base, resolvedOrder: order, resolvedBy: 'first-place-votes' };
  }

  return { ...base, resolvedOrder: null, resolvedBy: 'unresolved' };
}

/** Score a set of ballots into a full poll result. */
export function computePoll(ballots: Ballot[]): Poll {
  const errors = validateBallots(ballots);
  if (errors.length > 0) throw new Error(`invalid ballots: ${errors.join('; ')}`);

  const candidateCount = ballots[0].ranking.length;
  const points = new Map<string, number>();
  const firsts = new Map<string, number>();
  const rankSum = new Map<string, number>();

  for (const ballot of ballots) {
    ballot.ranking.forEach((entry, i) => {
      const rank = i + 1;
      points.set(entry, (points.get(entry) ?? 0) + bordaPoints(rank, candidateCount));
      rankSum.set(entry, (rankSum.get(entry) ?? 0) + rank);
      if (i === 0) firsts.set(entry, (firsts.get(entry) ?? 0) + 1);
    });
  }

  const byPoints = [...points.entries()].sort((a, b) => b[1] - a[1]);

  const standings: Standing[] = byPoints.map(([entry, pts]) => {
    const { title, author } = splitEntry(entry);
    return {
      title,
      author,
      points: pts,
      firstPlaceVotes: firsts.get(entry) ?? 0,
      meanRank: rankSum.get(entry)! / ballots.length,
      rank: byPoints.filter(([, p]) => p > pts).length + 1,
      tiedWith: byPoints.filter(([e, p]) => p === pts && e !== entry).map(([e]) => splitEntry(e).title),
    };
  });

  const ties: TieAnalysis[] = [];
  const seen = new Set<number>();
  for (const [entry, pts] of byPoints) {
    if (seen.has(pts)) continue;
    seen.add(pts);
    const members = byPoints.filter(([, p]) => p === pts).map(([e]) => e);
    if (members.length > 1) ties.push(analyzeTie(ballots, members, pts));
  }

  return {
    ballots,
    standings,
    candidateCount,
    totalPoints: [...points.values()].reduce((a, b) => a + b, 0),
    maxPointsPerBallot: maxPointsPerBallot(candidateCount),
    ties,
  };
}

/**
 * Resolve a ballot title to its books.json entry.
 *
 * Ballot titles are display titles and can be shorter than the canonical record
 * (the September 2026 "Easy Money" entry dropped a long subtitle), so an exact
 * match is tried first and a unique prefix match second.
 */
export function matchBook(books: Book[], ballotTitle: string): Book {
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(ballotTitle);

  const exact = books.filter(b => norm(b.title) === target);
  if (exact.length === 1) return exact[0];

  const prefix = books.filter(b => norm(b.title).startsWith(target) || target.startsWith(norm(b.title)));
  if (prefix.length === 1) return prefix[0];
  if (prefix.length > 1) {
    throw new Error(`"${ballotTitle}" matches ${prefix.length} books: ${prefix.map(b => b.title).join(' | ')}`);
  }
  throw new Error(`"${ballotTitle}" matches no book in books.json`);
}
