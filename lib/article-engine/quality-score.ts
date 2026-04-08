// Article Quality Scoring

export interface QualityScore {
  overall: number; // 0-100
  readability: number; // 0-100
  sourceCoverage: number; // 0-100
  wordCount: number; // actual count
  wordCountScore: number; // 0-100
  uniqueInsights: number; // count of forward-looking statements
  insightScore: number; // 0-100
  bannedPhraseCheck: boolean; // true = passed (no banned phrases)
  bannedPhraseScore: number; // 0 or 100
  breakdown: {
    sentenceLengthAvg: number;
    paragraphCount: number;
    sourceCount: number;
    hasForwardLooking: boolean;
    bannedPhrasesFound: string[];
  };
}

// ── Banned phrases that indicate low-quality AI output ──

const BANNED_PHRASES = [
  "in conclusion",
  "it is worth noting",
  "it should be noted",
  "it goes without saying",
  "at the end of the day",
  "only time will tell",
  "remains to be seen",
  "game changer",
  "game-changer",
  "paradigm shift",
  "synergy",
  "leverage",
  "disrupt",
  "revolutionary",
  "groundbreaking",
  "cutting-edge",
  "state-of-the-art",
  "best-in-class",
  "world-class",
  "unprecedented",
  "first-of-its-kind",
  "delve",
  "delving",
  "tapestry",
  "bustling",
  "moreover",
  "furthermore",
  "in light of",
  "it is important to note",
  "needless to say",
];

// ── Forward-looking keywords ──

const FORWARD_LOOKING_PATTERNS = [
  /\bwatch for\b/i,
  /\bexpect\b/i,
  /\blikely\b/i,
  /\bcould\b/i,
  /\bpotential\b/i,
  /\banticipate\b/i,
  /\bforecast\b/i,
  /\bprojected?\b/i,
  /\bif approved\b/i,
  /\bgoing forward\b/i,
  /\bnext steps?\b/i,
  /\bimplications?\b/i,
  /\bremains?\b.*\bsee\b/i,
  /\boutlook\b/i,
];

// ── Text extraction from TipTap body ──

function extractTextFromTipTap(body: any): string {
  if (!body) return "";
  if (typeof body === "string") return body;

  let text = "";

  function walk(node: any) {
    if (!node) return;
    if (node.type === "text" && node.text) {
      text += node.text + " ";
    }
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(body);
  return text.trim();
}

// ── Scoring functions ──

function scoreReadability(text: string): {
  score: number;
  sentenceLengthAvg: number;
  paragraphCount: number;
} {
  if (!text) return { score: 0, sentenceLengthAvg: 0, paragraphCount: 0 };

  // Split into sentences (rough heuristic)
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length === 0)
    return { score: 0, sentenceLengthAvg: 0, paragraphCount: 0 };

  // Average words per sentence
  const wordCounts = sentences.map(
    (s) => s.split(/\s+/).filter((w) => w.length > 0).length
  );
  const avgLength =
    wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

  // Paragraphs (rough: split by double newlines or count of paragraph-level nodes)
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(paragraphs.length, 1);

  // Score: best is 15-25 avg words per sentence
  let score: number;
  if (avgLength >= 15 && avgLength <= 25) {
    score = 100;
  } else if (avgLength < 15) {
    // Too short sentences (choppy)
    score = Math.max(0, 100 - (15 - avgLength) * 5);
  } else {
    // Too long sentences (hard to read), penalize > 30 heavily
    score = Math.max(0, 100 - (avgLength - 25) * 8);
  }

  // Bonus for having multiple paragraphs (min 3 for full score)
  if (paragraphCount < 3) {
    score = Math.round(score * 0.8);
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    sentenceLengthAvg: Math.round(avgLength * 10) / 10,
    paragraphCount,
  };
}

function scoreSourceCoverage(sources: any[]): number {
  if (!sources || !Array.isArray(sources)) return 0;
  const sourceCount = sources.length;
  // 4+ sources = 100
  return Math.min(sourceCount * 25, 100);
}

function scoreWordCount(wordCount: number): number {
  // 300-500 words = 100
  if (wordCount >= 300 && wordCount <= 500) return 100;
  if (wordCount < 200) return Math.max(0, Math.round((wordCount / 200) * 60));
  if (wordCount < 300)
    return Math.round(60 + ((wordCount - 200) / 100) * 40);
  if (wordCount <= 800) return 100;
  // >800 words, gradually reduce
  return Math.max(50, Math.round(100 - (wordCount - 800) * 0.1));
}

function countForwardLooking(text: string): number {
  let count = 0;
  for (const pattern of FORWARD_LOOKING_PATTERNS) {
    const matches = text.match(new RegExp(pattern, "gi"));
    if (matches) count += matches.length;
  }
  return count;
}

function scoreInsights(count: number): number {
  // 3+ forward-looking = 100, scale linearly
  if (count >= 3) return 100;
  return Math.round((count / 3) * 100);
}

function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

// ── Main scoring function ──

export function calculateQualityScore(article: {
  body: any; // TipTapDoc
  sources: any[];
  headline: string;
  subtitle: string | null;
}): QualityScore {
  const text = extractTextFromTipTap(article.body);
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;

  // Individual scores
  const readabilityResult = scoreReadability(text);
  const readability = readabilityResult.score;
  const sourceCoverage = scoreSourceCoverage(article.sources);
  const wordCountScoreVal = scoreWordCount(wordCount);
  const forwardLookingCount = countForwardLooking(text);
  const insightScore = scoreInsights(forwardLookingCount);
  const bannedPhrasesFound = findBannedPhrases(text);
  const bannedPhraseCheck = bannedPhrasesFound.length === 0;
  const bannedPhraseScore = bannedPhraseCheck ? 100 : 0;

  // Weighted overall score:
  // Readability: 25%, Source coverage: 25%, Word count: 20%, Insights: 15%, Banned phrases: 15%
  const overall = Math.round(
    readability * 0.25 +
      sourceCoverage * 0.25 +
      wordCountScoreVal * 0.2 +
      insightScore * 0.15 +
      bannedPhraseScore * 0.15
  );

  return {
    overall,
    readability,
    sourceCoverage,
    wordCount,
    wordCountScore: wordCountScoreVal,
    uniqueInsights: forwardLookingCount,
    insightScore,
    bannedPhraseCheck,
    bannedPhraseScore,
    breakdown: {
      sentenceLengthAvg: readabilityResult.sentenceLengthAvg,
      paragraphCount: readabilityResult.paragraphCount,
      sourceCount: article.sources?.length || 0,
      hasForwardLooking: forwardLookingCount > 0,
      bannedPhrasesFound,
    },
  };
}

// ── ASCII progress bar helper (for terminal display) ──

export function qualityBar(score: number, width: number = 10): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

export function qualityColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // yellow
  if (score >= 40) return "#ea580c"; // orange
  return "#dc2626"; // red
}
