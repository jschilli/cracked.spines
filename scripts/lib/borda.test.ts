import { describe, expect, it } from 'vitest';
import {
  analyzeTie,
  bordaPoints,
  computePoll,
  matchBook,
  maxPointsPerBallot,
  pairwise,
  parseBallots,
  pollCloseDate,
  splitEntry,
  validateBallots,
  type Ballot,
} from './borda.js';
import { orderLegs } from './render.js';
import type { Book } from './types.js';

/** October 2026 field, keyed by the letters used in the ballot fixtures below. */
const OCT_TITLES: Record<string, string> = {
  A: 'An Immense World: How Animal Senses Reveal the Hidden Realms Around Us — Ed Yong',
  B: 'The Black Count: Glory, Revolution, Betrayal, and the Real Count of Monte Cristo — Tom Reiss',
  E: 'Easy Money: Cryptocurrency, Casino Capitalism, and the Golden Age of Fraud — Ben McKenzie',
  G: 'The Gales of November: The Untold Story of the Edmund Fitzgerald — John U. Bacon',
  I: 'Inventing the Renaissance: The Myth of a Golden Age — Ada Palmer',
  L: 'The Laws of Thought: The Quest for a Mathematical Theory of the Mind — Tom Griffiths',
  O: 'The Order of Time — Carlo Rovelli',
  R: 'The River of Doubt — Candice Millard',
  S: 'Say Nothing: A True Story of Murder and Memory in Northern Ireland — Patrick Radden Keefe',
};

/** The eleven ballots actually cast in the October 2026 poll, most-preferred first. */
const OCT_BALLOTS = [
  'SOELAIGBR',
  'SOLBGAIRE',
  'EISRBOLGA',
  'ABEIROSLG',
  'GEALISBOR',
  'AOILRBEGS',
  'SEOIBLGAR',
  'EBROLGISA',
  'OILASBGRE',
  'IBGROLSEA',
  'LRGBOEIAS',
];

/** Expand a letter-coded ballot ("SOELAIGBR") into full ballot entries. */
function ballots(coded: string[], titles: Record<string, string> = OCT_TITLES): Ballot[] {
  return coded.map((code, i) => ({
    voterId: `v${i}`,
    ranking: [...code].map(c => {
      const t = titles[c];
      if (!t) throw new Error(`unknown ballot code "${c}"`);
      return t;
    }),
  }));
}

const byTitle = (poll: ReturnType<typeof computePoll>, prefix: string) => {
  const s = poll.standings.find(x => x.title.startsWith(prefix));
  if (!s) throw new Error(`no standing for ${prefix}`);
  return s;
};

describe('bordaPoints', () => {
  it('awards N points for first and 1 for last', () => {
    expect(bordaPoints(1, 9)).toBe(9);
    expect(bordaPoints(9, 9)).toBe(1);
  });

  it('scales with the field rather than a fixed literal', () => {
    // The club memo wrote this as "13 − rank", which is only correct for 12 books.
    expect(bordaPoints(1, 12)).toBe(12);
    expect(bordaPoints(5, 12)).toBe(13 - 5);
    // Same rank, smaller field, different score.
    expect(bordaPoints(5, 9)).toBe(10 - 5);
    expect(bordaPoints(5, 9)).not.toBe(bordaPoints(5, 12));
  });

  it('rejects a rank outside the field', () => {
    expect(() => bordaPoints(0, 9)).toThrow();
    expect(() => bordaPoints(10, 9)).toThrow();
  });
});

describe('maxPointsPerBallot', () => {
  it('sums the field', () => {
    expect(maxPointsPerBallot(9)).toBe(45);
    expect(maxPointsPerBallot(12)).toBe(78);
  });
});

describe('splitEntry', () => {
  it('splits on the em-dash author separator', () => {
    expect(splitEntry('The Order of Time — Carlo Rovelli')).toEqual({
      title: 'The Order of Time',
      author: 'Carlo Rovelli',
    });
  });

  it('keeps subtitles containing colons intact', () => {
    expect(splitEntry('Say Nothing: A True Story of Murder — Patrick Radden Keefe').title).toBe(
      'Say Nothing: A True Story of Murder'
    );
  });

  it('splits on the last separator when the title contains one', () => {
    expect(splitEntry('War — And Peace — Leo Tolstoy')).toEqual({
      title: 'War — And Peace',
      author: 'Leo Tolstoy',
    });
  });

  it('tolerates a missing author', () => {
    expect(splitEntry('Untitled')).toEqual({ title: 'Untitled', author: '' });
  });
});

