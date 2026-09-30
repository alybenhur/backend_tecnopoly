import { computeScores } from './scoring';

describe('computeScores', () => {
  it('reproduce el ejemplo del plan (Ana, Juan, Sara)', () => {
    const [ana, juan, sara] = computeScores([
      { correct: 8, wrong: 2, net_worth: 1500 },
      { correct: 5, wrong: 5, net_worth: 2000 },
      { correct: 3, wrong: 7, net_worth: 900 },
    ]);

    expect(ana.score).toBe(4.0);
    expect(juan.score).toBe(3.8);
    expect(sara.score).toBe(2.5);

    // Rendimientos 0.75 / 0.70 / 0.38 → frente al mejor: 100 / 93 / 51
    expect(ana.rating_pct).toBe(100);
    expect(juan.rating_pct).toBe(93);
    expect(sara.rating_pct).toBe(51);

    expect([ana.rank, juan.rank, sara.rank]).toEqual([1, 2, 3]);
  });

  it('la nota siempre está entre 1 y 5', () => {
    const scores = computeScores([
      { correct: 0, wrong: 30, net_worth: 0 },
      { correct: 30, wrong: 0, net_worth: 5000 },
    ]);
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(1);
      expect(s.score).toBeLessThanOrEqual(5);
    }
  });

  it('sin preguntas respondidas no divide por cero y la riqueza decide', () => {
    const [a, b] = computeScores([
      { correct: 0, wrong: 0, net_worth: 1000 },
      { correct: 0, wrong: 0, net_worth: 500 },
    ]);
    expect(a.accuracy).toBe(0.5);
    expect(a.rank).toBe(1);
    expect(b.rank).toBe(2);
  });

  it('empates comparten puesto', () => {
    const scores = computeScores([
      { correct: 4, wrong: 1, net_worth: 800 },
      { correct: 4, wrong: 1, net_worth: 800 },
      { correct: 1, wrong: 4, net_worth: 300 },
    ]);
    expect(scores.map(s => s.rank)).toEqual([1, 1, 3]);
    expect(scores[0].rating_pct).toBe(100);
    expect(scores[1].rating_pct).toBe(100);
  });

  it('patrimonio negativo cuenta como cero', () => {
    const [a] = computeScores([
      { correct: 0, wrong: 0, net_worth: -200 },
      { correct: 0, wrong: 0, net_worth: 400 },
    ]);
    expect(a.wealth).toBe(0);
  });
});
