/**
 * Shared profile quality scoring logic.
 * Extracted from cia-agent.ts for reuse by enrichment-pipeline.ts.
 */

export interface ScoreInput {
  description: string | null;
  website: string | null;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  founded: number | null;
  categories: string[] | null;
  ticker: string | null;
  websiteReachable: boolean;
}

export interface ScoreResult {
  score: number;
  issues: string[];
}

export function calculateScore(input: ScoreInput): ScoreResult {
  let score = 0;
  const issues: string[] = [];

  // Description quality (0-3)
  if (input.description && input.description.length > 200) {
    score += 2;
  } else if (input.description && input.description.length > 50) {
    score += 1;
    issues.push("short_description");
  } else {
    issues.push("missing_description");
  }
  if (input.description && input.description.length > 500) score += 1;

  // Website (0-1.5)
  if (input.website) {
    score += 0.5;
  } else {
    issues.push("missing_website");
  }
  if (input.websiteReachable) {
    score += 1;
  } else if (input.website) {
    issues.push("dead_website");
  }

  // Logo (0-0.5)
  if (input.logo_url) {
    score += 0.5;
  } else {
    issues.push("missing_logo");
  }

  // Location (0-1)
  if (input.country) {
    score += 0.5;
  } else {
    issues.push("missing_country");
  }
  if (input.city) {
    score += 0.5;
  } else {
    issues.push("missing_city");
  }

  // Founded (0-0.5)
  if (input.founded) {
    score += 0.5;
  } else {
    issues.push("missing_founded");
  }

  // Categories (0-0.5)
  if (input.categories && input.categories.length > 0) {
    score += 0.5;
  } else {
    issues.push("missing_categories");
  }

  // Financial data (0-0.5)
  if (input.ticker) score += 0.5;

  return { score: Math.min(score, 10), issues };
}
