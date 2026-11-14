import { describe, expect, it } from 'vitest';
import { analyzeTie, type Ballot, type Poll } from './borda.js';
import { methodology, renderDocTie, renderEmailTie, type RenderContext } from './render.js';

const black = 'The Black Count — Tom Reiss';
const easy = 'Easy Money — Ben McKenzie';
const born = 'Born to Run — Christopher McDougall';
const eureka = 'The Eureka Machine — Richard Socher';
const ballots: Ballot[] = Array.from({ length: 9 }, (_, i) => ({
  voterId: `voter-${i}`,
  ranking: [i < 5 ? black : easy, i < 5 ? easy : black, i < 6 ? born : eureka, i < 6 ? eureka : born],
}));
const ties = [analyzeTie(ballots, [black, easy], 47), analyzeTie(ballots, [born, eureka], 40)];
const poll: Poll = {
  ballots,
  standings: [],
  candidateCount: 4,
  totalPoints: 90,
  maxPointsPerBallot: 10,
  ties,
};
const ctx: RenderContext = {
  poll,
  prose: { headline: '', deck: '', intro: '', outcome: '', tieIntro: 'Shared intro.', tieVerdict: 'Shared verdict.' },
  meeting: { dateLabel: '', time: '', venue: '', discussionTitle: '', discussionAuthor: '' },
  selectionMonth: '',
  pollDate: '',
  relegated: [],
  debuts: [],
};

describe('tie rendering', () => {
  it('shows every tie in the email and document with one shared introduction and verdict', () => {
    const email = renderEmailTie(ctx);
    const doc = renderDocTie(ctx);

    expect(email).toContain('The tie at 47 points');
    expect(email).toContain('The tie at 40 points');
    expect(email).toContain('The Black Count 5');
    expect(email).toContain('Born to Run 6');
    expect(email.match(/Head-to-head/g)).toHaveLength(2);
    expect(doc).toContain('The tie at 47');
    expect(doc).toContain('The tie at 40');
    expect(doc).toContain('<th class="num">The Black Count</th><th class="num">Easy Money</th>');
    expect(doc).toContain('<th class="num">Born to Run</th><th class="num">The Eureka Machine</th>');
    expect(doc.match(/<table class="h2h-table">/g)).toHaveLength(2);
    for (const output of [email, doc]) {
      expect(output.match(/Shared intro\./g)).toHaveLength(1);
      expect(output.match(/Shared verdict\./g)).toHaveLength(1);
    }
    expect(methodology(ctx)).toContain('2 ties: 47 points, resolved by condorcet; 40 points, resolved by condorcet.');
  });

  it('keeps single-tie wording and omits the section when there is no tie', () => {
    const one = { ...ctx, poll: { ...poll, ties: [ties[0]] } };
    expect(renderEmailTie(one)).toContain('About that tie');
    expect(renderEmailTie(one)).not.toContain('The tie at 47 points');
    expect(renderDocTie(one).match(/<table class="h2h-table">/g)).toHaveLength(1);
    expect(methodology(one)).toContain('This round produced a tie at 47 points, resolved by condorcet.');

    const none = { ...ctx, poll: { ...poll, ties: [] } };
    expect(renderEmailTie(none)).toBe('');
    expect(renderDocTie(none)).toBe('');
    expect(methodology(none)).toContain('No tie occurred');
  });
});