describe('parseBallots', () => {
  const row = (id: string, ranking: string[], extra: Record<string, unknown> = {}) => ({
    'User External ID': id,
    'October 2026 Ranked Choice': ranking,
    Completed: true,
    Disqualified: false,
    ...extra,
  });

  it('reads the ranked-choice array without knowing the question name', () => {
    const parsed = parseBallots([row('a', ['X — Y', 'P — Q'])]);
    expect(parsed).toEqual([{ voterId: 'a', ranking: ['X — Y', 'P — Q'] }]);
  });

  it('accepts an empty-string column header', () => {
    const parsed = parseBallots([{ 'User External ID': 'a', '': ['X — Y'], Completed: true }]);
    expect(parsed[0].ranking).toEqual(['X — Y']);
  });

  it('strips the bullet prefix OpinionX adds to ranked entries', () => {
    const parsed = parseBallots([row('a', ['- X \u2014 Y', '- P \u2014 Q'])]);
    expect(parsed[0].ranking).toEqual(['X \u2014 Y', 'P \u2014 Q']);
  });

  it('drops incomplete and disqualified responses', () => {
    const parsed = parseBallots([
      row('keep', ['X — Y']),
      row('incomplete', ['X — Y'], { Completed: false }),
      row('cheat', ['X — Y'], { Disqualified: true }),
    ]);
    expect(parsed.map(b => b.voterId)).toEqual(['keep']);
  });

  it('rejects an export with no usable ballots', () => {
    expect(() => parseBallots([])).toThrow(/no usable ballots/);
    expect(() => parseBallots('nope')).toThrow(/not an array/);
  });
});

describe('validateBallots', () => {
  it('passes a clean field', () => {
    expect(validateBallots(ballots(['ABE', 'BEA']), )).toEqual([]);
  });

  it('flags a ballot ranking a different field', () => {
    const mixed: Ballot[] = [
      { voterId: 'a', ranking: ['X', 'Y'] },
      { voterId: 'b', ranking: ['X', 'Z'] },
    ];
    expect(validateBallots(mixed)).toHaveLength(1);
    expect(validateBallots(mixed)[0]).toMatch(/different field/);
  });

  it('flags a duplicated title', () => {
    const dupe: Ballot[] = [{ voterId: 'a', ranking: ['X', 'X'] }];
    expect(validateBallots(dupe)[0]).toMatch(/more than once/);
  });
});

describe('pairwise', () => {
  it('counts voters preferring each book', () => {
    const bs = ballots(['AB', 'AB', 'BA']);
    const r = pairwise(bs, OCT_TITLES.A, OCT_TITLES.B);
    expect(r.aWins).toBe(2);
    expect(r.bWins).toBe(1);
    expect(r.winner).toBe(OCT_TITLES.A);
  });

  it('reports no winner on an even split', () => {
    const r = pairwise(ballots(['AB', 'BA']), OCT_TITLES.A, OCT_TITLES.B);
    expect(r.winner).toBeNull();
  });
});

describe('computePoll', () => {
  it('conserves points: total equals ballots × per-ballot max', () => {
    const poll = computePoll(ballots(OCT_BALLOTS));
    expect(poll.candidateCount).toBe(9);
    expect(poll.maxPointsPerBallot).toBe(45);
    expect(poll.totalPoints).toBe(11 * 45);
    expect(poll.totalPoints).toBe(495);
  });

  it('lists tied books in the order the tiebreaker resolved them', () => {
    const poll = computePoll(ballots(OCT_BALLOTS));
    for (const tie of poll.ties) {
      const listed = poll.standings.filter(s => s.points === tie.points).map(s => s.title);
      expect(listed).toEqual(tie.resolvedOrder!.map(e => e.split(' \u2014 ')[0]));
    }
  });

  it('assigns competition ranks, sharing the number across ties', () => {
    const poll = computePoll(ballots(OCT_BALLOTS));
    const ranks = poll.standings.map(s => s.rank);
    // Three books tie on 59, so 3 appears three times and 4/5 are skipped.
    expect(ranks).toEqual([1, 2, 3, 3, 3, 6, 7, 8, 9]);
  });

  it('rejects a malformed field rather than scoring it', () => {
    const bad: Ballot[] = [
      { voterId: 'a', ranking: ['X', 'Y'] },
      { voterId: 'b', ranking: ['X', 'Z'] },
    ];
    expect(() => computePoll(bad)).toThrow(/invalid ballots/);
  });
});

