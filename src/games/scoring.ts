/**
 * Cálculo del resultado final de cada jugador.
 *
 * - Aciertos   A = (correctas + 1) / (respondidas + 2)
 *   Suavizado: evita 0/0 y que 1 de 1 cuente como 100 %.
 * - Riqueza    R = patrimonio / patrimonio del mejor jugador
 * - Rendimiento P = 0.6·A + 0.4·R
 * - Nota (1–5)    = 1 + 4·P            (un decimal)
 * - Valoración %  = P / P del mejor · 100
 *
 * IMPORTANTE: Unity (GameResultsCalculator.cs) usa la misma fórmula para mostrar
 * la pantalla final sin esperar al servidor. Si se cambia aquí, cambiarla allá.
 */

export const SCORE_WEIGHTS = { accuracy: 0.6, wealth: 0.4 } as const;

export interface PlayerRawStats {
  correct: number;
  wrong: number;
  net_worth: number;
}

export interface PlayerScore {
  accuracy: number;
  wealth: number;
  performance: number;
  score: number;
  rating_pct: number;
  rank: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function computeScores(players: PlayerRawStats[]): PlayerScore[] {
  if (players.length === 0) return [];

  const worths = players.map(p => Math.max(0, p.net_worth));
  const maxWorth = Math.max(...worths);

  const partial = players.map((p, i) => {
    const correct = Math.max(0, p.correct);
    const answered = correct + Math.max(0, p.wrong);
    const accuracy = (correct + 1) / (answered + 2);
    // Si nadie tiene patrimonio positivo, la riqueza no distingue a nadie
    const wealth = maxWorth > 0 ? worths[i] / maxWorth : 1;
    const performance = SCORE_WEIGHTS.accuracy * accuracy + SCORE_WEIGHTS.wealth * wealth;
    return { accuracy, wealth, performance };
  });

  const best = Math.max(...partial.map(p => p.performance));

  return partial.map(p => ({
    accuracy: round1(p.accuracy * 100) / 100,
    wealth: round1(p.wealth * 100) / 100,
    performance: Math.round(p.performance * 1000) / 1000,
    score: round1(1 + 4 * p.performance),
    rating_pct: best > 0 ? Math.round((p.performance / best) * 100) : 100,
    // Puesto por competencia: empates comparten puesto (1, 1, 3…)
    rank: 1 + partial.filter(o => o.performance > p.performance + 1e-9).length,
  }));
}
