// biotechtube/lib/reports/models/funding-predictor.ts
// P(next funding round in 12 months). Deterministic, no AI.

export interface FundingPredictorInput {
  months_of_runway: number | null;
  lead_investor_cadence_per_year: number | null;
  sector_momentum: number;
}

export interface FundingPredictorOutput {
  p_next_round_12mo: number;
  months_of_runway: number | null;
  lead_investor_cadence_per_year: number | null;
  sector_momentum: number;
  math_explanation: string;
}

export function predictFunding(input: FundingPredictorInput): FundingPredictorOutput {
  const runway = input.months_of_runway ?? 18;
  const runwayPressure = clamp(1 - runway / 24, 0, 1);
  const cadence = clamp((input.lead_investor_cadence_per_year ?? 1) / 6, 0, 1);
  const momentum = clamp(input.sector_momentum / 100, 0, 1);

  const score = 0.5 * runwayPressure + 0.3 * cadence + 0.2 * momentum;
  const p = Math.round(score * 100);

  const math = [
    `runway_pressure = clamp(1 - ${runway.toFixed(0)}/24, 0, 1) = ${runwayPressure.toFixed(2)}`,
    `investor_cadence = clamp(${input.lead_investor_cadence_per_year ?? 1}/6, 0, 1) = ${cadence.toFixed(2)}`,
    `sector_momentum = ${input.sector_momentum}/100 = ${momentum.toFixed(2)}`,
    `P = round(0.5×runway + 0.3×cadence + 0.2×momentum) × 100 = ${p}%`,
  ].join("\n");

  return {
    p_next_round_12mo: p,
    months_of_runway: input.months_of_runway,
    lead_investor_cadence_per_year: input.lead_investor_cadence_per_year,
    sector_momentum: input.sector_momentum,
    math_explanation: math,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