describe('October 2026 poll (regression)', () => {
  const poll = computePoll(ballots(OCT_BALLOTS));

  it('elects The Order of Time on 66 points', () => {
    const winner = poll.standings[0];
    expect(winner.title).toBe('The Order of Time');
    expect(winner.points).toBe(66);
    expect(winner.rank).toBe(1);
  });

  it('reproduces the published leaderboard', () => {
    expect(poll.standings.map(s => [s.title.split(':')[0], s.points])).toEqual([
      ['The Order of Time', 66],
      ['Inventing the Renaissance', 62],
      ['Easy Money', 59],
      ['The Laws of Thought', 59],
      ['The Black Count', 59],
      ['Say Nothing', 53],
      ['An Immense World', 47],
      ['The Gales of November', 46],
      ['The River of Doubt', 44],
    ]);
  });

  it('wins on breadth, not first-place votes', () => {
    expect(byTitle(poll, 'The Order of Time').firstPlaceVotes).toBe(1);
    // Say Nothing led the field on firsts and still finished sixth.
    expect(byTitle(poll, 'Say Nothing').firstPlaceVotes).toBe(3);
    expect(byTitle(poll, 'Say Nothing').rank).toBe(6);
  });

  it('elects a winner that is not a strict Condorcet winner', () => {
    const bs = ballots(OCT_BALLOTS);
    const vsBlack = pairwise(bs, OCT_TITLES.O, OCT_TITLES.B);
    expect(vsBlack.winner).toBe(OCT_TITLES.B);
    expect([vsBlack.aWins, vsBlack.bWins]).toEqual([5, 6]);
  });

  it('finds the three-way tie at 59 to be a true cycle', () => {
    expect(poll.ties).toHaveLength(1);
    const tie = poll.ties[0];
    expect(tie.points).toBe(59);
    expect(tie.members).toHaveLength(3);
    expect(tie.isCycle).toBe(true);
    expect(tie.hasEvenSplit).toBe(false);
    // Every leg of the loop is 6–5.
    expect(tie.pairwise.map(p => [p.aWins, p.bWins].sort((x, y) => y - x))).toEqual([
      [6, 5],
      [6, 5],
      [6, 5],
    ]);
  });

  it('falls through the cycle to first-place votes', () => {
    const tie = poll.ties[0];
    expect(tie.resolvedBy).toBe('first-place-votes');
    expect(tie.resolvedOrder?.map(t => t.split(':')[0])).toEqual([
      'Easy Money',
      'The Laws of Thought',
      'The Black Count',
    ]);
  });

  it('shows mean rank tying wherever the Borda score ties', () => {
    // Mean rank is a linear restatement of the score, so it can never break a tie.
    const tied = poll.standings.filter(s => s.points === 59);
    expect(tied.map(s => s.meanRank)).toEqual([tied[0].meanRank, tied[0].meanRank, tied[0].meanRank]);
  });
});

describe('analyzeTie', () => {
  it('resolves by Condorcet when pairwise gives a strict order', () => {
    // A beats B beats nothing; A is undefeated within the pair.
    const tie = analyzeTie(ballots(['AB', 'AB', 'BA']), [OCT_TITLES.A, OCT_TITLES.B], 10);
    expect(tie.resolvedBy).toBe('condorcet');
    expect(tie.isCycle).toBe(false);
    expect(tie.resolvedOrder?.[0]).toBe(OCT_TITLES.A);
  });

  it('treats an even split as a pairwise tie, not a cycle', () => {
    // The August 2026 shape: two books, pairwise dead even.
    const tie = analyzeTie(ballots(['ABE', 'BAE']), [OCT_TITLES.A, OCT_TITLES.B], 10);
    expect(tie.isCycle).toBe(false);
    expect(tie.hasEvenSplit).toBe(true);
    expect(tie.resolvedBy).not.toBe('condorcet');
  });

  it('reports unresolved when neither breaker separates the members', () => {
    const tie = analyzeTie(ballots(['ABE', 'BAE']), [OCT_TITLES.A, OCT_TITLES.B], 10);
    // Both took one first-place vote, so the fall-through ties too.
    expect(tie.firstPlaceVotes[OCT_TITLES.A]).toBe(1);
    expect(tie.firstPlaceVotes[OCT_TITLES.B]).toBe(1);
    expect(tie.resolvedBy).toBe('unresolved');
    expect(tie.resolvedOrder).toBeNull();
  });
});

describe('orderLegs', () => {
  it('walks a cycle as a loop so each leg hands off to the next', () => {
    const poll = computePoll(ballots(OCT_BALLOTS));
    const tie = poll.ties[0];
    const legs = orderLegs(tie);

    expect(legs).toHaveLength(3);
    // Each leg's loser must be the next leg's winner, and the last closes the loop.
    for (let i = 0; i < legs.length; i++) {
      const loser = legs[i].winner === legs[i].a ? legs[i].b : legs[i].a;
      expect(legs[(i + 1) % legs.length].winner).toBe(loser);
    }
  });

  it('leaves a non-cycle tie in its natural order', () => {
    const tie = analyzeTie(ballots(['ABE', 'BAE']), [OCT_TITLES.A, OCT_TITLES.B], 10);
    expect(orderLegs(tie)).toBe(tie.pairwise);
  });
});

describe('matchBook', () => {
  const book = (title: string): Book =>
    ({ title, author: 'x', status: 'Candidate', pollCount: 0 }) as unknown as Book;

  const books = [
    book('The Order of Time'),
    book('Easy Money: Cryptocurrency, Casino Capitalism, and the Golden Age of Fraud: The Basis for the Documentary Everyone Is Lying to You for Money'),
    book('The River of Doubt'),
  ];

  it('matches an exact title', () => {
    expect(matchBook(books, 'The Order of Time').title).toBe('The Order of Time');
  });

  it('matches a ballot title that truncates the canonical subtitle', () => {
    // The ballot drops the long trailing subtitle; books.json keeps it.
    const m = matchBook(books, 'Easy Money: Cryptocurrency, Casino Capitalism, and the Golden Age of Fraud');
    expect(m.title).toMatch(/^Easy Money/);
  });

  it('is case and whitespace insensitive', () => {
    expect(matchBook(books, '  the order of TIME ').title).toBe('The Order of Time');
  });

  it('throws rather than guessing when nothing matches', () => {
    expect(() => matchBook(books, 'Moby Dick')).toThrow(/matches no book/);
  });

  it('throws rather than guessing when a prefix is ambiguous', () => {
    const ambiguous = [book('The Order of Time'), book('The Order of Time and Space')];
    expect(() => matchBook(ambiguous, 'The Order of Time')).not.toThrow(); // exact wins
    expect(() => matchBook(ambiguous, 'The Order of')).toThrow(/matches 2 books/);
  });
});

describe('pollCloseDate', () => {
  const row = (id: string, ended: string) => ({
    'User External ID': id,
    'Q': ['X — Y'],
    'Ended At': ended,
    Completed: true,
    Disqualified: false,
  });

  it('takes the latest response date, not the clock', () => {
    expect(
      pollCloseDate([
        row('a', '2026-07-12T11:52:38+00:00'),
        row('c', '2026-07-16T15:48:59+00:00'),
        row('b', '2026-07-13T17:31:07+00:00'),
      ])
    ).toBe('2026-07-16');
  });

  it('ignores responses that were dropped from the count', () => {
    expect(
      pollCloseDate([
        row('a', '2026-07-12T11:52:38+00:00'),
        { ...row('late', '2026-09-01T00:00:00+00:00'), Disqualified: true },
      ])
    ).toBe('2026-07-12');
  });
});
